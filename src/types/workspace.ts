import { ParsedSheet } from '@/lib/parser';
export type { ParsedSheet };

// 원본 증빙 문서 파일 정보 (다중 파일 지원)
export interface OriginalDocFile {
  id?: number | string;
  uid?: string; // 클라이언트/세션 고유 식별자 (중복 파일명 격리용)
  hash?: string; // 파일 내용의 SHA-256 디지털 지문 (동일 내용 중복 방지용)
  fileHash?: string;
  name: string;
  url: string;
  dataUrl?: string; // Base64 영구 캐시 데이터 URL (세션 만료/새로고침 방어)
  type?: string;
  size?: number;
  uploadedAt?: string;
  uploaderPhone?: string; // 업로드한 사용자 휴대폰 번호 (작성자 격리용)
}

// 🌟 1단계: 프로젝트 (Project)
export interface ProjectWorkspace {
  id: number | null;
  name: string; // 프로젝트 이름
  filename: string; // 원본 파일명
  category: string;
  sheets: ParsedSheet[]; // 2단계: 시트 (Sheet) 목록
  activeSheetIndex: number;
  activeSubTab?: 'table' | 'original' | 'summary'; // 3단계: 탭 (Tab: 표 데이터, 원본 증빙, 요약 통계)
  originalFileUrl?: string;
  originalFileType?: string;
  originalFileSize?: number;
  uploadedAt?: string;
  originalFiles?: OriginalDocFile[]; // 다중 원본 증빙 목록
  googleSpreadsheetId?: string; // 연결된 Google 시트 ID
  googleSpreadsheetUrl?: string; // 연결된 Google 시트 URL
}

// 하위 호환성을 위한 별칭
export type WorkspaceDocument = ProjectWorkspace;

// 사용자 세션
export interface UserSession {
  id: number;
  phoneNumber: string;
  nickname: string;
  plan: string;
}

// ==========================================
// 🛡️ 다중 사용자 팀 협업 & 세분화 권한 (RBAC) 규격
// ==========================================

export interface MemberPermissions {
  allowedSheets: string[]; // 접근 허용 시트 이름 배열 (비어있으면 전체 허용)
  canUpload: boolean; // 파일 업로드 및 데이터 추가 허용
  rowEditScope: 'own_only' | 'all' | 'none'; // 'own_only': 본인 등록 데이터만 수정/삭제, 'all': 전체 허용, 'none': 읽기 전용
  canExportData: boolean; // 엑셀/CSV 다운로드 및 구글시트 연동 허용 여부 (DLP 보안)
  canAccessOriginal: boolean; // 원본 증빙(문서 대조) 탭 열람 허용
  canDeleteOwnOriginal: boolean; // 본인이 올린 원본 증빙 파일 삭제 허용
  canAccessSummary: boolean; // 요약/통계 탭 열람 허용
  canEditSummaryConfig: boolean; // 통계 조건/필터 변경 허용
}

export const DEFAULT_MEMBER_PERMISSIONS: MemberPermissions = {
  allowedSheets: [], // 전체
  canUpload: true,
  rowEditScope: 'own_only',
  canExportData: false, // 보안상 기본은 다운로드 제한
  canAccessOriginal: true,
  canDeleteOwnOriginal: true,
  canAccessSummary: true,
  canEditSummaryConfig: false,
};

export interface WorkspaceMember {
  id: number;
  ownerPhone: string;
  memberPhone: string;
  memberNickname?: string;
  status: 'invited' | 'accepted' | 'declined';
  permissions: MemberPermissions;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceContextInfo {
  type: 'personal' | 'team';
  ownerPhone: string;
  ownerName: string;
  isOwner: boolean;
  memberRole?: 'owner' | 'member';
  permissions?: MemberPermissions;
}

// 통계 요약 인터페이스
export interface ColumnStat {
  sum: number;
  avg: number;
  count: number;
  max: number;
  min: number;
}

export interface SheetSummaryData {
  totalRows: number;
  totalCols: number;
  numericStats: Record<string, ColumnStat>;
}
