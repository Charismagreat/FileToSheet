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
 * 1. 실제 DB에서 사용자의 전체 프로젝트 목록 조회 (하이픈 유무 무관 일원화)
 */
export async function fetchUserProjectsFromDb(phoneNumber: string): Promise<ProjectWorkspace[]> {
  if (!phoneNumber) return [];

  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

  // 1차: 정규화된 숫자 11자리로 조회
  let res = await queryTable('user_projects', {
    filters: { phone_number: cleanNumber },
    orderBy: 'id',
    orderDirection: 'ASC',
  });

  // 2차: 혹시 과거 하이픈 포맷으로 등록된 레코드가 있을 경우 폴백 조회
  if ((!res || !res.rows || res.rows.length === 0) && phoneNumber !== cleanNumber) {
    res = await queryTable('user_projects', {
      filters: { phone_number: phoneNumber },
      orderBy: 'id',
      orderDirection: 'ASC',
    });
  }

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
 * 2. 실제 DB에 사용자 프로젝트 생성 또는 업데이트 (Base64 페이로드 다이어트 및 하이픈 일원화)
 */
export async function saveUserProjectToDb(
  phoneNumber: string,
  project: ProjectWorkspace
): Promise<number | null> {
  if (!phoneNumber) return null;

  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const now = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
  const sheetsJson = JSON.stringify(project.sheets || []);

  // 🌟 DB 페이로드 다이어트: 4MB 거대 Base64 dataUrl은 DB에 중복 저장하지 않고 경량 메타데이터만 보존
  const sanitizedFiles = (project.originalFiles || []).map((f) => {
    const { dataUrl, ...rest } = f;
    return rest;
  });

  const originalFilesJson = JSON.stringify({
    files: sanitizedFiles,
    googleSpreadsheetId: project.googleSpreadsheetId,
    googleSpreadsheetUrl: project.googleSpreadsheetUrl,
  });

  if (project.id) {
    // 기존 프로젝트 업데이트 시도 (모바일 ensure-sheet / inbox로 백엔드에서 추가된 시트가 유실되지 않도록 병합)
    try {
      let mergedSheets = [...(project.sheets || [])];
      const existingRes = await queryTable('user_projects', {
        filters: { id: String(project.id) },
        limit: 1,
      });
      const existingRow = existingRes?.rows?.[0];
      if (existingRow?.sheets_data) {
        try {
          const dbSheets = typeof existingRow.sheets_data === 'string'
            ? JSON.parse(existingRow.sheets_data)
            : existingRow.sheets_data;
          if (Array.isArray(dbSheets)) {
            const clientNames = new Set(mergedSheets.map((s: any) => s.name));
            for (const dbSheet of dbSheets) {
              if (dbSheet?.name && !clientNames.has(dbSheet.name)) {
                mergedSheets.push(dbSheet);
              }
            }
          }
        } catch {}
      }

      const updateRes = await updateRows(
        'user_projects',
        {
          phone_number: cleanNumber,
          project_name: project.name,
          category: project.category || '기본',
          sheets_data: JSON.stringify(mergedSheets),
          original_files: originalFilesJson,
          updated_at: now,
        },
        { ids: [Number(project.id)] }
      );
      if (updateRes && updateRes.success !== false) {
        return project.id;
      }
    } catch (err) {
      console.warn('user_projects update 실패, 신규 인서트로 진행:', err);
    }
  }

  // 신규 프로젝트 DB 생성
  await insertRows('user_projects', [
    {
      phone_number: cleanNumber,
      project_name: project.name,
      category: project.category || '기본',
      sheets_data: sheetsJson,
      original_files: originalFilesJson,
      created_at: now,
      updated_at: now,
    },
  ]);

  const latestRes = await queryTable('user_projects', {
    filters: { phone_number: cleanNumber },
    orderBy: 'id',
    orderDirection: 'DESC',
    limit: 1,
  });
  return latestRes?.rows?.[0]?.id ?? null;
}

/**
 * 3. 실제 DB에서 사용자 프로젝트 영구 삭제
 */
export async function deleteUserProjectFromDb(projectId: number): Promise<boolean> {
  if (!projectId) return false;
  try {
    const res = await deleteRows('user_projects', {
      filters: { id: String(projectId) },
    });
    return res && res.success !== false;
  } catch (err) {
    console.error('user_projects delete 실패:', err);
    return false;
  }
}
