import { NextRequest, NextResponse } from 'next/server';
import { getSpreadsheet, getSheetHeaders, getSheetRange } from '@/egdesk-helpers';

/**
 * Google 스프레드시트 URL 또는 ID에서 고유 ID 추출
 */
function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  // URL 형태: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit...
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // 순수 ID 형태 (25자 이상 영문숫자하이픈)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * 1. POST: 구글 시트 URL 검사 및 탭(Tabs) 목록/헤더 미리보기 추출
 */
export async function POST(request: NextRequest) {
  try {
    const { urlOrId } = await request.json();

    if (!urlOrId) {
      return NextResponse.json(
        { success: false, error: 'Google 스프레드시트 주소(URL) 또는 ID를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const spreadsheetId = extractSpreadsheetId(urlOrId);
    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: '올바른 Google 스프레드시트 URL 또는 ID 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 1. Google Sheets 메타데이터 조회
    const sheetMeta = await getSpreadsheet(spreadsheetId);
    if (!sheetMeta) {
      return NextResponse.json(
        {
          success: false,
          error: '스프레드시트를 찾을 수 없습니다. 시트의 공유 설정이 "링크가 있는 모든 사용자(뷰어/편집자)"로 되어 있는지 확인해 주세요.',
        },
        { status: 404 }
      );
    }

    const sheetTitle = sheetMeta.properties?.title || 'Google 스프레드시트';
    const rawTabs = sheetMeta.sheets || [];

    if (rawTabs.length === 0) {
      return NextResponse.json(
        { success: false, error: '스프레드시트 내에 유효한 탭이 없습니다.' },
        { status: 400 }
      );
    }

    // 2. 각 탭의 헤더 및 미리보기 행 가볍게 검사
    const tabs = await Promise.all(
      rawTabs.map(async (sh: any) => {
        const title = sh.properties?.title || 'Sheet1';
        const rowCount = sh.properties?.gridProperties?.rowCount || 0;
        const columnCount = sh.properties?.gridProperties?.columnCount || 0;

        let headers: string[] = [];
        let sampleRowsCount = 0;

        try {
          // 상위 3행 미리보기 로드
          const sampleRange = await getSheetRange(spreadsheetId, `'${title}'!A1:Z3`);
          const values = sampleRange?.values || [];
          if (values.length > 0 && Array.isArray(values[0])) {
            headers = values[0].map((h: any) => String(h || '').trim()).filter(Boolean);
            sampleRowsCount = Math.max(0, values.length - 1);
          }
        } catch (e) {
          console.warn(`[${title}] 탭 미리보기 조회 경고:`, e);
        }

        return {
          sheetId: sh.properties?.sheetId,
          title,
          rowCount,
          columnCount,
          headers,
          hasData: rowCount > 1,
        };
      })
    );

    return NextResponse.json({
      success: true,
      spreadsheetId,
      title: sheetTitle,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      tabs,
    });
  } catch (error: any) {
    console.error('구글 시트 검사 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          '스프레드시트를 불러오지 못했습니다. 시트 권한(링크가 있는 모든 사용자에게 공개)을 확인해 주세요.',
      },
      { status: 500 }
    );
  }
}
