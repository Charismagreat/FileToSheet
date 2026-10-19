/**
 * EGDesk User Data Configuration
 * Generated at: 2026-10-19T04:47:22.378Z
 *
 * This file contains type-safe definitions for your EGDesk tables.
 */

export const EGDESK_CONFIG = {
  apiUrl: 'http://localhost:8080',
  tunnelUrl: 'https://tunneling-service.onrender.com/t/mcp-server-fxkud1-i01o2oa',
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
    name: 'user_wallets',
    displayName: '이용자 토큰 지갑 목록',
    description: '이용자별 파싱 토큰/크레딧 지갑 및 잔여량 관리 테이블',
    rowCount: 4,
    columnCount: 8,
    columns: ['id', '_version', 'phone_number', 'balance_tokens', 'total_purchased_tokens', 'total_used_tokens', 'plan_tier', 'updated_at']
  } as TableDefinition,
  table2: {
    name: 'user_inquiries',
    displayName: '1:1 고객문의 목록',
    description: '1:1 고객문의 및 AI 답변 대장 관리 테이블',
    rowCount: 2,
    columnCount: 12,
    columns: ['id', '_version', 'phone_number', 'user_name', 'title', 'content', 'category', 'status', 'ai_draft_answer', 'final_answer', 'answered_at', 'created_at']
  } as TableDefinition,
  table3: {
    name: 'sms_dispatch_logs',
    displayName: '알림 문자 발송 이력 목록',
    description: '알림 문자 발송 전수 감사 추적 대장 테이블',
    rowCount: 4,
    columnCount: 11,
    columns: ['id', '_version', 'recipient', 'message_type', 'channel', 'trigger_name', 'body', 'status', 'latency_ms', 'error_message', 'sent_at']
  } as TableDefinition,
  table4: {
    name: 'sms_notification_rules',
    displayName: '자연어 알림 규칙 목록',
    description: '자연어 기반 알림 문자 자동 발송 규칙 관리 테이블',
    rowCount: 2,
    columnCount: 12,
    columns: ['id', '_version', 'project_id', 'sheet_name', 'rule_name', 'raw_prompt', 'trigger_config', 'recipient_phone', 'message_template', 'is_active', 'created_at', 'updated_at']
  } as TableDefinition,
  table5: {
    name: 'admin_sms_settings',
    displayName: '관리자 SMS 발송 설정 목록',
    description: '관리자 SMS 발송 환경설정(발송채널, 관리자번호, 자동발송여부) 관리 테이블',
    rowCount: 1,
    columnCount: 10,
    columns: ['id', '_version', 'config_key', 'dispatch_mode', 'admin_phone', 'aligo_api_key', 'aligo_sender', 'google_device_id', 'is_active', 'updated_at']
  } as TableDefinition,
  table6: {
    name: 'admin_settings',
    displayName: '관리자 환경설정 목록',
    description: '관리자 환경설정(회사정보, 푸터, 공식 SNS, AI 모델 파라미터) 영구 저장 테이블',
    rowCount: 3,
    columnCount: 6,
    columns: ['id', '_version', 'setting_key', 'setting_value', 'category', 'updated_at']
  } as TableDefinition,
  table7: {
    name: 'scheduled_tasks',
    displayName: '정기 스케줄 작업 목록',
    description: '정기 스케줄 및 무인 배치 파이프라인 관리 테이블',
    rowCount: 4,
    columnCount: 14,
    columns: ['id', '_version', 'project_id', 'title', 'cron_expression', 'preset_name', 'source_type', 'source_path', 'target_sheet', 'is_active', 'last_run_at', 'last_run_status', 'last_run_result', 'created_at']
  } as TableDefinition,
  table8: {
    name: 'data_change_logs',
    displayName: '데이터 변경 및 삭제 감사 이력',
    description: '시트 데이터 셀 수정, 행 추가, 행 삭제 등의 세부 감사 추적(Audit Trail) 및 변경 이력 관리 테이블',
    rowCount: 3,
    columnCount: 11,
    columns: ['id', '_version', 'project_id', 'sheet_name', 'change_type', 'target_row', 'column_name', 'before_value', 'after_value', 'operator', 'created_at']
  } as TableDefinition,
  table9: {
    name: 'ai_chat_messages',
    displayName: 'AI 비서 대화 이력 목록',
    description: 'AI 비서 대화창에서 사용자와 AI가 나눈 질의응답 대화 이력 영구 보관 테이블',
    rowCount: 0,
    columnCount: 10,
    columns: ['id', '_version', 'project_id', 'phone_number', 'sheet_name', 'scope', 'role', 'content', 'tokens_used', 'created_at']
  } as TableDefinition,
  table10: {
    name: 'ai_call_logs',
    displayName: 'AI 호출 및 사용량 감사 로그',
    description: 'AI 문서 파싱 및 질의응답 시 호출된 모델명, 토큰 소모량, 응답시간, 성공여부 감사 로그 테이블',
    rowCount: 8,
    columnCount: 12,
    columns: ['id', '_version', 'phone_number', 'call_type', 'model_name', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'latency_ms', 'status', 'error_message', 'created_at']
  } as TableDefinition,
  table11: {
    name: 'share_links',
    displayName: '공유 링크 및 수신함 목록',
    description: '프로젝트/시트 링크 공유 및 지점-총괄 수신함 전송 관리 테이블',
    rowCount: 2,
    columnCount: 16,
    columns: ['id', '_version', 'token', 'project_id', 'project_name', 'sender_phone', 'sender_branch', 'receiver_phone', 'allowed_sheets', 'allowed_tabs', 'allow_download', 'password_hash', 'payload_data', 'status', 'created_at', 'expires_at']
  } as TableDefinition,
  table12: {
    name: 'billing_history',
    displayName: '결제 및 충전 이력 목록',
    description: '결제, 토큰 충전, 바우처 및 전자세금계산서 발급 신청 이력 관리 테이블',
    rowCount: 0,
    columnCount: 15,
    columns: ['id', '_version', 'phone_number', 'order_id', 'transaction_type', 'title', 'original_amount', 'final_amount', 'payment_method', 'coupon_code', 'benefits_desc', 'status', 'tax_invoice_status', 'tax_invoice_info', 'created_at']
  } as TableDefinition,
  table13: {
    name: 'sheet_rules',
    displayName: '시트 AI 적재 규칙 및 누적 학습 목록',
    description: '시트별 AI 분석·적재 자연어 규칙 및 누적 학습(In-Context Learning) 패턴 관리 테이블',
    rowCount: 0,
    columnCount: 11,
    columns: ['id', '_version', 'project_id', 'sheet_name', 'rule_text', 'rule_type', 'learned_patterns', 'applied_count', 'is_active', 'created_at', 'updated_at']
  } as TableDefinition,
  table14: {
    name: 'user_projects',
    displayName: '사용자 프로젝트 목록',
    description: '사용자별 작업 프로젝트 워크스페이스(시트, 헤더, 데이터 행, 원본 증빙 파일 메타데이터) 영구 관리 테이블',
    rowCount: 1,
    columnCount: 9,
    columns: ['id', '_version', 'phone_number', 'project_name', 'category', 'sheets_data', 'original_files', 'created_at', 'updated_at']
  } as TableDefinition,
  table15: {
    name: 'phone_verifications',
    displayName: '휴대폰 인증 목록',
    description: '휴대폰 SMS 인증번호 발송 및 검증 테이블',
    rowCount: 7,
    columnCount: 7,
    columns: ['id', '_version', 'phone_number', 'code', 'expires_at', 'verified', 'created_at']
  } as TableDefinition,
  table16: {
    name: 'users',
    displayName: '회원 목록',
    description: '휴대폰 번호 기반 가입 회원 관리 테이블',
    rowCount: 1,
    columnCount: 7,
    columns: ['id', '_version', 'phone_number', 'nickname', 'plan', 'created_at', 'last_login_at']
  } as TableDefinition,
  table17: {
    name: 'export_history',
    displayName: '내보내기 이력',
    description: '내보내기 이력 테이블',
    rowCount: 6,
    columnCount: 8,
    columns: ['id', '_version', 'file_id', 'export_type', 'target_title', 'target_url', 'status', 'created_at']
  } as TableDefinition,
  table18: {
    name: 'sheet_rows',
    displayName: '시트 데이터 행 목록',
    description: '파싱된 시트 행별 데이터 테이블',
    rowCount: 0,
    columnCount: 8,
    columns: ['id', '_version', 'file_id', 'sheet_name', 'row_index', 'row_data', 'category', 'created_at']
  } as TableDefinition,
  table19: {
    name: 'uploaded_files',
    displayName: '업로드 파일 목록',
    description: '업로드된 원본 파일 및 스토리지 연동 관리 테이블',
    rowCount: 7,
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
