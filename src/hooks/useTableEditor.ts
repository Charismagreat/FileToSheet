'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';
import { getPlanLimits } from '@/lib/plan-limits';
import { insertRows } from '@/egdesk-helpers';

interface UseTableEditorOptions {
  projects: ProjectWorkspace[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
  plan?: string;
  onPlanLimit?: (title: string, reason: string) => void;
}

export function useTableEditor({ projects, setProjects, activeProjectIndex, plan, onPlanLimit }: UseTableEditorOptions) {
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
    const policy = getPlanLimits(plan);
    if (currentSheet.rows.length >= policy.maxRowsPerSheet) {
      const msg = `[${policy.name}] 정책상 시트당 최대 ${policy.maxRowsPerSheet}행까지만 추가할 수 있습니다. (PRO 플랜은 최대 10,000행 지원)`;
      if (onPlanLimit) onPlanLimit('시트 데이터 한도 도달', msg);
      else alert(msg);
      return;
    }
    const nowKst = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
    const newRow: Record<string, any> = {};
    currentSheet.headers.forEach((h) => {
      if (h === '일련번호') newRow[h] = currentSheet.rows.length + 1;
      else if (h === '등록일시') newRow[h] = nowKst;
      else newRow[h] = '';
    });
    updateActiveSheet((sheet) => ({ ...sheet, rows: [...sheet.rows, newRow] }));

    // 감사 로그 (row_insert) 기록
    insertRows('data_change_logs', [
      {
        project_id: currentProject?.id ? Number(currentProject.id) : null,
        sheet_name: currentSheet.name,
        change_type: 'row_insert',
        target_row: String(currentSheet.rows.length + 1),
        column_name: null,
        before_value: null,
        after_value: JSON.stringify(newRow),
        operator: 'user',
        created_at: new Date().toISOString(),
      },
    ]).catch((e) => console.warn('data_change_logs 기록 실패:', e));
  };

  const handleDeleteRow = (idx: number) => {
    if (!currentSheet) return;
    const targetRow = currentSheet.rows[idx];
    updateActiveSheet((sheet) => {
      const updatedRows = sheet.rows.filter((_: any, i: number) => i !== idx);
      if (sheet.headers.includes('일련번호')) {
        updatedRows.forEach((r: any, i: number) => { r['일련번호'] = i + 1; });
      }
      return { ...sheet, rows: updatedRows };
    });

    // 감사 로그 (row_delete) 기록
    if (targetRow) {
      insertRows('data_change_logs', [
        {
          project_id: currentProject?.id ? Number(currentProject.id) : null,
          sheet_name: currentSheet.name,
          change_type: 'row_delete',
          target_row: String(idx + 1),
          column_name: null,
          before_value: JSON.stringify(targetRow),
          after_value: null,
          operator: 'user',
          created_at: new Date().toISOString(),
        },
      ]).catch((e) => console.warn('data_change_logs 기록 실패:', e));
    }
  };

  const saveCellEdit = () => {
    if (!editingCell || !currentProject || !currentSheet) return;
    const { rowIdx, colKey } = editingCell;
    const beforeVal = currentSheet.rows[rowIdx]?.[colKey];

    if (String(beforeVal ?? '') !== String(editValue ?? '')) {
      updateActiveSheet((sheet) => {
        const newRows = [...sheet.rows];
        newRows[rowIdx] = { ...newRows[rowIdx], [colKey]: editValue };
        return { ...sheet, rows: newRows };
      });

      // 감사 로그 (cell_edit) 기록
      insertRows('data_change_logs', [
        {
          project_id: currentProject?.id ? Number(currentProject.id) : null,
          sheet_name: currentSheet.name,
          change_type: 'cell_edit',
          target_row: String(rowIdx + 1),
          column_name: colKey,
          before_value: String(beforeVal ?? ''),
          after_value: String(editValue ?? ''),
          operator: 'user',
          created_at: new Date().toISOString(),
        },
      ]).catch((e) => console.warn('data_change_logs 기록 실패:', e));
    }

    setEditingCell(null);
  };

  return {
    editingCell, setEditingCell, editValue, setEditValue, saveCellEdit,
    editingHeaderIdx, setEditingHeaderIdx, editingHeaderValue, setEditingHeaderValue, saveHeaderEdit,
    isAddingColumn, setIsAddingColumn, newColumnName, setNewColumnName,
    handleAddColumn, handleDeleteColumn, handleReorderColumns, handleAddRow, handleDeleteRow,
  };
}
