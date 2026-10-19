/**
 * EGDesk User Data Configuration
 * Generated at: 2026-10-19T13:48:39.502Z
 *
 * This file contains type-safe definitions for your EGDesk tables.
 */

export const EGDESK_CONFIG = {
  apiUrl: 'http://localhost:8080',
  tunnelUrl: 'https://tunneling-service.onrender.com/t/mcp-server-fxkud1',
  apiKey: 'a0a9268e-4bc5-4b9b-8719-68d213b6bf06',
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
    name: 'user_wallets',
    displayName: '이용자 토큰 지갑 목록',
    rowCount: 0,
    columnCount: 8,
    columns: ['id', '_version', 'phone_number', 'balance_tokens', 'total_purchased_tokens', 'total_used_tokens', 'plan_tier', 'updated_at']
  } as TableDefinition,
  table2: {
    name: 'user_inquiries',
    displayName: '1:1 고객문의 목록',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'phone_number', 'user_name', 'title', 'content', 'category', 'status', 'ai_draft_answer', 'final_answer', 'answered_at', 'created_at']
  } as TableDefinition,
  table3: {
    name: 'sms_dispatch_logs',
    displayName: '알림 문자 발송 이력 목록',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', '_version', 'recipient', 'message_type', 'channel', 'trigger_name', 'body', 'status', 'latency_ms', 'error_message', 'sent_at']
  } as TableDefinition,
  table4: {
    name: 'sms_notification_rules',
    displayName: '자연어 알림 규칙 목록',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'project_id', 'sheet_name', 'rule_name', 'raw_prompt', 'trigger_config', 'recipient_phone', 'message_template', 'is_active', 'created_at', 'updated_at']
  } as TableDefinition,
  table5: {
    name: 'admin_sms_settings',
    displayName: '관리자 SMS 발송 설정 목록',
    rowCount: 0,
    columnCount: 10,
    columns: ['id', '_version', 'config_key', 'dispatch_mode', 'admin_phone', 'aligo_api_key', 'aligo_sender', 'google_device_id', 'is_active', 'updated_at']
  } as TableDefinition,
  table6: {
    name: 'admin_settings',
    displayName: '관리자 환경설정 목록',
    rowCount: 0,
    columnCount: 6,
    columns: ['id', '_version', 'setting_key', 'setting_value', 'category', 'updated_at']
  } as TableDefinition,
  table7: {
    name: 'scheduled_tasks',
    displayName: '정기 스케줄 작업 목록',
    rowCount: 0,
    columnCount: 14,
    columns: ['id', '_version', 'project_id', 'title', 'cron_expression', 'preset_name', 'source_type', 'source_path', 'target_sheet', 'is_active', 'last_run_at', 'last_run_status', 'last_run_result', 'created_at']
  } as TableDefinition,
  table8: {
    name: 'data_change_logs',
    displayName: '데이터 변경 및 삭제 감사 이력',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', '_version', 'project_id', 'sheet_name', 'change_type', 'target_row', 'column_name', 'before_value', 'after_value', 'operator', 'created_at']
  } as TableDefinition,
  table9: {
    name: 'ai_chat_messages',
    displayName: 'AI 비서 대화 이력 목록',
    rowCount: 0,
    columnCount: 10,
    columns: ['id', '_version', 'project_id', 'phone_number', 'sheet_name', 'scope', 'role', 'message', 'meta_info', 'created_at']
  } as TableDefinition,
  table10: {
    name: 'ai_call_logs',
    displayName: 'AI 호출 및 사용량 감사 로그',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'phone_number', 'call_type', 'model_name', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'latency_ms', 'status', 'error_message', 'created_at']
  } as TableDefinition,
  table11: {
    name: 'share_links',
    displayName: '공유 링크 및 수신함 목록',
    rowCount: 0,
    columnCount: 16,
    columns: ['id', '_version', 'token', 'project_id', 'project_name', 'sender_phone', 'sender_branch', 'receiver_phone', 'allowed_sheets', 'allowed_tabs', 'allow_download', 'password_hash', 'payload_data', 'status', 'created_at', 'expires_at']
  } as TableDefinition,
  table12: {
    name: 'billing_history',
    displayName: '결제 및 충전 이력 목록',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'phone_number', 'order_id', 'transaction_type', 'title', 'original_amount', 'final_amount', 'payment_method', 'coupon_code', 'benefits_desc', 'status', 'tax_invoice_status', 'tax_invoice_info', 'created_at']
  } as TableDefinition,
  table13: {
    name: 'sheet_rules',
    displayName: '시트 AI 적재 규칙 및 누적 학습 목록',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', '_version', 'project_id', 'sheet_name', 'rule_text', 'rule_type', 'sample_patterns', 'applied_count', 'is_active', 'created_at', 'updated_at']
  } as TableDefinition,
  table14: {
    name: 'user_projects',
    displayName: '사용자 프로젝트 목록',
    rowCount: 0,
    columnCount: 9,
    columns: ['id', '_version', 'phone_number', 'project_name', 'category', 'sheets_data', 'original_files', 'created_at', 'updated_at']
  } as TableDefinition,
  table15: {
    name: 'phone_verifications',
    displayName: '휴대폰 인증 목록',
    rowCount: 0,
    columnCount: 7,
    columns: ['id', '_version', 'phone_number', 'code', 'expires_at', 'verified', 'created_at']
  } as TableDefinition,
  table16: {
    name: 'users',
    displayName: '회원 목록',
    rowCount: 0,
    columnCount: 7,
    columns: ['id', '_version', 'phone_number', 'nickname', 'plan', 'created_at', 'last_login_at']
  } as TableDefinition,
  table17: {
    name: 'export_history',
    displayName: '내보내기 이력',
    rowCount: 0,
    columnCount: 8,
    columns: ['id', '_version', 'file_id', 'export_type', 'target_title', 'target_url', 'status', 'created_at']
  } as TableDefinition,
  table18: {
    name: 'sheet_rows',
    displayName: '시트 데이터 행 목록',
    rowCount: 0,
    columnCount: 8,
    columns: ['id', '_version', 'file_id', 'sheet_name', 'row_index', 'row_data', 'category', 'created_at']
  } as TableDefinition,
  table19: {
    name: 'uploaded_files',
    displayName: '업로드 파일 목록',
    rowCount: 0,
    columnCount: 12,
    columns: ['id', '_version', 'filename', 'file_type', 'file_size', 'file_data', 'status', 'category', 'sheet_names', 'row_count', 'error_message', 'created_at']
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
  table1: 'user_wallets',
  table2: 'user_inquiries',
  table3: 'sms_dispatch_logs',
  table4: 'sms_notification_rules',
  table5: 'admin_sms_settings',
  table6: 'admin_settings',
  table7: 'scheduled_tasks',
  table8: 'data_change_logs',
  table9: 'ai_chat_messages',
  table10: 'ai_call_logs',
  table11: 'share_links',
  table12: 'billing_history',
  table13: 'sheet_rules',
  table14: 'user_projects',
  table15: 'phone_verifications',
  table16: 'users',
  table17: 'export_history',
  table18: 'sheet_rows',
  table19: 'uploaded_files'
} as const;
