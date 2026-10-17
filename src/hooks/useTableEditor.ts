'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';

interface UseTableEditorOptions {
  projects: ProjectWorkspace[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
}

export function useTableEditor({ projects, setProjects, activeProjectIndex }: UseTableEditorOptions) {
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editingHeaderIdx, setEditingHeaderIdx] = useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState<string>('');
  const [isAddingColumn, setIsAddingColumn] = useState<boolean>(false);
  const [newColumnName, setNewColumnName] = useState<string>('');

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  const updateActiveSheet = (fn: (sheet: any) => any) => {
    if (!currentProject || !currentSheet) return;
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      const sheets = [...proj.sheets];
      sheets[proj.activeSheetIndex] = fn({ ...sheets[proj.activeSheetIndex] });
      proj.sheets = sheets;
      next[activeProjectIndex] = proj;
      return next;
    });
  };

  const handleAddColumn = () => {
    const colName = newColumnName.trim();
    if (!colName || !currentSheet || currentSheet.headers.includes(colName)) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      headers: [...sheet.headers, colName],
      rows: sheet.rows.map((row: any) => ({ ...row, [colName]: '' })),
    }));
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleDeleteColumn = (headerName: string) => {
    if (!currentSheet || !confirm(`'${headerName}' 열을 삭제하시겠습니까?`)) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      headers: sheet.headers.filter((h: string) => h !== headerName),
      rows: sheet.rows.map((row: any) => {
        const copy = { ...row };
        delete copy[headerName];
        return copy;
      }),
    }));
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    if (!currentSheet || fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || toIdx >= currentSheet.headers.length) return;
    updateActiveSheet((sheet) => {
      const nextHeaders = [...sheet.headers];
      const [moved] = nextHeaders.splice(fromIdx, 1);
      nextHeaders.splice(toIdx, 0, moved);
      return { ...sheet, headers: nextHeaders };
    });
  };

  const saveHeaderEdit = () => {
    if (editingHeaderIdx === null || !currentSheet) return setEditingHeaderIdx(null);
    const oldHeader = currentSheet.headers[editingHeaderIdx];
    const newHeader = editingHeaderValue.trim();
    if (newHeader && oldHeader !== newHeader) {
      updateActiveSheet((sheet) => {
        const nextHeaders = [...sheet.headers];
        nextHeaders[editingHeaderIdx] = newHeader;
        return {
          ...sheet,
          headers: nextHeaders,
          rows: sheet.rows.map((row: any) => {
            const newRow: Record<string, any> = {};
            Object.keys(row).forEach((k) => { newRow[k === oldHeader ? newHeader : k] = row[k]; });
            return newRow;
          }),
        };
      });
    }
    setEditingHeaderIdx(null);
  };

  const handleAddRow = () => {
    if (!currentSheet) return;
    const nowKst = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
    const newRow: Record<string, any> = {};
    currentSheet.headers.forEach((h) => {
      if (h === '일련번호') newRow[h] = currentSheet.rows.length + 1;
      else if (h === '등록일시') newRow[h] = nowKst;
      else newRow[h] = '';
    });
    updateActiveSheet((sheet) => ({ ...sheet, rows: [...sheet.rows, newRow] }));
  };

  const handleDeleteRow = (idx: number) => {
    if (!currentSheet) return;
    updateActiveSheet((sheet) => {
      const updatedRows = sheet.rows.filter((_: any, i: number) => i !== idx);
      if (sheet.headers.includes('일련번호')) {
        updatedRows.forEach((r: any, i: number) => { r['일련번호'] = i + 1; });
      }
      return { ...sheet, rows: updatedRows };
    });
  };

  const saveCellEdit = () => {
    if (!editingCell || !currentProject) return;
    const { rowIdx, colKey } = editingCell;
    updateActiveSheet((sheet) => {
      const newRows = [...sheet.rows];
      newRows[rowIdx] = { ...newRows[rowIdx], [colKey]: editValue };
      return { ...sheet, rows: newRows };
    });
    setEditingCell(null);
  };

  return {
    editingCell, setEditingCell, editValue, setEditValue, saveCellEdit,
    editingHeaderIdx, setEditingHeaderIdx, editingHeaderValue, setEditingHeaderValue, saveHeaderEdit,
    isAddingColumn, setIsAddingColumn, newColumnName, setNewColumnName,
    handleAddColumn, handleDeleteColumn, handleReorderColumns, handleAddRow, handleDeleteRow,
  };
}
