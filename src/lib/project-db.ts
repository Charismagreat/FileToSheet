'use client';

import { insertRows, queryTable, updateRows, deleteRows } from '@/egdesk-helpers';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';

export interface UserProjectRow {
  id?: number;
  phone_number: string;
  project_name: string;
  category: string;
  sheets_data: string; // JSON
  original_files: string; // JSON
  created_at: string;
  updated_at: string;
}

/**
 * 1. 실제 DB에서 사용자의 전체 프로젝트 목록 조회
 */
export async function fetchUserProjectsFromDb(phoneNumber: string): Promise<ProjectWorkspace[]> {
  if (!phoneNumber) return [];

  const res = await queryTable('user_projects', {
    filters: { phone_number: phoneNumber },
    orderBy: 'id',
    orderDirection: 'ASC',
  });

  const rows = res?.rows || [];
  return rows.map((row: any) => {
    let sheets = [];
    let originalFiles: OriginalDocFile[] = [];
    let googleSpreadsheetId: string | undefined;
    let googleSpreadsheetUrl: string | undefined;

    try {
      sheets = typeof row.sheets_data === 'string' ? JSON.parse(row.sheets_data) : row.sheets_data || [];
    } catch (e) {
      console.warn('시트 데이터 JSON 파싱 실패:', e);
    }

    try {
      const parsedOf = typeof row.original_files === 'string' ? JSON.parse(row.original_files) : row.original_files;
      if (Array.isArray(parsedOf)) {
        originalFiles = parsedOf;
      } else if (parsedOf && typeof parsedOf === 'object') {
        originalFiles = parsedOf.files || [];
        googleSpreadsheetId = parsedOf.googleSpreadsheetId;
        googleSpreadsheetUrl = parsedOf.googleSpreadsheetUrl;
      }
    } catch (e) {
      console.warn('증빙 파일 JSON 파싱 실패:', e);
    }

    return {
      id: row.id,
      name: row.project_name || '프로젝트',
      filename: originalFiles[0]?.name || row.project_name || '문서',
      category: row.category || '기본',
      sheets: sheets.length > 0 ? sheets : [{ name: 'Sheet1', headers: ['일련번호', '등록일시', '내용', '비고'], rows: [], rawRows: [] }],
      activeSheetIndex: 0,
      activeSubTab: 'table',
      originalFiles,
      originalFileUrl: originalFiles[0]?.url,
      originalFileType: originalFiles[0]?.type,
      originalFileSize: originalFiles[0]?.size,
      googleSpreadsheetId,
      googleSpreadsheetUrl,
      uploadedAt: row.created_at || new Date().toLocaleString('ko-KR'),
    };
  });
}

/**
 * 2. 실제 DB에 사용자 프로젝트 생성 또는 업데이트
 */
export async function saveUserProjectToDb(
  phoneNumber: string,
  project: ProjectWorkspace
): Promise<number | null> {
  if (!phoneNumber) return null;

  const now = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
  const sheetsJson = JSON.stringify(project.sheets || []);
  const originalFilesJson = JSON.stringify({
    files: project.originalFiles || [],
    googleSpreadsheetId: project.googleSpreadsheetId,
    googleSpreadsheetUrl: project.googleSpreadsheetUrl,
  });

  if (project.id) {
    // 기존 프로젝트 업데이트
    await updateRows('user_projects', {
      filters: { id: String(project.id) },
      updates: {
        project_name: project.name,
        category: project.category || '기본',
        sheets_data: sheetsJson,
        original_files: originalFilesJson,
        updated_at: now,
      },
    });
    return project.id;
  }

  // 신규 프로젝트 DB 생성
  const res = await insertRows('user_projects', [
    {
      phone_number: phoneNumber,
      project_name: project.name,
      category: project.category || '기본',
      sheets_data: sheetsJson,
      original_files: originalFilesJson,
      created_at: now,
      updated_at: now,
    },
  ]);

  return res?.ids?.[0] ?? null;
}

/**
 * 3. 실제 DB에서 사용자 프로젝트 영구 삭제
 */
export async function deleteUserProjectFromDb(projectId: number): Promise<boolean> {
  if (!projectId) return false;
  try {
    await deleteRows('user_projects', { ids: [projectId] });
    return true;
  } catch (err) {
    console.error('DB 프로젝트 삭제 실패:', err);
    return false;
  }
}
