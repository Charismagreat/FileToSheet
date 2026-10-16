import { NextRequest, NextResponse } from 'next/server';
import {
  createSpreadsheet,
  clearSheetRange,
  updateSheetRange,
  formatSheetHeaders,
} from '@/egdesk-helpers';
import { recordExport } from '@/lib/egdesk-db';

export async function POST(request: NextRequest) {
  try {
    const { title, data, fileId, mode = 'create', spreadsheetId: existingSpreadsheetId } = await request.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: '시트 데이터 행렬이 필요합니다.' },
        { status: 400 }
      );
    }

    let spreadsheetId = existingSpreadsheetId;
    let spreadsheetUrl = '';

    if (mode === 'update' && spreadsheetId) {
      // 1. 기존 시트 내용 비우기 및 새 데이터로 덮어쓰기
      await clearSheetRange(spreadsheetId, 'A1:Z5000');
      await updateSheetRange(spreadsheetId, 'A1', data);
      try {
        await formatSheetHeaders(spreadsheetId);
      } catch (headerErr) {
        console.warn('헤더 서식 지정 경고 (무시 가능):', headerErr);
      }
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    } else {
      // 2. 신규 Google 스프레드시트 생성
      const result = await createSpreadsheet(title || 'FileToSheet_Export', data);
      spreadsheetId = result?.spreadsheetId || result?.id || '';
      spreadsheetUrl =
        result?.spreadsheetUrl ||
        result?.url ||
        (spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : '');
    }

    // EGDesk DB에 내보내기 이력 기록
    await recordExport(fileId || null, 'google_sheets', title, spreadsheetUrl, 'success');

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: mode === 'update' ? '기존 시트가 최신 데이터로 업데이트되었습니다.' : '새 스프레드시트로 내보냈습니다.',
    });
  } catch (error: any) {
    console.error('Google Sheets 내보내기 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Google Sheets 내보내기 실패' },
      { status: 500 }
    );
  }
}
