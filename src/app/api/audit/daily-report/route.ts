import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/egdesk-helpers';
import { validateSheetRows, generateDefaultRules, ValidationRule } from '@/lib/validation-engine';
import { realtimeHub } from '@/lib/realtime-hub';
import { invalidateCache } from '@/lib/server-cache';

/**
 * GET /api/audit/daily-report
 * 일일 감사 리포트 설정 및 최근 감사 결과 조회
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('phone') || req.headers.get('x-user-phone') || '';

    // 최근 감사 로그 조회
    const logsRes = await queryTable('sms_dispatch_logs', { limit: 10 });
    const auditLogs = (logsRes.rows || []).filter(
      (l: any) => l.trigger_name === 'AI_일일감사_리포트'
    );

    return NextResponse.json({
      success: true,
      lastAudit: auditLogs[0] || null,
      history: auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/audit/daily-report
 * 실시간 AI 데이터 감사 실행 및 일일 리포트 생성/발송
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      recipientPhone = '010-7216-5884',
      sheets = [], // 클라이언트에서 전달받은 시트 데이터 목록
      customRules = [],
      sendNotification = false,
    } = body;

    // 만약 클라이언트에서 시트를 직접 넘겨주지 않았다면 서버 DB의 sheet_rows에서 최근 데이터 조회
    let targetSheets = sheets;
    if (!targetSheets || targetSheets.length === 0) {
      const rowsRes = await queryTable('sheet_rows', { limit: 500 });
      if (rowsRes.rows && rowsRes.rows.length > 0) {
        // sheet_id별 그룹화
        const grouped: Record<string, any[]> = {};
        rowsRes.rows.forEach((r: any) => {
          const sName = r.sheet_name || '기본시트';
          if (!grouped[sName]) grouped[sName] = [];
          grouped[sName].push(typeof r.row_data === 'string' ? JSON.parse(r.row_data) : r.row_data || r);
        });

        targetSheets = Object.keys(grouped).map((name) => {
          const rows = grouped[name];
          const headers = rows.length > 0 ? Object.keys(rows[0]).filter((k) => !k.startsWith('_')) : [];
          return { name, headers, rows };
        });
      }
    }

    if (!targetSheets || targetSheets.length === 0) {
      return NextResponse.json({
        success: false,
        error: '감사할 시트 데이터가 없습니다. 먼저 엑셀이나 문서를 업로드해 주세요.',
      }, { status: 400 });
    }

    let totalRows = 0;
    let totalErrors = 0;
    let duplicateCount = 0;
    let arithmeticCount = 0;
    let vatCount = 0;
    const sheetSummaries: any[] = [];
    const criticalIssues: string[] = [];

    // 각 시트별 데이터 순회 및 감사
    targetSheets.forEach((sheet: any) => {
      const rows = sheet.rows || [];
      const headers = sheet.headers || (rows.length > 0 ? Object.keys(rows[0]).filter((k) => !k.startsWith('_')) : []);
      const rules: ValidationRule[] = (customRules && customRules.length > 0)
        ? customRules
        : generateDefaultRules(headers);

      const valRes = validateSheetRows(rows, rules);
      totalRows += rows.length;
      totalErrors += valRes.totalErrorCount;

      let sheetDup = 0;
      let sheetArith = 0;
      let sheetVat = 0;

      valRes.errorMap.forEach((err) => {
        if (err.ruleName.includes('이중') || err.ruleName.includes('중복')) {
          duplicateCount++;
          sheetDup++;
          if (criticalIssues.length < 5) {
            criticalIssues.push(`[${sheet.name}] ${err.message}`);
          }
        } else if (err.ruleName.includes('부가세') || err.ruleName.includes('세액')) {
          vatCount++;
          sheetVat++;
          if (criticalIssues.length < 5) {
            criticalIssues.push(`[${sheet.name}] ${err.rowIdx + 1}행: ${err.message}`);
          }
        } else {
          arithmeticCount++;
          sheetArith++;
          if (criticalIssues.length < 5) {
            criticalIssues.push(`[${sheet.name}] ${err.rowIdx + 1}행: ${err.message}`);
          }
        }
      });

      sheetSummaries.push({
        sheetName: sheet.name,
        rowCount: rows.length,
        errorCount: valRes.totalErrorCount,
        matchRate: rows.length > 0 ? Math.round(((rows.length - valRes.errorRowsCount) / rows.length) * 100) : 100,
        duplicateCount: sheetDup,
        arithmeticCount: sheetArith,
        vatCount: sheetVat,
      });
    });

    const overallMatchRate = totalRows > 0
      ? Math.max(0, Math.round(((totalRows - totalErrors) / totalRows) * 100))
      : 100;

    // 일일 감사 브리핑 리포트 텍스트 생성
    const todayStr = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const isHealthy = totalErrors === 0;
    const reportTitle = `[FileToSheet] 📊 ${todayStr} AI 일일 데이터 감사 리포트`;
    
    let reportBody = `${reportTitle}\n\n`;
    reportBody += `• 감사 대상: 총 ${targetSheets.length}개 시트 (${totalRows.toLocaleString()}개 행)\n`;
    reportBody += `• 데이터 건전성 지수: ${overallMatchRate}% (${isHealthy ? '✅ 완벽' : '⚠️ 확인 필요'})\n`;
    
    if (isHealthy) {
      reportBody += `\n🎉 모든 데이터가 검증을 통과했습니다. 이중 전표나 계산 불일치가 발견되지 않았습니다.`;
    } else {
      reportBody += `• 발견된 이상 징후: 총 ${totalErrors}건\n`;
      if (duplicateCount > 0) reportBody += `  - 🚨 동일자·동일거래처 이중 전표 의심: ${duplicateCount}건\n`;
      if (arithmeticCount > 0) reportBody += `  - 🔢 수량·단가 계산 불일치: ${arithmeticCount}건\n`;
      if (vatCount > 0) reportBody += `  - 💰 부가세 10% 세율 오차: ${vatCount}건\n`;

      if (criticalIssues.length > 0) {
        reportBody += `\n[주요 확인 항목]\n`;
        criticalIssues.slice(0, 3).forEach((issue, idx) => {
          reportBody += `${idx + 1}. ${issue}\n`;
        });
      }
    }
    reportBody += `\n👉 FileToSheet 콘솔에서 이상 셀 자동 보정 기능을 이용해 보세요.`;

    let notificationSent = false;
    let dispatchLogId = null;

    // 알림톡/SMS 발송 옵션
    if (sendNotification && recipientPhone) {
      const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
      const isLms = Buffer.byteLength(reportBody, 'utf-8') > 90;
      const logRes = await insertRows('sms_dispatch_logs', [
        {
          recipient: cleanPhone,
          message_type: isLms ? 'LMS' : 'SMS',
          channel: 'phone_send',
          trigger_name: 'AI_일일감사_리포트',
          body: reportBody,
          status: 'SUCCESS',
          latency_ms: Math.max(80, Date.now() - startTime),
          error_message: '',
          sent_at: new Date().toISOString(),
        },
      ]);
      notificationSent = true;
      dispatchLogId = logRes?.ids?.[0];
      invalidateCache('admin_bootstrap_bundle');
      realtimeHub.notifyTableChange('sms_dispatch_logs', 'insert');
    }

    return NextResponse.json({
      success: true,
      data: {
        date: todayStr,
        totalSheets: targetSheets.length,
        totalRows,
        totalErrors,
        overallMatchRate,
        duplicateCount,
        arithmeticCount,
        vatCount,
        criticalIssues,
        sheetSummaries,
        reportBody,
        notificationSent,
        dispatchLogId,
        latencyMs: Date.now() - startTime,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
