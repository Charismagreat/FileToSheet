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
 * 시트봇 모바일앱의 각 기능 카드에서 구글시트 대신 파일투시트를 선택했을 때 호출됨.
 * 모바일앱이 내장한 시트 명칭, 헤더 컬럼 배열, 데이터 규격을 전달받아
 * 프로젝트 내에 해당 시트를 멱등(Idempotent)하게 보장(신규 생성 또는 기존 시트 매핑/확장)하고
 * 전용 수신 토큰(Inbox Token) 및 Webhook URL을 즉시 반환합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber: rawPhone,
      userPhone,
      projectId: reqProjectId,
      cardId,
      sheetType,
      sheetName,
      customSheetName,
      headers: incomingHeaders,
      columnTypes,
      category,
    } = body;

    const cookiePhone = request.cookies.get('fts_user_phone')?.value;
    const headerPhone = request.headers.get('x-user-phone');
    const inputPhone = rawPhone || userPhone || headerPhone || cookiePhone || '';
    const cleanNumber = inputPhone.replace(/[^0-9]/g, '');

    if (!cleanNumber && !reqProjectId) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber 또는 projectId가 필요합니다.' },
        { status: 400 }
      );
    }

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

    // 2. 만약 프로젝트가 아예 없으면 기본 프로젝트 자동 생성
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
          category: category || '기본',
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

    // 3. 대상 시트 명칭 및 헤더 결정
    // 🌟 모바일앱이 직접 제공한 sheetName과 headers를 최우선 적용 (Client-Provided Schema)
    const cardIdentifier = cardId || sheetType;
    const coreMatch = CORE_2_SHEETS.find((s) => s.type === cardIdentifier);
    const onDemandMatch = ON_DEMAND_SHEETS[cardIdentifier];

    let targetSheetName = (
      sheetName ||
      customSheetName ||
      coreMatch?.sheetName ||
      onDemandMatch?.sheetName ||
      cardIdentifier ||
      '기본 시트'
    ).trim();

    let targetHeaders: string[] = [];
    if (Array.isArray(incomingHeaders) && incomingHeaders.length > 0) {
      // 모바일앱이 내장 헤더 규격을 보낸 경우
      targetHeaders = incomingHeaders.map((h) => String(h).trim()).filter(Boolean);
    } else if (coreMatch) {
      targetHeaders = coreMatch.headers;
    } else if (onDemandMatch) {
      targetHeaders = onDemandMatch.headers;
    } else {
      // 완전 기본 fallback
      targetHeaders = ['일련번호', '등록일시', '내용', '금액', '비고'];
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
    let sheetUpdated = false;
    let sheet = sheets.find((s: any) => s.name === targetSheetName);

    if (!sheet) {
      // 🌟 신규 시트 온디맨드 자동 생성
      isNew = true;
      sheet = {
        name: targetSheetName,
        headers: targetHeaders,
        rows: [],
        rawRows: [],
      };
      sheets.push(sheet);
      sheetUpdated = true;
    } else {
      // 🌟 기존 시트가 이미 존재하는 경우: 모바일의 새 헤더 컬럼이 누락되어 있다면 자동 확장 (Schema Evolution)
      const existingHeaderSet = new Set(sheet.headers || []);
      const newColsToAdd = targetHeaders.filter((h) => !existingHeaderSet.has(h));
      if (newColsToAdd.length > 0) {
        sheet.headers = [...(sheet.headers || []), ...newColsToAdd];
        sheetUpdated = true;
      }
    }

    // 물리 DB에 업데이트 영구 반영
    if (sheetUpdated) {
      await updateRows(
        'user_projects',
        {
          sheets_data: JSON.stringify(sheets),
          updated_at: now,
        },
        { ids: [Number(projectRow.id)] }
      );
    }

    // 5. 해당 시트의 모바일 수신 토큰(Inbox Token) 발급 및 조회
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
      cardId: cardIdentifier,
      sheetName: targetSheetName,
      headers: sheet.headers,
      columnTypes: columnTypes || undefined,
      token: tokenInfo.token,
      webhookUrl: tokenInfo.webhookUrl,
      directIngestUrl: tokenInfo.webhookUrl,
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
