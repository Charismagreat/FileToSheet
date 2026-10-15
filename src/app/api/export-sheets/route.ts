import { NextRequest, NextResponse } from 'next/server';
import { createSpreadsheet } from '@/egdesk-helpers';
import { recordExport } from '@/lib/egdesk-db';

export async function POST(request: NextRequest) {
  try {
    const { title, data, fileId } = await request.json();

    if (!title || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: '시트 제목과 데이터 행렬이 필요합니다.' },
        { status: 400 }
      );
    }

    // Google Sheets API로 새 스프레드시트 생성
    const result = await createSpreadsheet(title, data);

    const spreadsheetId = result?.spreadsheetId || result?.id || '';
    const spreadsheetUrl =
      result?.spreadsheetUrl ||
      result?.url ||
      (spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        : '');

    // EGDesk DB에 내보내기 이력 저장
    await recordExport(
      fileId || null,
      'google_sheets',
      title,
      spreadsheetUrl,
      'success'
    );

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: '성공적으로 Google 스프레드시트로 내보냈습니다.',
    });
  } catch (error: any) {
    console.error('Google Sheets 내보내기 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Google Sheets 내보내기 실패' },
      { status: 500 }
    );
  }
}
