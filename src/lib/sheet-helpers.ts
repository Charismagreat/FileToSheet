import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';
import { ParsedSheet } from '@/lib/parser';

/**
 * 특정 시트에 속한 원본 증빙 파일 목록만 안전하게 추출 (시트별 증빙 격리 & 하위 호환성 보장)
 */
export function getSheetOriginalFiles(
  project?: ProjectWorkspace | null,
  sheet?: ParsedSheet | null
): OriginalDocFile[] {
  if (!project || !sheet) return [];

  // 1. 시트에 직접 저장된 originalFiles가 존재하는 경우 최우선 반환
  if (sheet.originalFiles && sheet.originalFiles.length > 0) {
    return sheet.originalFiles;
  }

  // 전체 프로젝트 원본 파일 풀 (다중 파일 목록 또는 단일 원본 URL)
  const allProjectFiles: OriginalDocFile[] =
    project.originalFiles && project.originalFiles.length > 0
      ? project.originalFiles
      : project.originalFileUrl
      ? [{
          name: project.name || '원본 문서',
          url: project.originalFileUrl,
          type: project.originalFileType,
          size: project.originalFileSize,
          uploadedAt: project.uploadedAt,
        }]
      : [];

  if (allProjectFiles.length === 0) return [];

  // 2. 시트의 행(row)에 기록된 _fileUid 또는 _fileName 또는 _fileId 역추적 필터링
  const fileUidsInSheet = new Set<string>();
  const fileNamesInSheet = new Set<string>();
  const fileIdsInSheet = new Set<number>();

  for (const row of sheet.rows || []) {
    if (row._fileUid) fileUidsInSheet.add(String(row._fileUid));
    if (row._fileName) fileNamesInSheet.add(String(row._fileName).trim());
    if (row._fileId) fileIdsInSheet.add(Number(row._fileId));
  }

  if (fileUidsInSheet.size > 0 || fileNamesInSheet.size > 0 || fileIdsInSheet.size > 0) {
    const matched = allProjectFiles.filter((f) => {
      if (f.uid && fileUidsInSheet.has(f.uid)) return true;
      if (f.id && fileIdsInSheet.has(f.id)) return true;
      if (f.name && fileNamesInSheet.has(f.name.trim())) return true;
      return false;
    });
    if (matched.length > 0) return matched;
  }

  // 3. 프로젝트 내에 시트가 1개만 존재하는 경우 전체 파일 풀 반환
  if (project.sheets && project.sheets.length === 1) {
    return allProjectFiles;
  }

  // 4. 시트에 행이 없거나 매핑 정보가 없으면 타 시트 오염 방지를 위해 빈 배열 반환
  return [];
}

/**
 * 나노초 타임스탬프와 난수 기반 전역 고유 파일 UID 생성
 */
export function generateFileUid(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 중복 파일명 방지 및 자동 넘버링 (예: 영수증.pdf -> 영수증 (1).pdf)
 */
export function getUniqueFileName(existingNames: string[], originalName: string): string {
  const trimmed = originalName.trim();
  const lowerSet = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  if (!lowerSet.has(trimmed.toLowerCase())) return trimmed;

  const dotIdx = trimmed.lastIndexOf('.');
  const base = dotIdx !== -1 ? trimmed.slice(0, dotIdx) : trimmed;
  const ext = dotIdx !== -1 ? trimmed.slice(dotIdx) : '';

  let count = 1;
  while (lowerSet.has(`${base} (${count})${ext}`.toLowerCase())) {
    count++;
  }
  return `${base} (${count})${ext}`;
}

/**
 * 파일 내용의 SHA-256 디지털 지문(해시) 비동기 계산
 */
export async function computeFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return `${file.size}_${file.lastModified}`;
  }
}
