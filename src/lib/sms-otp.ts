import { NextResponse } from 'next/server';
import { deleteRows } from '@/egdesk-helpers';
import { dispatchSmsViaSheetBot, type SmsPurpose } from '@/lib/sheetbot-sms-bridge';

/** 인증번호 유효시간 (SheetBot 큐 만료 3분보다 길게 유지) */
export const OTP_TTL_MS = 5 * 60 * 1000;

export const isDevEnv = () => process.env.NODE_ENV === 'development';

/**
 * 저장된 인증번호를 SheetBot 브릿지로 발송. 실패 시 저장된 코드를 삭제하고 오류 응답 반환.
 * 성공 시 null 반환.
 */
export async function sendOtpOrFail(opts: {
  purpose: SmsPurpose;
  phone: string;
  code: string;
  message: string;
  triggerName: string;
}): Promise<NextResponse | null> {
  const result = await dispatchSmsViaSheetBot({
    purpose: opts.purpose,
    recipient: opts.phone,
    message: opts.message,
    triggerName: opts.triggerName,
    messageType: 'INFO',
  });
  if (result.success) return null;

  // ⚡ 개발 환경에서는 테스트 로그인을 위해 DB의 인증번호를 삭제하지 않고 보존
  if (!isDevEnv()) {
    try {
      await deleteRows('phone_verifications', {
        filters: { phone_number: opts.phone, code: opts.code },
      });
    } catch (e: any) {
      console.error('[OTP] failed to invalidate code:', e?.message);
    }
  }

  if (result.code === 'NO_MANAGER_ONLINE') {
    return NextResponse.json(
      { success: false, code: result.code, error: '문자 발송 담당 기기가 오프라인입니다. 잠시 후 다시 시도해 주세요.' },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { success: false, error: '인증번호 문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
    { status: 503 }
  );
}
