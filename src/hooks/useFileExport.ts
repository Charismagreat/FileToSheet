'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';
import { downloadWorkbook } from '@/lib/parser';
import { apiFetch } from '@/lib/api';

interface UseFileExportOptions {
  currentProject: ProjectWorkspace | null;
}

export function useFileExport({ currentProject }: UseFileExportOptions) {
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  const handleDownloadXlsx = () => {
    if (!currentProject || currentProject.sheets.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    downloadWorkbook(currentProject.sheets, `FileToSheet_${currentProject.name}.xlsx`);
  };

  const handleExportGoogleSheets = async () => {
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
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '내보내기 실패');
      if (json.spreadsheetUrl) window.open(json.spreadsheetUrl, '_blank');
    } catch (e: any) {
      alert(`내보내기 실패: ${e.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  return {
    exportLoading,
    handleDownloadXlsx,
    handleExportGoogleSheets,
  };
}
