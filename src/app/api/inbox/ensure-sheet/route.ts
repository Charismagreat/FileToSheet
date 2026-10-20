// c:\dev\FileToSheet\src\app\api\inbox\ensure-sheet\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/egdesk-helpers';
import {
  CORE_2_SHEETS,
  ON_DEMAND_SHEETS,
  getOrCreateInboxToken,
} from '@/lib/inbox-templates';

/**
 * POST /api/inbox/ensure-sheet
 * 모바일앱에서 보관함 카드를 홈에 꺼내거나 기능을 활성화할 때
 * 해당 전용 시트가 없으면 FTS 프로젝트에 온디맨드로 자동 생성하고 인박스 토큰을 반환
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, projectId: reqProjectId, sheetType, customSheetName } = body;

    if (!phoneNumber && !reqProjectId) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber 또는 projectId가 필요합니다.' },
        { status: 400 }
      );
    }

    const cleanNumber = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';

    // 1. 프로젝트 조회 (projectId 우선, 없으면 phoneNumber로 최신 프로젝트 조회)
    let projectRow: any = null;
    if (reqProjectId && reqProjectId !== 'default') {
      const pRes = await queryTable('user_projects', {
        filters: { id: String(reqProjectId) },
        limit: 1,
      });
      projectRow = pRes?.rows?.[0];
    } else if (cleanNumber) {
      const pRes = await queryTable('user_projects', {
        filters: { phone_number: cleanNumber },
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 1,
      });
      projectRow = pRes?.rows?.[0];
    }

    const now = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

    // 2. 만약 프로젝트가 아예 없으면 기본 프로젝트 생성
    if (!projectRow) {
      const initialSheets = CORE_2_SHEETS.map((t) => ({
        name: t.sheetName,
        headers: t.headers,
        rows: [],
        rawRows: [],
      }));

      const newProjName = '내 비즈니스 장부';
      const insertRes = await insertRows('user_projects', [
        {
          phone_number: cleanNumber || '01000000000',
          project_name: newProjName,
          category: '기본',
          sheets_data: JSON.stringify(initialSheets),
          original_files: JSON.stringify({ files: [] }),
          created_at: now,
          updated_at: now,
        },
      ]);

      const newId = insertRes?.ids?.[0] || 1;
      projectRow = {
        id: newId,
        phone_number: cleanNumber,
        project_name: newProjName,
        sheets_data: JSON.stringify(initialSheets),
      };
    }

    // 3. 대상 시트 템플릿 결정
    let targetSheetName = customSheetName;
    let targetHeaders: string[] = ['일련번호', '등록일시', '내용', '금액', '비고'];

    const coreMatch = CORE_2_SHEETS.find((s) => s.type === sheetType);
    const onDemandMatch = ON_DEMAND_SHEETS[sheetType];

    if (coreMatch) {
      targetSheetName = targetSheetName || coreMatch.sheetName;
      targetHeaders = coreMatch.headers;
    } else if (onDemandMatch) {
      targetSheetName = targetSheetName || onDemandMatch.sheetName;
      targetHeaders = onDemandMatch.headers;
    } else {
      targetSheetName = targetSheetName || '기본 시트';
    }

    // 4. 프로젝트 내 시트 목록 파싱
    let sheets: any[] = [];
    try {
      sheets = typeof projectRow.sheets_data === 'string'
        ? JSON.parse(projectRow.sheets_data)
        : (projectRow.sheets_data || []);
    } catch {
      sheets = [];
    }

    let isNew = false;
    let sheet = sheets.find((s: any) => s.name === targetSheetName);

    if (!sheet) {
      // 🌟 신규 시트 온디맨드 생성
      isNew = true;
      sheet = {
        name: targetSheetName,
        headers: targetHeaders,
        rows: [],
        rawRows: [],
      };
      sheets.push(sheet);

      // 물리 DB에 업데이트 커밋
      await updateRows(
        'user_projects',
        {
          sheets_data: JSON.stringify(sheets),
          updated_at: now,
        },
        { ids: [Number(projectRow.id)] }
      );
    }

    // 5. 해당 시트의 인박스 토큰 발급/조회
    const tokenInfo = await getOrCreateInboxToken(
      projectRow.id,
      projectRow.project_name || '내 프로젝트',
      targetSheetName,
      cleanNumber
    );

    return NextResponse.json({
      success: true,
      isNew,
      projectId: projectRow.id,
      projectName: projectRow.project_name,
      sheetType,
      sheetName: targetSheetName,
      headers: sheet.headers,
      token: tokenInfo.token,
      webhookUrl: tokenInfo.webhookUrl,
      message: isNew
        ? `[${targetSheetName}] 시트가 성공적으로 신규 생성 및 연결되었습니다.`
        : `[${targetSheetName}] 기존 시트와 연결되었습니다.`,
    });
  } catch (error: any) {
    console.error('POST /api/inbox/ensure-sheet error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '시트 생성 및 연결 실패' },
      { status: 500 }
    );
  }
}
