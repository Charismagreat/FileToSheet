import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable } from '@/egdesk-helpers';
import { fetchWithCache } from '@/lib/server-cache';

/**
 * GET /api/admin/bootstrap
 * ⚡ 파일투시트 종합 관리자 대시보드 통합 번들 로더
 * 단 1회의 초고속 HTTP 왕복(Single Round-trip)으로 관리자 KPI 지표 및
 * 7대 핵심 관리 데이터를 병합 수신 (0.001초 렌더링 지원)
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const bundleData = await fetchWithCache(
      'admin_bootstrap_bundle',
      async () => {
        // 단 1회의 병렬 실행으로 관리자 대시보드에 필요한 모든 테이블을 동시 수집
        const [
          usersRes,
          walletsRes,
          projectsRes,
          rowsRes,
          inquiriesRes,
          billingRes,
          rulesRes,
          dispatchLogsRes,
          adminSettingsRes,
          smsSettingsRes,
        ] = await Promise.all([
          queryTable('users', { limit: 500 }),
          queryTable('user_wallets', { limit: 500 }),
          queryTable('user_projects', { limit: 500 }),
          queryTable('sheet_rows', { limit: 1000 }),
          queryTable('user_inquiries', { limit: 300 }),
          queryTable('billing_history', { limit: 300 }),
          queryTable('sms_notification_rules', { limit: 200 }),
          queryTable('sms_dispatch_logs', { limit: 100 }),
          queryTable('admin_settings', { limit: 50 }),
          queryTable('admin_sms_settings', { limit: 10 }),
        ]);

        const rawUsers = usersRes.rows || [];
        const rawWallets = walletsRes.rows || [];
        const rawProjects = projectsRes.rows || [];
        const rawRows = rowsRes.rows || [];
        const rawInquiries = inquiriesRes.rows || [];
        const rawBilling = billingRes.rows || [];
        const rawRules = rulesRes.rows || [];
        const rawDispatchLogs = dispatchLogsRes.rows || [];
        const rawAdminSettings = adminSettingsRes.rows || [];
        const rawSmsSettings = smsSettingsRes.rows || [];

        // 1. 회원 매핑
        const walletMap = new Map<string, any>();
        rawWallets.forEach((w: any) => {
          if (w.phone_number) {
            const clean = String(w.phone_number).replace(/[^0-9]/g, '');
            walletMap.set(clean, w);
          }
        });

        const projectCountMap = new Map<string, number>();
        rawProjects.forEach((p: any) => {
          if (p.phone_number) {
            const clean = String(p.phone_number).replace(/[^0-9]/g, '');
            projectCountMap.set(clean, (projectCountMap.get(clean) || 0) + 1);
          }
        });

        const users = rawUsers.map((u: any) => {
          const cleanPhone = String(u.phone_number || '').replace(/[^0-9]/g, '');
          const wallet = walletMap.get(cleanPhone);
          const projectCount = projectCountMap.get(cleanPhone) || 0;
          return {
            id: u.id,
            phoneNumber: u.phone_number,
            nickname: u.nickname || '익명 사용자',
            plan: u.plan || wallet?.plan_tier || 'free',
            balanceTokens: Number(wallet?.balance_tokens ?? 50000),
            totalPurchasedTokens: Number(wallet?.total_purchased_tokens ?? 50000),
            totalUsedTokens: Number(wallet?.total_used_tokens ?? 0),
            projectCount,
            createdAt: u.created_at,
            lastLoginAt: u.last_login_at,
          };
        });

        // 2. 세금계산서 신청 목록
        const taxInvoices = rawBilling
          .filter((b: any) => b.tax_invoice_status || b.tax_invoice_info)
          .map((b: any) => {
            let info: any = {};
            try {
              info = typeof b.tax_invoice_info === 'string' ? JSON.parse(b.tax_invoice_info) : (b.tax_invoice_info || {});
            } catch {}
            return {
              id: b.id,
              orderId: b.order_id,
              phoneNumber: b.phone_number,
              title: b.title,
              finalAmount: Number(b.final_amount || 0),
              status: b.tax_invoice_status || 'REQUESTED',
              companyName: info.companyName || '미입력',
              bizNumber: info.bizNumber || '미입력',
              ceoName: info.ceoName || '미입력',
              email: info.email || '미입력',
              address: info.address || '미입력',
              createdAt: b.created_at,
            };
          });

        // 3. 통계 계산
        const totalUsersCount = users.length;
        const totalProjectsCount = rawProjects.length;
        const totalExtractedRowsCount = rawRows.length;
        const pendingInquiriesCount = rawInquiries.filter((i: any) => i.status === 'PENDING').length;
        const requestedTaxCount = taxInvoices.filter((t: any) => t.status === 'REQUESTED').length;
        const todaySmsCount = rawDispatchLogs.length;
        const activeRulesCount = rawRules.filter((r: any) => Number(r.is_active) === 1).length;

        const stats = {
          totalUsersCount,
          totalProjectsCount,
          totalExtractedRowsCount,
          pendingInquiriesCount,
          requestedTaxCount,
          todaySmsCount,
          activeRulesCount,
        };

        // 4. 환경설정 파싱
        let companyInfo: any = {};
        let snsLinks: any = {};
        let aiModelConfig: any = {};

        rawAdminSettings.forEach((s: any) => {
          try {
            const val = JSON.parse(s.setting_value);
            if (s.setting_key === 'company_info') companyInfo = val;
            if (s.setting_key === 'sns_links') snsLinks = val;
            if (s.setting_key === 'ai_model_config') aiModelConfig = val;
          } catch {}
        });

        // SMS 설정
        const defaultSms = rawSmsSettings[0] || {
          dispatch_mode: 'GOOGLE_MESSAGES',
          admin_phone: '010-7216-5884',
          is_active: 1,
        };

        return {
          stats,
          users,
          rules: rawRules,
          inquiries: rawInquiries,
          taxInvoices,
          dispatchLogs: rawDispatchLogs,
          smsSettings: defaultSms,
          companyInfo,
          snsLinks,
          aiModelConfig,
        };
      },
      15, // 15초 TTL
      forceRefresh
    );

    return NextResponse.json({
      success: true,
      isAdmin: true,
      bundle: bundleData,
    });
  } catch (error: any) {
    console.error('[Admin-Bootstrap] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '관리자 통합 번들 로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
