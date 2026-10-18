import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable, updateRows, insertRows } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';
import { invalidateCache } from '@/lib/server-cache';

/**
 * POST /api/admin/users/tokens
 * 회원별 잔여 토큰/크레딧 수동 충전·차감 및 플랜 등급 수동 조정
 */
export async function POST(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { phoneNumber, deltaTokens, newPlan, reason } = body;

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: '전화번호가 필요합니다.' }, { status: 400 });
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    // 1. user_wallets 조회
    const walletRes = await queryTable('user_wallets', {
      where: { phone_number: cleanPhone },
      limit: 1,
    });

    let currentBalance = 50000;
    let totalPurchased = 50000;
    let walletId: number | null = null;

    if (walletRes.rows && walletRes.rows.length > 0) {
      const w = walletRes.rows[0];
      walletId = w.id;
      currentBalance = Number(w.balance_tokens || 0);
      totalPurchased = Number(w.total_purchased_tokens || 0);
    }

    const changeAmount = Number(deltaTokens || 0);
    const updatedBalance = Math.max(0, currentBalance + changeAmount);
    const updatedPurchased = changeAmount > 0 ? totalPurchased + changeAmount : totalPurchased;
    const now = new Date().toISOString();

    if (walletId) {
      await updateRows(
        'user_wallets',
        {
          balance_tokens: updatedBalance,
          total_purchased_tokens: updatedPurchased,
          plan_tier: newPlan || undefined,
          updated_at: now,
        },
        { ids: [walletId] }
      );
    } else {
      await insertRows('user_wallets', [
        {
          phone_number: cleanPhone,
          balance_tokens: updatedBalance,
          total_purchased_tokens: updatedPurchased,
          total_used_tokens: 0,
          plan_tier: newPlan || 'free',
          updated_at: now,
        },
      ]);
    }

    // 2. users 테이블의 plan 컬럼도 동기화
    if (newPlan) {
      const userRes = await queryTable('users', {
        where: { phone_number: cleanPhone },
        limit: 1,
      });
      if (userRes.rows && userRes.rows.length > 0) {
        await updateRows(
          'users',
          { plan: newPlan },
          { ids: [userRes.rows[0].id] }
        );
      }
    }

    // 3. 감사 로그를 data_change_logs에 기록
    try {
      await insertRows('data_change_logs', [
        {
          project_id: 'SYSTEM',
          sheet_name: 'USER_WALLETS',
          change_type: 'UPDATE',
          target_row: 0,
          column_name: 'balance_tokens',
          before_value: String(currentBalance),
          after_value: String(updatedBalance),
          operator: `ADMIN [사유: ${reason || '관리자 수동 조정'}]`,
          created_at: now,
        },
      ]);
    } catch {}

    // 4. 캐시 무효화 및 실시간 브로드캐스트
    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('user_wallets', 'update');

    return NextResponse.json({
      success: true,
      phoneNumber: cleanPhone,
      previousBalance: currentBalance,
      updatedBalance,
      plan: newPlan,
    });
  } catch (error: any) {
    console.error('[Admin-Tokens] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
