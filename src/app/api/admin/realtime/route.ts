import { NextRequest } from 'next/server';
import { realtimeHub, RealtimeTopic } from '@/lib/realtime-hub';
import { checkAdminAuth } from '@/lib/admin-auth';

/**
 * GET /api/admin/realtime
 * ⚡ 관리자 화면 전용 실시간 SSE 스트림 (DB 왓처 이벤트 수신)
 */
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return new Response('Unauthorized', { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const topic = (searchParams.get('topic') || 'all') as RealtimeTopic;
  const clientId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      realtimeHub.registerClient(clientId, controller, topic);
    },
    cancel() {
      realtimeHub.unregisterClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
