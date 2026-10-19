import { NextRequest, NextResponse } from 'next/server';
import { insertRows } from '@/egdesk-helpers';
import { OTP_TTL_MS, isDevEnv, sendOtpOrFail } from '@/lib/sms-otp';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, purpose } = await request.json();
    const smsPurpose = purpose === 'transfer-account' ? 'transfer-account' : 'send-code';

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: '휴대폰 번호를 입력해 주세요.' },
        { status: 400 }
      );
    }

    // 번호에서 숫자만 추출
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 11 || !cleanNumber.startsWith('010')) {
      return NextResponse.json(
        { success: false, error: '올바른 010 휴대폰 번호를 입력해 주세요.' },
        { status: 400 }
      );
    }

    // 6자리 랜덤 인증번호 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS).toISOString(); // 5분 유효

    // 이지데스크 My DB phone_verifications 테이블에 저장
    await insertRows('phone_verifications', [
      {
        phone_number: cleanNumber,
        code,
        expires_at: expiresAt,
        verified: 0,
        created_at: now.toISOString(),
      },
    ]);

    const failure = await sendOtpOrFail({
      purpose: smsPurpose,
      phone: cleanNumber,
      code,
      message: `[FileToSheet] 인증번호 ${code} (5분 이내 입력)`,
      triggerName: '[FileToSheet] 휴대폰 인증번호',
    });
    if (failure) return failure;

    return NextResponse.json({
      success: true,
      message: '인증번호 6자리가 발송되었습니다. (5분 이내 입력)',
      expiresAt,
      ...(isDevEnv() ? { testCode: code } : {}),
    });
  } catch (error: any) {
    console.error('인증번호 발송 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '인증번호 발송에 실패했습니다.' },
      { status: 500 }
    );
  }
}
