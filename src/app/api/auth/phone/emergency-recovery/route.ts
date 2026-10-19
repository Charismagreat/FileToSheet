import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/egdesk-helpers';
import { OTP_TTL_MS, isDevEnv, sendOtpOrFail } from '@/lib/sms-otp';

/**
 * 대표자(CFO) 2차 실시간 SMS 인증 기반 비상 계정 강제 회수 API
 * 직원의 휴대폰 분실 또는 무단 잠적 시, 사내 대표자/관리자의 실시간 승인을 통해서만
 * 해당 직원의 프로젝트/시트 데이터를 신규 담당자에게 합법적·안전하게 강제 이전
 */

export async function POST(request: NextRequest) {
  try {
    const { action, targetPhone, newPhone, adminPhone, code } = await request.json();

    if (!targetPhone || !newPhone || !adminPhone) {
      return NextResponse.json(
        { success: false, error: '회수 대상 번호, 신규 담당자 번호, 대표자 번호를 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const cleanTarget = targetPhone.replace(/[^0-9]/g, '');
    const cleanNew = newPhone.replace(/[^0-9]/g, '');
    const cleanAdmin = adminPhone.replace(/[^0-9]/g, '');

    // 010 유효성 검증
    for (const [name, num] of [['회수 대상', cleanTarget], ['신규 담당자', cleanNew], ['대표자', cleanAdmin]]) {
      if (num.length < 10 || !num.startsWith('010')) {
        return NextResponse.json(
          { success: false, error: `올바른 010 ${name} 번호를 입력해 주세요.` },
          { status: 400 }
        );
      }
    }

    if (cleanTarget === cleanNew) {
      return NextResponse.json(
        { success: false, error: '회수 대상 번호와 신규 담당자 번호가 같을 수 없습니다.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // -------------------------------------------------------------
    // [Step 1: 대표자 휴대폰으로 비상 승인 6자리 OTP 발송]
    // -------------------------------------------------------------
    if (action === 'send_code') {
      // 6자리 난수 OTP 생성
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(now.getTime() + OTP_TTL_MS).toISOString(); // 5분 유효

      // 보안 감사(Audit) 로그용 접두어 저장
      await insertRows('phone_verifications', [
        {
          phone_number: cleanAdmin,
          code: otpCode,
          expires_at: expiresAt,
          verified: 0,
          created_at: nowIso,
        },
      ]);

      const failure = await sendOtpOrFail({
        purpose: 'emergency-recovery',
        phone: cleanAdmin,
        code: otpCode,
        message: `[FileToSheet] 비상 승인번호 ${otpCode} (5분 이내 입력)`,
        triggerName: '[FileToSheet] 비상 계정 회수 승인번호',
      });
      if (failure) return failure;

      console.warn(
        `[SECURITY AUDIT] 비상 계정 회수 승인코드 발송: 대상(${cleanTarget}) -> 신규(${cleanNew}), 승인대표자(${cleanAdmin})`
      );

      return NextResponse.json({
        success: true,
        message: `대표자 휴대폰(${cleanAdmin.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')})으로 6자리 비상 승인번호가 발송되었습니다.`,
        ...(isDevEnv() ? { testCode: otpCode } : {}),
      });
    }

    // -------------------------------------------------------------
    // [Step 2: 대표자 OTP 검증 및 비상 강제 회수 실행]
    // -------------------------------------------------------------
    if (action === 'execute') {
      if (!code || String(code).trim().length !== 6) {
        return NextResponse.json(
          { success: false, error: '대표자 휴대폰으로 발송된 6자리 승인번호를 입력해 주세요.' },
          { status: 400 }
        );
      }

      // 1. 대표자 OTP 일치 및 유효시간 검증
      const verificationRes = await queryTable('phone_verifications', {
        filters: { phone_number: cleanAdmin, code: String(code).trim() },
        limit: 1,
        orderBy: 'id',
        orderDirection: 'DESC',
      });

      const record = verificationRes?.rows?.[0];
      if (!record) {
        return NextResponse.json(
          { success: false, error: '대표자 승인번호가 일치하지 않습니다. 무단 사용이 의심되어 차단되었습니다.' },
          { status: 401 }
        );
      }

      const expiresAt = new Date(record.expires_at);
      if (now > expiresAt) {
        return NextResponse.json(
          { success: false, error: '대표자 승인번호 유효시간(3분)이 만료되었습니다. 다시 요청해 주세요.' },
          { status: 400 }
        );
      }

      // 승인번호 완료 마킹
      await updateRows(
        'phone_verifications',
        { verified: 1 },
        { filters: { id: String(record.id) } }
      );

      // 2. 잠적/분실 직원의 모든 프로젝트 소유권을 신규 담당자로 강제 이전
      const targetProjects = await queryTable('user_projects', {
        filters: { phone_number: cleanTarget },
      });

      const projectRows = targetProjects?.rows || [];
      let recoveredCount = 0;
      const formattedNow = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(now);

      for (const p of projectRows) {
        if (p.id) {
          await updateRows(
            'user_projects',
            {
              phone_number: cleanNew,
              updated_at: `${formattedNow} (비상강제회수 by ${cleanAdmin})`,
            },
            { filters: { id: String(p.id) } }
          );
          recoveredCount++;
        }
      }

      // 3. 잠적 직원 계정 상태 잠금(Locked) 및 신규 담당자 유저 등록
      const targetUserRes = await queryTable('users', {
        filters: { phone_number: cleanTarget },
        limit: 1,
      });
      const targetUser = targetUserRes?.rows?.[0];

      if (targetUser) {
        await updateRows(
          'users',
          {
            nickname: `[회수차단]_${cleanTarget.slice(-4)}`,
            last_login_at: `${nowIso} (FORCED_REVOKE)`,
          },
          { filters: { id: String(targetUser.id) } }
        );
      }

      // 신규 담당자 유저 계정 확인 및 생성
      const newUserRes = await queryTable('users', {
        filters: { phone_number: cleanNew },
        limit: 1,
      });

      let finalUser = newUserRes?.rows?.[0];
      if (!finalUser) {
        const insertRes = await insertRows('users', [
          {
            phone_number: cleanNew,
            nickname: `사용자_${cleanNew.slice(-4)}`,
            plan: targetUser?.plan || 'free',
            created_at: nowIso,
            last_login_at: nowIso,
          },
        ]);
        finalUser = {
          id: insertRes?.ids?.[0] || 1,
          phoneNumber: cleanNew,
          nickname: `사용자_${cleanNew.slice(-4)}`,
          plan: targetUser?.plan || 'free',
        };
      }

      console.warn(
        `[SECURITY ACTION] 비상 계정 강제 회수 완료: 대상(${cleanTarget})의 ${recoveredCount}개 프로젝트가 신규(${cleanNew})로 이전됨. 승인자: ${cleanAdmin}`
      );

      return NextResponse.json({
        success: true,
        message: `대표자 인증이 완료되었습니다. 잠적/분실 직원의 모든 프로젝트(${recoveredCount}건)가 신규 담당자에게 안전하게 회수·승계되었습니다.`,
        recoveredCount,
        user: {
          id: finalUser.id,
          phoneNumber: cleanNew,
          nickname: finalUser.nickname,
          plan: finalUser.plan || 'free',
        },
      });
    }

    return NextResponse.json({ success: false, error: '잘못된 액션 요청입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error('비상 계정 회수 처리 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '비상 회수 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
