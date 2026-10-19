import { NextRequest, NextResponse } from "next/server";
import { insertRows, updateRows, queryTable } from "@/egdesk-helpers";

/**
 * POST /api/sms/callback
 * 
 * 시트봇(SheetBot) 모바일 에이전트가 스마트폰에서 실제 통신사 문자를 발송한 뒤
 * 최종 성공/실패 여부를 파일투시트 측으로 보고하는 웹훅 엔드포인트입니다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      success,
      status, // "SUCCESS" | "FAILED"
      dispatchId,
      uuid,
      recipient,
      error,
      sentAt,
      deviceId,
      reportedAt,
    } = body;

    const isSuccess = !!success;
    const finalStatus = isSuccess ? "SENT" : "FAILED";
    const nowIso = reportedAt || new Date().toISOString();

    // 1. 최근 해당 수신번호의 대기(QUEUED) 항목 탐색하여 상태 업데이트
    let updated = false;
    if (recipient) {
      try {
        const res = await queryTable("sms_dispatch_logs", {
          filters: { recipient: String(recipient), status: "QUEUED" },
          limit: 1,
          orderBy: "id",
          orderDirection: "DESC",
        });

        const targetRow = (res.rows || [])[0];
        if (targetRow?.id) {
          await updateRows("sms_dispatch_logs", {
            filters: { id: String(targetRow.id) },
            updates: {
              status: finalStatus,
              error_message: isSuccess ? null : (error || "모바일 단말기 발송 실패"),
              sent_at: sentAt || nowIso,
            },
          });
          updated = true;
        }
      } catch (findErr: any) {
        console.warn("[SmsCallback] Update existing log warning:", findErr?.message);
      }
    }

    // 2. 만약 기존 항목이 없으면 완료 감사 기록 신규 추가
    if (!updated) {
      try {
        await insertRows("sms_dispatch_logs", [
          {
            recipient: recipient || "UNKNOWN",
            message_type: "ALERT_CALLBACK",
            channel: "SMS_BRIDGE",
            trigger_name: `[SheetBot] 단말기(${deviceId || "Mobile"}) 발송 결과`,
            body: `[발송결과: ${finalStatus}] ID: ${dispatchId || uuid || ""}`,
            status: finalStatus,
            latency_ms: "0ms",
            error_message: isSuccess ? null : error,
            sent_at: sentAt || nowIso,
          },
        ]);
      } catch (insertErr: any) {
        console.warn("[SmsCallback] Insert fallback log warning:", insertErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      reportedStatus: finalStatus,
      recipient,
      sentAt: sentAt || nowIso,
    });
  } catch (error: any) {
    console.error("[SmsCallback] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "콜백 처리 실패" },
      { status: 500 }
    );
  }
}
