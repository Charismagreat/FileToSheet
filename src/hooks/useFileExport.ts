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

export function useFileExport({ currentProject, setProjects, activeProjectIndex }: UseFileExportOptions) {
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [isExportOptionModalOpen, setIsExportOptionModalOpen] = useState<boolean>(false);

  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  const handleDownloadXlsx = () => {
    if (!currentProject || currentProject.sheets.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    downloadWorkbook(currentProject.sheets, `FileToSheet_${currentProject.name}.xlsx`);
  };

  const executeExportGoogleSheets = async (mode: 'update' | 'create') => {
    if (!currentSheet || currentSheet.rows.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    setExportLoading(true);
    try {
      const data = [
        currentSheet.headers,
        ...currentSheet.rows.map((r) => currentSheet.headers.map((h) => String(r[h] ?? ''))),
      ];
      const res = await apiFetch('/api/export-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[FileToSheet] ${currentProject?.name}`,
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

  const handleExportGoogleSheets = () => {
    if (!currentSheet || currentSheet.rows.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    // 이미 연결된 구글 시트가 있으면 선택 모달 표시
    if (currentProject?.googleSpreadsheetId) {
      setIsExportOptionModalOpen(true);
    } else {
      executeExportGoogleSheets('create');
    }
  };

  return {
    exportLoading,
    isExportOptionModalOpen,
    setIsExportOptionModalOpen,
    handleDownloadXlsx,
    handleExportGoogleSheets,
    executeExportGoogleSheets,
  };
}
