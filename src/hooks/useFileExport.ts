'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';
import { downloadWorkbook } from '@/lib/parser';
import { apiFetch } from '@/lib/api';

interface UseFileExportOptions {
  currentProject: ProjectWorkspace | null;
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
}

function cleanRows(rows: Record<string, any>[], headers: string[]) {
  return rows.map((r) => {
    const clean: Record<string, any> = {};
    headers.forEach((h) => {
      clean[h] = r[h] ?? '';
    });
    return clean;
  });
}

export function useFileExport({ currentProject, setProjects, activeProjectIndex }: UseFileExportOptions) {
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [isExportOptionModalOpen, setIsExportOptionModalOpen] = useState<boolean>(false);

  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  // 1. Excel (.xlsx) 다운로드 (범위 지정 지원)
  const downloadXlsx = (scope: 'filtered' | 'all' = 'all', filteredRows: Record<string, any>[] = []) => {
    if (!currentProject || currentProject.sheets.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }

    const safeProjName = currentProject.name || 'project';

    if (scope === 'filtered' && currentSheet) {
      // 현재 활성 시트의 행만 필터된 행으로 치환
      const sanitizedFiltered = cleanRows(filteredRows, currentSheet.headers);
      const targetSheets = currentProject.sheets.map((s, idx) => {
        if (idx === currentProject.activeSheetIndex) {
          return { name: s.name, rows: sanitizedFiltered };
        }
        return { name: s.name, rows: cleanRows(s.rows, s.headers) };
      });
      const filename = `FileToSheet_${safeProjName}_조회결과_${sanitizedFiltered.length}건.xlsx`;
      downloadWorkbook(targetSheets, filename);
    } else {
      // 전체 원본 데이터 다운로드
      const targetSheets = currentProject.sheets.map((s) => ({
        name: s.name,
        rows: cleanRows(s.rows, s.headers),
      }));
      downloadWorkbook(targetSheets, `FileToSheet_${safeProjName}_전체.xlsx`);
    }
  };

  // 2. Google 스프레드시트 내보내기 실행 (범위 지정 지원)
  const executeExportGoogleSheets = async (
    mode: 'update' | 'create',
    scope: 'filtered' | 'all' = 'all',
    filteredRows: Record<string, any>[] = []
  ) => {
    if (!currentSheet || currentSheet.rows.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    setExportLoading(true);
    try {
      const rowsToExport = scope === 'filtered' ? filteredRows : currentSheet.rows;
      const sanitizedRows = cleanRows(rowsToExport, currentSheet.headers);

      const data = [
        currentSheet.headers,
        ...sanitizedRows.map((r) => currentSheet.headers.map((h) => String(r[h] ?? ''))),
      ];

      const suffix = scope === 'filtered' ? ` (조회결과 ${sanitizedRows.length}건)` : '';
      const res = await apiFetch('/api/export-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[FileToSheet] ${currentProject?.name}${suffix}`,
          data,
          fileId: currentProject?.id,
          mode,
          spreadsheetId: currentProject?.googleSpreadsheetId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '내보내기 실패');

      // 프로젝트에 최신 Google 스프레드시트 정보 반영
      if (json.spreadsheetId) {
        setProjects((prev) => {
          const updated = [...prev];
          if (updated[activeProjectIndex]) {
            updated[activeProjectIndex] = {
              ...updated[activeProjectIndex],
              googleSpreadsheetId: json.spreadsheetId,
              googleSpreadsheetUrl: json.spreadsheetUrl,
            };
          }
          return updated;
        });
      }

      setIsExportOptionModalOpen(false);
      if (json.spreadsheetUrl) window.open(json.spreadsheetUrl, '_blank');
    } catch (e: any) {
      alert(`내보내기 실패: ${e.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // 3. SQLite DB (.sqlite) 다운로드 (범위 지정 지원)
  const downloadSqlite = async (scope: 'filtered' | 'all' = 'all', filteredRows: Record<string, any>[] = []) => {
    if (!currentProject || currentProject.sheets.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    setExportLoading(true);
    try {
      let projectPayload = currentProject;
      const safeProjName = (currentProject.name || 'project').replace(/[\\/:*?"<>|]/g, '_');

      if (scope === 'filtered' && currentSheet) {
        const sanitizedFiltered = cleanRows(filteredRows, currentSheet.headers);
        const modifiedSheets = currentProject.sheets.map((s, idx) => {
          if (idx === currentProject.activeSheetIndex) {
            return { ...s, rows: sanitizedFiltered };
          }
          return { ...s, rows: cleanRows(s.rows, s.headers) };
        });
        projectPayload = {
          ...currentProject,
          name: `${safeProjName}_조회결과_${sanitizedFiltered.length}건`,
          sheets: modifiedSheets,
        };
      }

      const res = await apiFetch('/api/export-sqlite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectPayload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'SQLite 변환에 실패했습니다.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = scope === 'filtered' ? `_조회결과` : `_전체`;
      a.download = `FileToSheet_${safeProjName}${suffix}.sqlite`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`SQLite 내보내기 실패: ${e.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  return {
    exportLoading,
    isExportOptionModalOpen,
    setIsExportOptionModalOpen,
    downloadXlsx,
    downloadSqlite,
    executeExportGoogleSheets,
  };
}
