import { NextRequest, NextResponse } from 'next/server';
import { getSheetRange } from '@/egdesk-helpers';
import { ParsedSheet } from '@/types/workspace';
import crypto from 'crypto';

/**
 * 2. POST: 선택한 구글 시트 탭들의 전체 데이터 가져오기 및 FileToSheet 시트 규격 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { spreadsheetId, selectedTabNames, projectId, phoneNumber } = await request.json();

    if (!spreadsheetId || !Array.isArray(selectedTabNames) || selectedTabNames.length === 0) {
      return NextResponse.json(
        { success: false, error: '스프레드시트 ID와 가져올 탭 목록을 선택해 주세요.' },
        { status: 400 }
      );
    }

    const importedSheets: ParsedSheet[] = [];
    const syncToken = `fts_sync_${crypto.randomBytes(12).toString('hex')}`;

    for (const tabName of selectedTabNames) {
      try {
        // 전체 범위 조회 (A1:ZZ5000)
        const rangeRes = await getSheetRange(spreadsheetId, `'${tabName}'!A1:ZZ5000`);
        const values: any[][] = rangeRes?.values || [];

        if (values.length === 0) {
          // 빈 시트인 경우 기본 헤더로 초기화
          importedSheets.push({
            name: tabName,
            headers: ['일련번호', '등록일시', '내용', '비고'],
            rows: [],
            rawRows: [],
            originalFiles: [],
            connectedGoogleSheet: {
              spreadsheetId,
              sheetTabName: tabName,
              syncToken,
              lastSyncedAt: new Date().toISOString(),
            },
          });
          continue;
        }

        // 1행을 헤더로 파싱 (빈 헤더는 '열_인덱스'로 보정)
        const rawHeaders = values[0] || [];
        const headers: string[] = rawHeaders.map((h, colIdx) => {
          const trimmed = String(h ?? '').trim();
          return trimmed || `열_${colIdx + 1}`;
        });

        // 2행부터 데이터 행으로 파싱
        const rows: Record<string, any>[] = [];
        const kstTime = new Intl.DateTimeFormat('ko-KR', {
          dateStyle: 'short',
          timeStyle: 'medium',
        }).format(new Date());

        for (let rIdx = 1; rIdx < values.length; rIdx++) {
          const rowData = values[rIdx];
          // 모든 셀이 비어 있는 빈 행은 건너뜀
          if (!rowData || rowData.every((cell) => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue;
          }

          const rowObj: Record<string, any> = {};
          headers.forEach((header, colIdx) => {
            const val = rowData[colIdx];
            rowObj[header] = val !== undefined && val !== null ? val : '';
          });

          // 기본 일련번호 및 등록일시 보정
          if (!rowObj['일련번호']) rowObj['일련번호'] = rows.length + 1;
          if (!rowObj['등록일시']) rowObj['등록일시'] = kstTime;

          rows.push(rowObj);
        }

        importedSheets.push({
          name: tabName,
          headers: headers.length > 0 ? headers : ['일련번호', '등록일시', '내용'],
          rows,
          rawRows: rows,
          originalFiles: [],
          connectedGoogleSheet: {
            spreadsheetId,
            sheetTabName: tabName,
            syncToken,
            lastSyncedAt: new Date().toISOString(),
          },
        });
      } catch (tabErr: any) {
        console.warn(`[${tabName}] 탭 데이터 가져오기 실패:`, tabErr);
        throw new Error(`[${tabName}] 탭을 가져오지 못했습니다: ${tabErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      syncToken,
      sheets: importedSheets,
      message: `${importedSheets.length}개 시트 탭의 데이터를 성공적으로 가져왔습니다.`,
    });
  } catch (error: any) {
    console.error('구글 시트 데이터 가져오기 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '데이터 가져오기 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
