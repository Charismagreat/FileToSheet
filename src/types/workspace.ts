import { ParsedSheet } from '@/lib/parser';

// 원본 증빙 문서 파일 정보 (다중 파일 지원)
export interface OriginalDocFile {
  id?: number;
  uid?: string; // 클라이언트/세션 고유 식별자 (중복 파일명 격리용)
  hash?: string; // 파일 내용의 SHA-256 디지털 지문 (동일 내용 중복 방지용)
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
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
