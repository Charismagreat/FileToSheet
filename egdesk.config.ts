/**
 * EGDesk User Data Configuration
 * Generated at: 2026-10-16T02:29:52.787Z
 *
 * This file contains type-safe definitions for your EGDesk tables.
 */

export const EGDESK_CONFIG = {
  apiUrl: 'http://localhost:8080',
  tunnelUrl: 'https://tunneling-service.onrender.com/t/mcp-server-fxkud1',
  apiKey: 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0',
} as const;

export interface TableDefinition {
  name: string;
  displayName: string;
  description?: string;
  /** Omitted or unknown until synced / counted */
  rowCount?: number;
  columnCount: number;
  columns: string[];
}

export const TABLES = {
  table1: {
    name: 'phone_verifications',
    displayName: '휴대폰 인증 목록',
    description: '휴대폰 SMS 인증번호 발송 및 검증 테이블',
    rowCount: 0,
    columnCount: 7,
    columns: ['id', '_version', 'phone_number', 'code', 'expires_at', 'verified', 'created_at']
  } as TableDefinition,
  table2: {
    name: 'users',
    displayName: '회원 목록',
    description: '휴대폰 번호 기반 가입 회원 관리 테이블',
    rowCount: 0,
    columnCount: 7,
    columns: ['id', '_version', 'phone_number', 'nickname', 'plan', 'created_at', 'last_login_at']
  } as TableDefinition,
  table3: {
    name: 'export_history',
    displayName: '내보내기 이력',
    description: '내보내기 이력 테이블',
    rowCount: 0,
    columnCount: 8,
    columns: ['id', '_version', 'file_id', 'export_type', 'target_title', 'target_url', 'status', 'created_at']
  } as TableDefinition,
  table4: {
    name: 'sheet_rows',
    displayName: '시트 데이터 행 목록',
    description: '파싱된 시트 행별 데이터 테이블',
    rowCount: 0,
    columnCount: 8,
    columns: ['id', '_version', 'file_id', 'sheet_name', 'row_index', 'row_data', 'category', 'created_at']
  } as TableDefinition,
  table5: {
    name: 'uploaded_files',
    displayName: '업로드 파일 목록',
    description: '업로드된 원본 파일 및 스토리지 연동 관리 테이블',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'filename', 'file_type', 'file_size', 'file_data', 'status', 'category', 'sheet_names', 'row_count', 'error_message', 'created_at']
  } as TableDefinition,
  table6: {
    name: 'example_table',
    displayName: 'Example Table',
    rowCount: 0,
    columnCount: 4,
    columns: ['id', '_version', 'name', 'created_at']
  } as TableDefinition
} as const;


// Main table (first table by default)
export const MAIN_TABLE = TABLES.table1;


// Helper to get table by name
export function getTableByName(tableName: string): TableDefinition | undefined {
  return Object.values(TABLES).find(t => t.name === tableName);
}

// Export table names for easy access
export const TABLE_NAMES = {
  table1: 'phone_verifications',
  table2: 'users',
  table3: 'export_history',
  table4: 'sheet_rows',
  table5: 'uploaded_files',
  table6: 'example_table'
} as const;
