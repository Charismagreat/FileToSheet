import { apiFetch } from '@/lib/api';
/**
 * 원격지 이지데스크 터널링 서버 및 My DB(Product) 연동 헬퍼
 */

export interface RemoteDbConfig {
  tunnelUrl: string;
  apiKey: string;
  tableName: string;
  environment: 'production' | 'development';
  isConnected: boolean;
  lastConnectedAt?: string;
  cachedColumns?: string[];
  cachedRows?: Record<string, any>[];
  cachedRowCount?: number;
  availableTables?: Array<{ tableName: string; displayName?: string; rowCount?: number }>;
}

const STORAGE_KEY = 'filetosheet_remote_db_config';

export const DEFAULT_REMOTE_CONFIG: RemoteDbConfig = {
  tunnelUrl: 'https://tunneling-service.onrender.com/t/mcp-server-fxkud1',
  apiKey: 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0',
  tableName: 'Product',
  environment: 'production',
  isConnected: false,
};

/**
 * 저장된 원격 DB 연동 설정 불러오기
 */
export function getRemoteDbConfig(): RemoteDbConfig {
  if (typeof window === 'undefined') return DEFAULT_REMOTE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMOTE_CONFIG;
    return { ...DEFAULT_REMOTE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMOTE_CONFIG;
  }
}

/**
 * 원격 DB 연동 설정 저장
 */
export function saveRemoteDbConfig(config: RemoteDbConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('filetosheet_remote_db_updated'));
}

/**
 * 원격 터널 연결 상태 및 테이블 목록 테스트
 */
export async function testRemoteDbConnection(config: RemoteDbConfig): Promise<{
  success: boolean;
  message?: string;
  tables?: Array<{ tableName: string; displayName?: string; rowCount?: number }>;
  hasProductTable?: boolean;
  error?: string;
}> {
  try {
    const res = await apiFetch('/api/remote-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test-connection',
        tunnelUrl: config.tunnelUrl,
        apiKey: config.apiKey,
        tableName: config.tableName,
        environment: config.environment || 'production',
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || '원격 터널링 서버에 연결할 수 없습니다.',
    };
  }
}

/**
 * 원격 테이블(Product 등) 데이터 행 및 컬럼 가져오기
 */
export async function fetchRemoteTableData(config: RemoteDbConfig, limit: number = 200): Promise<{
  success: boolean;
  tableName?: string;
  columns?: string[];
  rows?: Record<string, any>[];
  totalRows?: number;
  error?: string;
}> {
  try {
    const res = await apiFetch('/api/remote-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'fetch-table',
        tunnelUrl: config.tunnelUrl,
        apiKey: config.apiKey,
        tableName: config.tableName,
        environment: config.environment || 'production',
        limit,
      }),
    });

    const data = await res.json();
    if (data.success) {
      // 캐시 갱신
      saveRemoteDbConfig({
        ...config,
        isConnected: true,
        lastConnectedAt: new Date().toISOString(),
        cachedColumns: data.columns || [],
        cachedRows: data.rows || [],
        cachedRowCount: data.totalRows || (data.rows?.length || 0),
      });
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || '원격 데이터를 읽어오지 못했습니다.',
    };
  }
}

export interface RemoteTableResult {
  tableName: string;
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  error?: string;
}

/**
 * 원격 복수 또는 모든 테이블의 데이터 및 스키마 일괄 가져오기 (방안 1: 시트 매핑 전용)
 */
export async function fetchRemoteMultipleTables(
  config: RemoteDbConfig,
  tableNames?: string[],
  limit: number = 200
): Promise<{
  success: boolean;
  tables?: RemoteTableResult[];
  environment?: string;
  error?: string;
}> {
  try {
    const res = await apiFetch('/api/remote-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'fetch-multiple-tables',
        tunnelUrl: config.tunnelUrl,
        apiKey: config.apiKey,
        tableNames,
        environment: config.environment || 'production',
        limit,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || '원격 테이블 목록 데이터를 일괄 조회하지 못했습니다.',
    };
  }
}
