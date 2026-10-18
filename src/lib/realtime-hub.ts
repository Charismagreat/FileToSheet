// src/lib/realtime-hub.ts
/**
 * FileToSheet 전역 실시간 스트림 허브 (FileToSheetRealtimeHub)
 *
 * [핵심 아키텍처 원칙]
 * 1. Single Shared Upstream Connection (단일 업스트림 공유):
 *    수백 명의 회원이 접속해도 user-data DB SSE와는 단 1개의 연결을 공유합니다.
 * 2. Cache Invalidation 패턴 (보안 격리):
 *    스트림으로 민감한 데이터 원본을 직접 흘리지 않고 변경 알림(테이블명, 액션)만 전송하여,
 *    각 브라우저가 자신의 권한으로 최신 데이터만 안전하게 Re-fetch 하도록 합니다.
 * 3. 300ms 이벤트 디바운싱 (Event Storm 방지):
 *    대량 파싱이나 일괄 업로드 시 쏟아지는 수백 건의 이벤트를 300ms 단위로 묶어 클라이언트에 전달합니다.
 * 4. Streaming and Buffering:
 *    Node.js 런타임, text/event-stream, no-cache, no-transform, X-Accel-Buffering: no.
 * 5. Heartbeats:
 *    15초 주기 ': ping\n\n' 전송으로 프록시/Nginx 유휴 강제 종료 방지.
 */

import { EventEmitter } from 'events';

export type RealtimeTopic = 'all' | 'users' | 'sms' | 'rules' | 'inquiries' | 'tax' | 'settings' | 'sheets';

interface StreamClient {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  topic: RealtimeTopic;
  encoder: TextEncoder;
  pingTimer: NodeJS.Timeout;
}

class FileToSheetRealtimeHub extends EventEmitter {
  private static instance: FileToSheetRealtimeHub;
  private clients = new Map<string, StreamClient>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {
    super();
    this.setMaxListeners(200);
  }

  public static getInstance(): FileToSheetRealtimeHub {
    if (!FileToSheetRealtimeHub.instance) {
      FileToSheetRealtimeHub.instance = new FileToSheetRealtimeHub();
    }
    return FileToSheetRealtimeHub.instance;
  }

  /**
   * 클라이언트 SSE 등록
   */
  public registerClient(
    id: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    topic: RealtimeTopic = 'all'
  ): void {
    const encoder = new TextEncoder();

    // 15초 주기 Ping
    const pingTimer = setInterval(() => {
      try {
        controller.enqueue(encoder.encode(': ping\n\n'));
      } catch (err) {
        this.unregisterClient(id);
      }
    }, 15000);

    const client: StreamClient = {
      id,
      controller,
      topic,
      encoder,
      pingTimer,
    };

    this.clients.set(id, client);

    // 초기 연결 환영 이벤트
    try {
      const welcomeData = JSON.stringify({
        type: 'CONNECTED',
        clientId: id,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${welcomeData}\n\n`));
    } catch (err) {
      this.unregisterClient(id);
    }
  }

  /**
   * 클라이언트 등록 해제
   */
  public unregisterClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      clearInterval(client.pingTimer);
      try {
        client.controller.close();
      } catch {}
      this.clients.delete(id);
    }
  }

  /**
   * 테이블 변경 알림 브로드캐스트 (300ms 디바운스 적용)
   */
  public notifyTableChange(tableName: string, action: 'insert' | 'update' | 'delete' = 'update'): void {
    const key = `${tableName}_${action}`;
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.broadcastChange(tableName, action);
    }, 300);

    this.debounceTimers.set(key, timer);
  }

  private broadcastChange(tableName: string, action: string): void {
    const payload = JSON.stringify({
      type: 'DB_CHANGE',
      tableName,
      action,
      timestamp: new Date().toISOString(),
    });

    const deadClientIds: string[] = [];

    this.clients.forEach((client, id) => {
      try {
        client.controller.enqueue(client.encoder.encode(`event: db_change\ndata: ${payload}\n\n`));
      } catch (err) {
        deadClientIds.push(id);
      }
    });

    deadClientIds.forEach((id) => this.unregisterClient(id));
  }

  public getActiveClientCount(): number {
    return this.clients.size;
  }
}

export const realtimeHub = FileToSheetRealtimeHub.getInstance();
