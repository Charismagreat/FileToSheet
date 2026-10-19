import { insertRows } from '@/egdesk-helpers';

export interface DispatchSmsOptions {
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
}

const DEFAULT_BRIDGE_KEY = 'sb_bridge_sec_98f41e0a82b3d17c';
const DEFAULT_BRIDGE_URL = 'https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/SheetBot';
const PUBLIC_DOMAIN = 'https://file2sheet.cloud';

/**
 * 파일투시트(FileToSheet) -> 시트봇(SheetBot) 모바일 SMS 브릿지 발송 클라이언트
 * 
 * sheetbot.cloud 백엔드(/api/sms/bridge/dispatch)로 요청을 전송하면,
 * 운영자의 스마트폰(시트봇 모바일 에이전트)이 15초 내에 통신사 LTE/5G 단문 SMS로 실제 발송합니다.
 */
export async function dispatchSmsViaSheetBot(options: DispatchSmsOptions): Promise<DispatchSmsResult> {
  const startTime = Date.now();
  const bridgeUrl = process.env.SHEETBOT_BRIDGE_URL || DEFAULT_BRIDGE_URL;
  const bridgeKey = process.env.SHEETBOT_BRIDGE_API_KEY || DEFAULT_BRIDGE_KEY;

  // 본문 말머리 자동 부착: [FileToSheet] 접두어가 없으면 자동 부착
  let formattedMessage = (options.message || '').trim();
  if (!formattedMessage.startsWith('[FileToSheet]') && !formattedMessage.startsWith('[파일투시트]')) {
    formattedMessage = `[FileToSheet] ${formattedMessage}`;
  }

  // 기본 웹훅 콜백 URL 자동 지정
  const callbackUrl = options.callbackUrl || `${process.env.NEXTAUTH_URL || PUBLIC_DOMAIN}/api/sms/callback`;

  try {
    const res = await fetch(`${bridgeUrl}/api/sms/bridge/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sheetbot-bridge-key': bridgeKey,
      },
      body: JSON.stringify({
        sourceService: 'FileToSheet',
        recipient: options.recipient,
        message: formattedMessage,
        senderPhone: options.senderPhone,
        callbackUrl,
        userEmail: options.userEmail,
      }),
      signal: AbortSignal.timeout(8000), // 8초 타임아웃
    });

    const data = await res.json().catch(() => ({}));
    const latencyMs = `${Date.now() - startTime}ms`;

    if (res.ok && data.success) {
      // 1. 발송 대기 이력 즉시 기록 (QUEUED)
      try {
        await insertRows('sms_dispatch_logs', [
          {
            recipient: options.recipient,
            message_type: options.messageType || 'ALERT',
            channel: 'SMS_BRIDGE',
            trigger_name: options.triggerName || '[FileToSheet] 알림 발송',
            body: formattedMessage,
            status: 'QUEUED',
            latency_ms: latencyMs,
            error_message: null,
            sent_at: new Date().toISOString(),
          },
        ]);
      } catch (logErr: any) {
        console.warn('[SheetBotSmsBridge] Initial log write warning:', logErr?.message);
      }

      return {
        success: true,
        dispatchId: data.dispatchId,
        uuid: data.uuid,
        status: 'QUEUED',
      };
    } else {
      const err = data.error || `HTTP ${res.status}: ${res.statusText}`;
      // 실패 이력 기록
      try {
        await insertRows('sms_dispatch_logs', [
          {
            recipient: options.recipient,
            message_type: options.messageType || 'ALERT',
            channel: 'SMS_BRIDGE',
            trigger_name: options.triggerName || '[FileToSheet] 알림 발송 실패',
            body: formattedMessage,
            status: 'FAILED',
            latency_ms: latencyMs,
            error_message: err,
            sent_at: new Date().toISOString(),
          },
        ]);
      } catch (_) {}

      return {
        success: false,
        error: err,
      };
    }
  } catch (err: any) {
    const latencyMs = `${Date.now() - startTime}ms`;
    console.error('[SheetBotSmsBridge] Dispatch error:', err);
    try {
      await insertRows('sms_dispatch_logs', [
        {
          recipient: options.recipient,
          message_type: options.messageType || 'ALERT',
          channel: 'SMS_BRIDGE',
          trigger_name: options.triggerName || '[FileToSheet] 알림 발송 오류',
          body: formattedMessage,
          status: 'FAILED',
          latency_ms: latencyMs,
          error_message: err.message || '네트워크 연결 오류',
          sent_at: new Date().toISOString(),
        },
      ]);
    } catch (_) {}

    return {
      success: false,
      error: err.message || '브릿지 서버 통신 실패',
    };
  }
}
