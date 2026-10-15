'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';

interface UseTableEditorOptions {
  projects: ProjectWorkspace[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
}

export function useTableEditor({
  projects,
  setProjects,
  activeProjectIndex,
}: UseTableEditorOptions) {
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editingHeaderIdx, setEditingHeaderIdx] = useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState<string>('');
  const [isAddingColumn, setIsAddingColumn] = useState<boolean>(false);
  const [newColumnName, setNewColumnName] = useState<string>('');

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  const handleAddColumn = () => {
    const colName = newColumnName.trim();
    if (!colName || !currentProject || !currentSheet) return;
    if (currentSheet.headers.includes(colName)) {
      alert('이미 동일한 이름의 열이 존재합니다.');
      return;
    }
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      const sheets = [...proj.sheets];
      const sheet = { ...sheets[proj.activeSheetIndex] };
      sheet.headers = [...sheet.headers, colName];
      sheet.rows = sheet.rows.map((row) => ({ ...row, [colName]: '' }));
      sheets[proj.activeSheetIndex] = sheet;
      proj.sheets = sheets;
      next[activeProjectIndex] = proj;
      return next;
    });
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleDeleteColumn = (headerName: string) => {
    if (!currentProject || !currentSheet) return;
    if (confirm(`'${headerName}' 열을 삭제하시겠습니까?`)) {
      setProjects((prev) => {
        const next = [...prev];
        const proj = { ...next[activeProjectIndex] };
        const sheets = [...proj.sheets];
        const sheet = { ...sheets[proj.activeSheetIndex] };
        sheet.headers = sheet.headers.filter((h) => h !== headerName);
        sheet.rows = sheet.rows.map((row) => {
          const copy = { ...row };
          delete copy[headerName];
          return copy;
        });
        sheets[proj.activeSheetIndex] = sheet;
        proj.sheets = sheets;
        next[activeProjectIndex] = proj;
        return next;
      });
    }
  };

  const saveHeaderEdit = () => {
    if (editingHeaderIdx === null || !currentProject || !currentSheet) {
      setEditingHeaderIdx(null);
      return;
    }
    const oldHeader = currentSheet.headers[editingHeaderIdx];
    const newHeader = editingHeaderValue.trim();
    if (!newHeader || oldHeader === newHeader) {
      setEditingHeaderIdx(null);
      return;
    }
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      const sheets = [...proj.sheets];
      const sheet = { ...sheets[proj.activeSheetIndex] };
      const nextHeaders = [...sheet.headers];
      nextHeaders[editingHeaderIdx] = newHeader;
      sheet.headers = nextHeaders;
      sheet.rows = sheet.rows.map((row) => {
        const newRow: Record<string, any> = {};
        Object.keys(row).forEach((k) => {
          newRow[k === oldHeader ? newHeader : k] = row[k];
        });
        return newRow;
      });
      sheets[proj.activeSheetIndex] = sheet;
      proj.sheets = sheets;
      next[activeProjectIndex] = proj;
      return next;
    });
    setEditingHeaderIdx(null);
  };

  const handleAddRow = () => {
    if (!currentProject || !currentSheet) return;
    const nowKst = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
    const newRow: Record<string, any> = {};
    currentSheet.headers.forEach((h) => {
      if (h === '일련번호') newRow[h] = currentSheet.rows.length + 1;
      else if (h === '등록일시') newRow[h] = nowKst;
      else newRow[h] = '';
    });
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      const sheets = [...proj.sheets];
      const sheet = { ...sheets[proj.activeSheetIndex] };
      sheet.rows = [...sheet.rows, newRow];
      sheets[proj.activeSheetIndex] = sheet;
      proj.sheets = sheets;
      next[activeProjectIndex] = proj;
      return next;
    });
  };

  const handleDeleteRow = (idx: number) => {
    if (!currentProject || !currentSheet) return;
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      const sheets = [...proj.sheets];
      const sheet = { ...sheets[proj.activeSheetIndex] };
      const updatedRows = sheet.rows.filter((_, i) => i !== idx);
      if (sheet.headers.includes('일련번호')) {
        updatedRows.forEach((r, i) => {
          r['일련번호'] = i + 1;
        });
      }
      sheet.rows = updatedRows;
      sheets[proj.activeSheetIndex] = sheet;
      proj.sheets = sheets;
      next[activeProjectIndex] = proj;
      return next;
    });
  };

  const saveCellEdit = () => {
    if (!editingCell || !currentProject) return;
    const { rowIdx, colKey } = editingCell;
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      const sheets = [...proj.sheets];
      const sheet = { ...sheets[proj.activeSheetIndex] };
      const newRows = [...sheet.rows];
      newRows[rowIdx] = { ...newRows[rowIdx], [colKey]: editValue };
      sheet.rows = newRows;
      sheets[proj.activeSheetIndex] = sheet;
      proj.sheets = sheets;
      next[activeProjectIndex] = proj;
      return next;
    });
    setEditingCell(null);
  };

  return {
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    saveCellEdit,
    editingHeaderIdx,
    setEditingHeaderIdx,
    editingHeaderValue,
    setEditingHeaderValue,
    saveHeaderEdit,
    isAddingColumn,
    setIsAddingColumn,
    newColumnName,
    setNewColumnName,
    handleAddColumn,
    handleDeleteColumn,
    handleAddRow,
    handleDeleteRow,
  };
}
