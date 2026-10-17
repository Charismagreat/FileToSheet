import { NextRequest, NextResponse } from 'next/server';
import { queryTable, updateRows, insertRows } from '@/egdesk-helpers';

/**
 * 담당자 변경 및 휴대폰 번호 데이터 승계 API
 * 퇴사자(구 담당자) 계정의 모든 프로젝트/시트/증빙 데이터를 신임 담당자 휴대폰 번호로 일괄 이전
 */
export async function POST(request: NextRequest) {
  try {
    const { currentPhone, newPhone, code } = await request.json();

    if (!currentPhone || !newPhone || !code) {
      return NextResponse.json(
        { success: false, error: '현재 번호, 신규 번호, 인증번호를 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const cleanCurrent = currentPhone.replace(/[^0-9]/g, '');
    const cleanNew = newPhone.replace(/[^0-9]/g, '');

    if (cleanCurrent === cleanNew) {
      return NextResponse.json(
        { success: false, error: '현재 번호와 신규 담당자 번호가 동일합니다.' },
        { status: 400 }
      );
    }

    if (cleanNew.length < 10 || cleanNew.length > 11 || !cleanNew.startsWith('010')) {
      return NextResponse.json(
        { success: false, error: '신규 담당자의 올바른 010 휴대폰 번호를 입력해 주세요.' },
        { status: 400 }
      );
    }

    // 1. 신규 번호로 발송된 6자리 인증번호 검증
    const verificationRes = await queryTable('phone_verifications', {
      filters: { phone_number: cleanNew, code: String(code).trim() },
      limit: 1,
      orderBy: 'id',
      orderDirection: 'DESC',
    });

    const verificationRecord = verificationRes?.rows?.[0];

    if (!verificationRecord) {
      return NextResponse.json(
        { success: false, error: '신규 번호로 발송된 인증번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 유효시간(3분) 검증
    const now = new Date();
    const expiresAt = new Date(verificationRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: '인증번호 유효시간(3분)이 만료되었습니다. 다시 발송받아 주세요.' },
        { status: 400 }
      );
    }

    // 인증 완료 상태로 마킹
    await updateRows(
      'phone_verifications',
      { verified: 1 },
      { filters: { id: String(verificationRecord.id) } }
    );

    // 2. user_projects 테이블의 프로젝트 데이터 승계 (phone_number 업데이트)
    const currentProjectsRes = await queryTable('user_projects', {
      filters: { phone_number: cleanCurrent },
    });

    const projectRows = currentProjectsRes?.rows || [];
    let updatedProjectsCount = 0;

    for (const project of projectRows) {
      if (project.id) {
        await updateRows(
          'user_projects',
          {
            phone_number: cleanNew,
            updated_at: new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(now),
          },
          { filters: { id: String(project.id) } }
        );
        updatedProjectsCount++;
      }
    }

    // 3. users 테이블 승계 및 계정 상태 갱신
    const currentUserRes = await queryTable('users', {
      filters: { phone_number: cleanCurrent },
      limit: 1,
    });
    const targetUserRes = await queryTable('users', {
      filters: { phone_number: cleanNew },
      limit: 1,
    });

    const currentUser = currentUserRes?.rows?.[0];
    const targetUser = targetUserRes?.rows?.[0];
    const nowIso = now.toISOString();

    let finalUser: any = null;

    if (currentUser && !targetUser) {
      // 구 사용자의 계정 번호 자체를 신규 번호로 변경
      await updateRows(
        'users',
        {
          phone_number: cleanNew,
          last_login_at: nowIso,
        },
        { filters: { id: String(currentUser.id) } }
      );
      finalUser = {
        id: currentUser.id,
        phoneNumber: cleanNew,
        nickname: currentUser.nickname,
        plan: currentUser.plan || 'free',
      };
    } else if (targetUser) {
      // 신규 번호가 이미 가입되어 있는 경우: 타깃 유저로 로그인 유지
      await updateRows(
        'users',
        { last_login_at: nowIso },
        { filters: { id: String(targetUser.id) } }
      );
      finalUser = {
        id: targetUser.id,
        phoneNumber: cleanNew,
        nickname: targetUser.nickname,
        plan: targetUser.plan || currentUser?.plan || 'free',
      };
    } else {
      // 둘 다 users 레코드가 없었던 경우 새로 생성
      const insertResult = await insertRows('users', [
        {
          phone_number: cleanNew,
          nickname: `사용자_${cleanNew.slice(-4)}`,
          plan: 'free',
          created_at: nowIso,
          last_login_at: nowIso,
        },
      ]);
      const newId = insertResult?.ids?.[0] || 1;
      finalUser = {
        id: newId,
        phoneNumber: cleanNew,
        nickname: `사용자_${cleanNew.slice(-4)}`,
        plan: 'free',
      };
    }

    console.log(`[Account Transfer] 승계 완료: ${cleanCurrent} -> ${cleanNew} (프로젝트 ${updatedProjectsCount}건 이전)`);

    return NextResponse.json({
      success: true,
      message: `성공적으로 신규 담당자(${cleanNew.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')})에게 모든 데이터가 승계되었습니다.`,
      updatedProjectsCount,
      user: finalUser,
    });
  } catch (error: any) {
    console.error('계정 승계 처리 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '계정 승계 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
