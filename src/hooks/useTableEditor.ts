'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';
import { getPlanLimits } from '@/lib/plan-limits';
import { insertRows } from '@/egdesk-helpers';
import { SheetRelation } from '@/lib/parser';

interface UseTableEditorOptions {
  projects: ProjectWorkspace[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
  plan?: string;
  onPlanLimit?: (title: string, reason: string) => void;
}

export interface DuplicateRowItem {
  row: Record<string, any>;
  originIdx: number;
  fileUid?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface DuplicateGroup {
  groupId: string;
  primaryRow: DuplicateRowItem;
  duplicateRows: DuplicateRowItem[];
}

export function useTableEditor({ projects, setProjects, activeProjectIndex, plan, onPlanLimit }: UseTableEditorOptions) {
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editingHeaderIdx, setEditingHeaderIdx] = useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState<string>('');
  const [isAddingColumn, setIsAddingColumn] = useState<boolean>(false);
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [isJoinViewActive, setIsJoinViewActive] = useState<boolean>(false);
  const [isDeduplicateModalOpen, setIsDeduplicateModalOpen] = useState<boolean>(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);

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

  const handleAddColumn = (customName?: string, relation?: SheetRelation) => {
    const colName = (customName || newColumnName).trim();
    if (!colName || !currentSheet || currentSheet.headers.includes(colName)) return;
    updateActiveSheet((sheet) => {
      const nextRelations = relation ? [...(sheet.relations || []), relation] : (sheet.relations || []);
      return {
        ...sheet,
        headers: [...sheet.headers, colName],
        rows: sheet.rows.map((row: any) => ({ ...row, [colName]: '' })),
        relations: nextRelations,
      };
    });
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
      relations: (sheet.relations || []).filter((r: SheetRelation) => r.foreignKey !== headerName),
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

  /**
   * 중복 행 정리 모달 열기: 일련번호 및 등록일시를 제외한 비즈니스 데이터가 일치하는 중복 행 감지 및 그룹화
   */
  const handleOpenDeduplicateModal = () => {
    if (!currentSheet || currentSheet.rows.length <= 1) {
      alert('정리할 데이터 행이 부족합니다.');
      return;
    }

    const groupMap = new Map<string, DuplicateGroup>();

    currentSheet.rows.forEach((row, idx) => {
      // 비즈니스 데이터(일련번호, 등록일시, _로 시작하는 내부 메타데이터 제외) 키 생성
      const businessContent = Object.entries(row)
        .filter(([k]) => !k.startsWith('_') && k !== '일련번호' && k !== '등록일시')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${String(v ?? '').trim()}`)
        .join('|');

      const key = businessContent || row._fileUid || JSON.stringify(row);
      const rowItem: DuplicateRowItem = {
        row,
        originIdx: idx,
        fileUid: row._fileUid,
        fileName: row._fileName,
        uploadedAt: row.등록일시 || row._uploadedAt,
      };

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupId: `group-${idx}`,
          primaryRow: rowItem,
          duplicateRows: [],
        });
      } else {
        groupMap.get(key)!.duplicateRows.push(rowItem);
      }
    });

    const groupsWithDupes = Array.from(groupMap.values()).filter((g) => g.duplicateRows.length > 0);
    const totalDuplicates = groupsWithDupes.reduce((sum, g) => sum + g.duplicateRows.length, 0);

    if (totalDuplicates === 0) {
      alert('현재 시트에 내용이 동일한 중복 행이 없습니다. 깨끗한 상태입니다.');
      return;
    }

    setDuplicateGroups(groupsWithDupes);
    setIsDeduplicateModalOpen(true);
  };

  /**
   * 중복 행 정리 확인 실행: 사용자가 선택한 중복 행 index들을 시트에서 제거하고 일련번호 재부여
   */
  const handleConfirmDeduplicate = (selectedIndices: number[]) => {
    if (!currentSheet || selectedIndices.length === 0) return;

    const selectedSet = new Set(selectedIndices);
    const remainingRows = currentSheet.rows.filter((_, idx) => !selectedSet.has(idx));
    const reindexedRows = remainingRows.map((r, i) => ({
      ...r,
      일련번호: i + 1,
    }));

    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: reindexedRows,
    }));

    if (plan === 'pro') {
      insertRows('data_change_logs', [
        {
          project_id: currentProject?.id || 'local',
          sheet_name: currentSheet.name,
          change_type: 'deduplicate_rows',
          details: JSON.stringify({ removed_count: selectedIndices.length }),
          created_at: new Date().toISOString(),
        },
      ]).catch((e) => console.warn('data_change_logs 기록 실패:', e));
    }

    setIsDeduplicateModalOpen(false);
  };

  const handleCloseDeduplicateModal = () => {
    setIsDeduplicateModalOpen(false);
  };

  return {
    editingCell, setEditingCell, editValue, setEditValue, saveCellEdit,
    editingHeaderIdx, setEditingHeaderIdx, editingHeaderValue, setEditingHeaderValue, saveHeaderEdit,
    isAddingColumn, setIsAddingColumn, newColumnName, setNewColumnName,
    isJoinViewActive, setIsJoinViewActive,
    handleAddColumn, handleDeleteColumn, handleReorderColumns, handleAddRow, handleDeleteRow,
    isDeduplicateModalOpen, duplicateGroups,
    handleOpenDeduplicateModal, handleConfirmDeduplicate, handleCloseDeduplicateModal,
    handleDeduplicateRows: handleOpenDeduplicateModal,
  };
}
