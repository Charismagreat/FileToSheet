// src/lib/server-cache.ts
/**
 * 인메모리 TTL 캐시 헬퍼
 * 관리자 번들 로더 및 빈번한 설정 조회를 0ms로 응답하도록 지원
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<any>>();

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 10,
  forceRefresh: boolean = false
): Promise<T> {
  const now = Date.now();
  const cached = memoryStore.get(key);

  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.data;
  }

  const freshData = await fetcher();
  memoryStore.set(key, {
    data: freshData,
    expiresAt: now + ttlSeconds * 1000,
  });

  return freshData;
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryStore.clear();
    return;
  }
  for (const k of memoryStore.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryStore.delete(k);
    }
  }
}
