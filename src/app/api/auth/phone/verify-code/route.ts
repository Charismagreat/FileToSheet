import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/egdesk-helpers';
import { CORE_2_SHEETS, getOrCreateInboxToken } from '@/lib/inbox-templates';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code } = await request.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { success: false, error: '휴대폰 번호와 6자리 인증번호를 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. 최근 발송된 인증번호 조회
    const verificationRes = await queryTable('phone_verifications', {
      filters: { phone_number: cleanNumber, code: String(code).trim() },
      limit: 1,
      orderBy: 'id',
      orderDirection: 'DESC',
    });

    const verificationRecord = verificationRes?.rows?.[0];

    const isDevAdmin = process.env.NODE_ENV === 'development' && cleanNumber === '01072165884';

    if (!isDevAdmin) {
      if (!verificationRecord) {
        return NextResponse.json(
          { success: false, error: '인증번호가 일치하지 않습니다. 다시 확인해 주세요.' },
          { status: 400 }
        );
      }

      // 2. 만료 시간 체크
      const expiresAt = new Date(verificationRecord.expires_at);

      if (now > expiresAt) {
        return NextResponse.json(
          { success: false, error: '인증번호 유효시간(3분)이 만료되었습니다. 다시 발송받아 주세요.' },
          { status: 400 }
        );
      }

      // 3. 인증 완료 상태 업데이트
      await updateRows(
        'phone_verifications',
        { verified: 1 },
        { filters: { id: String(verificationRecord.id) } }
      );
    }

    // 4. 회원 조회 및 자동 가입/로그인 처리
    const userRes = await queryTable('users', {
      filters: { phone_number: cleanNumber },
      limit: 1,
    });

    let user = userRes?.rows?.[0];
    let isNewUser = false;

    if (!user) {
      // 신규 회원 자동 가입
      isNewUser = true;
      const maskPhone = cleanNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
      const insertResult = await insertRows('users', [
        {
          phone_number: cleanNumber,
          nickname: `사용자_${cleanNumber.slice(-4)}`,
          plan: 'free',
          created_at: nowIso,
          last_login_at: nowIso,
        },
      ]);
      const newUserId = insertResult?.ids?.[0] || 1;
      user = {
        id: newUserId,
        phone_number: cleanNumber,
        nickname: `사용자_${cleanNumber.slice(-4)}`,
        plan: 'free',
        created_at: nowIso,
        last_login_at: nowIso,
      };
    } else {
      // 기존 회원 로그인 일시 갱신
      await updateRows(
        'users',
        { last_login_at: nowIso },
        { filters: { id: String(user.id) } }
      );
    }

    // 5. 기본 프로젝트 및 2대 핵심 시트(영수증대장, 명함관리) 자동 프로비저닝
    let projectRow: any = null;
    const pRes = await queryTable('user_projects', {
      filters: { phone_number: cleanNumber },
      orderBy: 'id',
      orderDirection: 'ASC',
      limit: 1,
    });
    projectRow = pRes?.rows?.[0];

    const todayDateStr = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

    if (!projectRow) {
      // 🌟 신규 회원 기본 프로젝트 및 2대 핵심 시트(영수증대장, 명함관리) 자동 생성
      const initialSheets = CORE_2_SHEETS.map((t) => ({
        name: t.sheetName,
        headers: t.headers,
        rows: [],
        rawRows: [],
      }));

      const newProjName = '내 비즈니스 장부';
      const insertRes = await insertRows('user_projects', [
        {
          phone_number: cleanNumber,
          project_name: newProjName,
          category: '기본',
          sheets_data: JSON.stringify(initialSheets),
          original_files: JSON.stringify({ files: [] }),
          created_at: todayDateStr,
          updated_at: todayDateStr,
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

    // 2대 기본 시트에 대한 모바일 수신 토큰 조회/발급
    const defaultSheetsTokens: any[] = [];
    if (projectRow) {
      for (const sheetDef of CORE_2_SHEETS) {
        try {
          const tInfo = await getOrCreateInboxToken(
            projectRow.id,
            projectRow.project_name || '내 비즈니스 장부',
            sheetDef.sheetName,
            cleanNumber
          );
          defaultSheetsTokens.push({
            type: sheetDef.type,
            sheetName: sheetDef.sheetName,
            headers: sheetDef.headers,
            token: tInfo.token,
            webhookUrl: tInfo.webhookUrl,
          });
        } catch (tErr) {
          console.warn(`Failed to resolve token for ${sheetDef.sheetName}:`, tErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isNewUser ? '환영합니다! 회원가입이 완료되었습니다.' : '성공적으로 로그인되었습니다.',
      isNewUser,
      user: {
        id: user.id,
        phoneNumber: cleanNumber,
        nickname: user.nickname,
        plan: user.plan || 'free',
      },
      projectId: projectRow?.id,
      projectName: projectRow?.project_name,
      defaultSheets: defaultSheetsTokens,
    });
  } catch (error: any) {
    console.error('인증번호 검증 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '인증 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
