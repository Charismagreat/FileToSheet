// c:\dev\FileToSheet\src\app\api\inbox\ensure-sheet\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/egdesk-helpers';
import {
  SHEETBOT_INBOX_PROJECT_NAME,
  SHEETBOT_INBOX_CATEGORY,
  ALL_TEMPLATE_SHEETS,
  getOrCreateInboxToken,
} from '@/lib/inbox-templates';

/**
 * POST /api/inbox/ensure-sheet
 * 시트봇 모바일앱의 각 기능 카드에서 파일투시트에 연결할 때 호출됨.
 * 
 * 🛡️ 불변 카테고리(category: 'sheetbot_inbox') 기반 격리 & 온디맨드 1:1 시트 생성:
 * 1. 사용자의 기존 일반 프로젝트(예: '경리회계자료', '상반기결산' 등)는 100% 안전하게 보호하고 절대 침범하지 않음.
 * 2. 'category: sheetbot_inbox' 불변 플래그를 가진 시트봇 전용 장부만 탐색하여 바인딩.
 *    (사용자가 PC에서 프로젝트명을 자유롭게 변경하더라도 불변 플래그로 100% 동일 프로젝트에 유지)
 * 3. 아직 시트봇 전용 장부가 없다면, 불필요한 기본 시트(영수증/명함 등)를 강제 생성하지 않고,
 *    오직 현재 요청받은 카드에 대응하는 시트 1개만으로 '시트봇 연동 장부' 프로젝트를 클린하게 신규 생성.
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

    // 1. 대상 시트 명칭 및 헤더 결정
    const cardIdentifier = cardId || sheetType || '';
    const templateMatch = ALL_TEMPLATE_SHEETS && cardIdentifier ? ALL_TEMPLATE_SHEETS[cardIdentifier] : null;

    let targetSheetName = (
      sheetName ||
      customSheetName ||
      templateMatch?.sheetName ||
      cardIdentifier ||
      '모바일 데이터'
    ).trim();

    let targetHeaders: string[] = [];
    if (Array.isArray(incomingHeaders) && incomingHeaders.length > 0) {
      targetHeaders = incomingHeaders.map((h) => String(h).trim()).filter(Boolean);
    } else if (templateMatch) {
      targetHeaders = templateMatch.headers;
    } else {
      targetHeaders = ['일련번호', '등록일시', '내용', '금액', '비고'];
    }

    const now = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

    // 2. 🛡️ 시트봇 전용 프로젝트 탐색 (기존 일반 프로젝트 절대 침범 방지)
    let projectRow: any = null;

    // 2-A. 요청에 명시적인 projectId가 있는 경우 해당 프로젝트 확인
    if (reqProjectId && reqProjectId !== 'default') {
      const pRes = await queryTable('user_projects', {
        filters: { id: String(reqProjectId) },
        limit: 1,
      });
      const candidate = pRes?.rows?.[0];
      if (candidate && (!cleanNumber || candidate.phone_number === cleanNumber)) {
        projectRow = candidate;
      }
    }

    // 2-B. 전화번호 기준 시트봇 전용 불변 카테고리(category: 'sheetbot_inbox') 탐색
    const targetCategory = SHEETBOT_INBOX_CATEGORY || 'sheetbot_inbox';
    const targetProjName = SHEETBOT_INBOX_PROJECT_NAME || '시트봇 연동 장부';

    if (!projectRow && cleanNumber) {
      // 1순위: 불변 플래그 category = 'sheetbot_inbox'로 탐색 (사용자가 이름을 바꿨어도 100% 식별)
      const catRes = await queryTable('user_projects', {
        filters: {
          phone_number: cleanNumber,
          category: targetCategory,
        },
        limit: 1,
      });
      if (catRes?.rows?.[0]) {
        projectRow = catRes.rows[0];
      }

      // 2순위: 과거 생성 데이터 하위 호환 폴백 (이름으로 매칭)
      if (!projectRow) {
        const nameRes = await queryTable('user_projects', {
          filters: { phone_number: cleanNumber },
          limit: 50,
        });
        const matchedByName = (nameRes?.rows || []).find((r: any) =>
          r.project_name === targetProjName || r.project_name === '내 비즈니스 장부'
        );
        if (matchedByName) {
          projectRow = matchedByName;
          // 카테고리를 불변 'sheetbot_inbox'로 보정 업데이트
          await updateRows(
            'user_projects',
            { category: targetCategory },
            { ids: [Number(matchedByName.id)] }
          );
        }
      }
    }

    let isNew = false;
    let sheetUpdated = false;

    // 3. 🌟 시트봇 전용 장부가 아예 없으면: 불필요한 더미 시트 없이, '오직 요청된 카드 1개'만 포함하여 신규 생성!
    if (!projectRow) {
      isNew = true;
      const initialSheets = [
        {
          name: targetSheetName,
          headers: targetHeaders,
          rows: [],
          rawRows: [],
        },
      ];

      const targetPhone = cleanNumber || '01000000000';
      const insertPayload = {
        phone_number: targetPhone,
        project_name: targetProjName, // '시트봇 연동 장부'
        category: targetCategory, // 'sheetbot_inbox' 불변 플래그
        sheets_data: JSON.stringify(initialSheets),
        original_files: JSON.stringify({ files: [] }),
        created_at: now,
        updated_at: now,
      };

      const insRes = await insertRows('user_projects', [insertPayload]);

      const latestRes = await queryTable('user_projects', {
        filters: {
          phone_number: targetPhone,
          category: targetCategory,
        },
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 1,
      });

      projectRow = latestRes?.rows?.[0] || {
        id: insRes?.insertedIds?.[0] || 1,
        phone_number: targetPhone,
        project_name: targetProjName,
        category: targetCategory,
        sheets_data: JSON.stringify(initialSheets),
      };
    }

    // 4. 기존 시트봇 전용 장부가 있는 경우: 해당 카드 시트 탭 추가 또는 스키마 확장
    let sheets: any[] = [];
    try {
      sheets = typeof projectRow.sheets_data === 'string'
        ? JSON.parse(projectRow.sheets_data)
        : (projectRow.sheets_data || []);
    } catch {
      sheets = [];
    }

    let sheet = sheets.find((s: any) => s.name === targetSheetName);

    if (!sheet) {
      // 신규 시트 탭 온디맨드 추가
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
      // 기존 시트가 이미 존재하는 경우: 모바일의 새 헤더 컬럼이 누락되어 있다면 자동 확장
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
      projectRow.project_name || SHEETBOT_INBOX_PROJECT_NAME,
      targetSheetName,
      cleanNumber
    );

    const finalProjectName = projectRow.project_name || targetProjName;

    return NextResponse.json({
      success: true,
      isNew,
      projectId: projectRow.id,
      projectName: finalProjectName,
      cardId: cardIdentifier,
      sheetName: targetSheetName,
      headers: sheet.headers,
      columnTypes: columnTypes || undefined,
      token: tokenInfo.token,
      webhookUrl: tokenInfo.webhookUrl,
      directIngestUrl: tokenInfo.webhookUrl,
      message: isNew
        ? `[${targetSheetName}] 시트가 '${finalProjectName}'에 성공적으로 생성 및 연결되었습니다.`
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
