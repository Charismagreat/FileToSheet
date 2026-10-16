/**
 * egdesk.schema.ts — committed seed schema
 *
 * COMMIT THIS FILE TO GIT.
 *
 * When someone opens this project in their EGDesk, these tables are created
 * automatically in their dev database on first server start.
 *
 * Unlike egdesk.config.ts (auto-generated, gitignored), this file is the
 * portable source of truth for your app's database structure.
 *
 * Edit this file when you add/remove tables or columns. Do NOT edit
 * egdesk.config.ts — EGDesk regenerates it from the live database.
 */

export const TABLES = {
  uploaded_files: {
    name: 'uploaded_files',
    displayName: '업로드 파일 목록',
    description: '업로드된 원본 파일 및 스토리지 연동 관리 테이블',
    columns: [
      'filename',
      'file_type',
      'file_size',
      'file_data',
      'status',
      'category',
      'sheet_names',
      'row_count',
      'error_message',
      'created_at',
    ],
    columnCount: 10,
    rowCount: 0,
  },
  sheet_rows: {
    name: 'sheet_rows',
    displayName: '시트 데이터 행 목록',
    description: '파싱된 시트 행별 데이터 테이블',
    columns: [
      'file_id',
      'sheet_name',
      'row_index',
      'row_data',
      'category',
      'created_at',
    ],
    columnCount: 6,
    rowCount: 0,
  },
  export_history: {
    name: 'export_history',
    displayName: '내보내기 이력',
    description: '내보내기 이력 테이블',
    columns: [
      'file_id',
      'export_type',
      'target_title',
      'target_url',
      'status',
      'created_at',
    ],
    columnCount: 6,
    rowCount: 0,
  },
  users: {
    name: 'users',
    displayName: '회원 목록',
    description: '휴대폰 번호 기반 가입 회원 관리 테이블',
    columns: [
      'phone_number',
      'nickname',
      'plan',
      'created_at',
      'last_login_at',
    ],
    columnCount: 5,
    rowCount: 0,
  },
  phone_verifications: {
    name: 'phone_verifications',
    displayName: '휴대폰 인증 목록',
    description: '휴대폰 SMS 인증번호 발송 및 검증 테이블',
    columns: [
      'phone_number',
      'code',
      'expires_at',
      'verified',
      'created_at',
    ],
    columnCount: 5,
    rowCount: 0,
  },
  user_projects: {
    name: 'user_projects',
    displayName: '사용자 프로젝트 목록',
    description: '사용자별 작업 프로젝트 워크스페이스(시트, 헤더, 데이터 행, 원본 증빙 파일 메타데이터) 영구 관리 테이블',
    columns: [
      'phone_number',
      'project_name',
      'category',
      'sheets_data',
      'original_files',
      'created_at',
      'updated_at',
    ],
    columnCount: 7,
    rowCount: 0,
  },
} as const;

export type TableName = keyof typeof TABLES;
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];
