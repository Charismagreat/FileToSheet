import { insertRows } from '@/egdesk-helpers';

export type SmsPurpose = 'send-code' | 'emergency-recovery' | 'transfer-account';

export interface DispatchSmsOptions {
  purpose: SmsPurpose;
  recipient: string;
  message: string;
  triggerName?: string;
  messageType?: string; // 'ALERT' | 'INFO' | 'RECEIPT'
  senderPhone?: string;
  callbackUrl?: string;
  userEmail?: string;
}

export interface DispatchSmsResult {
  success: boolean;
  dispatchId?: number | string;
  uuid?: string;
  status?: string;
  error?: string;
  /** SheetBot error code, e.g. 'NO_MANAGER_ONLINE' */
  code?: string;
}

const PUBLIC_DOMAIN = 'https://file2sheet.cloud';

/** 4~8자리 숫자(인증번호 등)를 마스킹 — SheetBot 로그 정책과 동일 */
export function maskDigits(text: string): string {
  return (text || '').replace(/\d{4,8}/g, (m) => '*'.repeat(m.length));
}

function buildCallbackUrl(explicit?: string): string {
  let url = explicit;
  if (!url) {
    const base = process.env.NEXTAUTH_URL;
    // 브릿지는 https 또는 로컬 개발 환경(localhost/127.0.0.1) callbackUrl 허용
    const isLocal = base && (base.includes('localhost') || base.includes('127.0.0.1'));
    const origin = base && (base.startsWith('https://') || isLocal) ? base : PUBLIC_DOMAIN;
    url = `${origin.replace(/\/$/, '')}/api/sms/callback`;
    const secret = process.env.SMS_CALLBACK_SECRET;
    if (secret) url += `?token=${encodeURIComponent(secret)}`;
  }
  return url;
}

/**
 * 파일투시트(FileToSheet) -> 시트봇(SheetBot) 모바일 SMS 브릿지 발송 클라이언트
 *
 * SHEETBOT_BRIDGE_URL / SHEETBOT_BRIDGE_API_KEY 환경변수 필수 (기본값 없음).
 */
export async function dispatchSmsViaSheetBot(options: DispatchSmsOptions): Promise<DispatchSmsResult> {
  const startTime = Date.now();
  const bridgeUrl = process.env.SHEETBOT_BRIDGE_URL?.replace(/\/$/, '');
  const bridgeKey = process.env.SHEETBOT_BRIDGE_API_KEY;

  if (!bridgeUrl || !bridgeKey) {
    console.error('[SheetBotSmsBridge] bridge not configured');
    return { success: false, error: 'bridge not configured' };
  }

  // 본문 말머리 자동 부착: [FileToSheet] 접두어가 없으면 자동 부착
  let formattedMessage = (options.message || '').trim();
  if (!formattedMessage.startsWith('[FileToSheet]') && !formattedMessage.startsWith('[파일투시트]')) {
    formattedMessage = `[FileToSheet] ${formattedMessage}`;
  }
  const maskedMessage = maskDigits(formattedMessage);
  const callbackUrl = buildCallbackUrl(options.callbackUrl);

  const writeLog = async (row: Record<string, any>) => {
    try {
      await insertRows('sms_dispatch_logs', [
        {
          recipient: options.recipient,
          message_type: options.messageType || 'ALERT',
          channel: 'SMS_BRIDGE',
          latency_ms: `${Date.now() - startTime}ms`,
          sent_at: new Date().toISOString(),
          ...row,
        },
      ]);
    } catch (logErr: any) {
      console.warn('[SheetBotSmsBridge] Log write warning:', logErr?.message);
    }
  };

  try {
    const res = await fetch(`${bridgeUrl}/api/sms/bridge/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sheetbot-bridge-key': bridgeKey,
      },
      body: JSON.stringify({
        purpose: options.purpose,
        sourceService: 'FileToSheet',
        recipient: options.recipient,
        message: formattedMessage,
        senderPhone: options.senderPhone,
        callbackUrl,
        userEmail: options.userEmail,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      // dispatch id/uuid를 본문 꼬리표로 남겨 콜백에서 매칭
      const tag = `[dispatch:${data.uuid ?? ''}|${data.dispatchId ?? ''}]`;
      await writeLog({
        trigger_name: options.triggerName || '[FileToSheet] 알림 발송',
        body: `${maskedMessage} ${tag}`,
        status: 'QUEUED',
        error_message: null,
      });
      return { success: true, dispatchId: data.dispatchId, uuid: data.uuid, status: 'QUEUED' };
    }

    const err = data.error || `HTTP ${res.status}: ${res.statusText}`;
    await writeLog({
      trigger_name: options.triggerName || '[FileToSheet] 알림 발송 실패',
      body: maskedMessage,
      status: 'FAILED',
      error_message: data.code ? `${data.code}: ${err}` : err,
    });
    return { success: false, error: err, code: data.code };
  } catch (err: any) {
    console.error('[SheetBotSmsBridge] Dispatch error:', err?.message);
    await writeLog({
      trigger_name: options.triggerName || '[FileToSheet] 알림 발송 오류',
      body: maskedMessage,
      status: 'FAILED',
      error_message: err?.message || '네트워크 연결 오류',
    });
    return { success: false, error: err?.message || '브릿지 서버 통신 실패' };
  }
}
