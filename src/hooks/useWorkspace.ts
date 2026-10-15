'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';
import { useTableEditor } from './useTableEditor';

export function useWorkspace() {
  const [projects, setProjects] = useState<ProjectWorkspace[]>([]);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number>(0);

  // 프로젝트 이름 인라인 편집
  const [editingProjectIdx, setEditingProjectIdx] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');

  // 시트 이름 편집
  const [editingSheetIdx, setEditingSheetIdx] = useState<number | null>(null);
  const [editingSheetName, setEditingSheetName] = useState<string>('');

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  // 1단계: 프로젝트 관리
  const saveProjectName = () => {
    if (editingProjectIdx === null || !editingProjectName.trim()) {
      setEditingProjectIdx(null);
      return;
    }
    setProjects((prev) => {
      const next = [...prev];
      if (next[editingProjectIdx]) {
        next[editingProjectIdx] = { ...next[editingProjectIdx], name: editingProjectName.trim() };
      }
      return next;
    });
    setEditingProjectIdx(null);
  };

  const handleAddNewProject = () => {
    const newProj: ProjectWorkspace = {
      id: null,
      name: `새 프로젝트 ${projects.length + 1}`,
      category: '신규 프로젝트',
      sheets: [
        {
          name: 'Sheet1',
          headers: ['일련번호', '등록일시', '항목', '금액', '비고'],
          rows: [],
          rawRows: [],
        },
      ],
      activeSheetIndex: 0,
      activeSubTab: 'table',
      uploadedAt: new Date().toLocaleString('ko-KR'),
    };
    setProjects((prev) => {
      setActiveProjectIndex(prev.length);
      return [...prev, newProj];
    });
  };

  const handleCloseProject = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetProj = projects[idx];
    const projName = targetProj?.name || '프로젝트';
    if (!confirm(`'${projName}' 프로젝트를 삭제하시겠습니까?\n포함된 모든 시트 데이터가 함께 닫힙니다.`)) {
      return;
    }
    setProjects((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeProjectIndex >= next.length) {
        setActiveProjectIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  // 2단계: 시트 관리
  const handleAddNewSheet = () => {
    if (!currentProject) return;
    const newSheetName = `Sheet${currentProject.sheets.length + 1}`;
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      proj.sheets = [
        ...proj.sheets,
        { name: newSheetName, headers: ['일련번호', '등록일시', '항목', '금액', '비고'], rows: [], rawRows: [] },
      ];
      proj.activeSheetIndex = proj.sheets.length - 1;
      next[activeProjectIndex] = proj;
      return next;
    });
  };

  const saveSheetName = () => {
    if (editingSheetIdx === null || !currentProject || !editingSheetName.trim()) {
      setEditingSheetIdx(null);
      return;
    }
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      const sheets = [...proj.sheets];
      sheets[editingSheetIdx] = { ...sheets[editingSheetIdx], name: editingSheetName.trim() };
      proj.sheets = sheets;
      next[activeProjectIndex] = proj;
      return next;
    });
    setEditingSheetIdx(null);
  };

  const handleDeleteSheet = (sheetIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject || currentProject.sheets.length <= 1) {
      alert('최소 1개의 시트가 존재해야 합니다.');
      return;
    }
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      proj.sheets = proj.sheets.filter((_, i) => i !== sheetIdx);
      if (proj.activeSheetIndex >= proj.sheets.length) {
        proj.activeSheetIndex = Math.max(0, proj.sheets.length - 1);
      }
      next[activeProjectIndex] = proj;
      return next;
    });
  };

  const handleSelectSheet = (idx: number) => {
    setProjects((prev) => {
      const next = [...prev];
      next[activeProjectIndex] = { ...next[activeProjectIndex], activeSheetIndex: idx };
      return next;
    });
  };

  // 표 내부 편집 훅 연동
  const tableEditor = useTableEditor({
    projects,
    setProjects,
    activeProjectIndex,
  });

  return {
    projects,
    setProjects,
    activeProjectIndex,
    setActiveProjectIndex,
    currentProject,
    currentSheet,
    editingProjectIdx,
    setEditingProjectIdx,
    editingProjectName,
    setEditingProjectName,
    saveProjectName,
    handleAddNewProject,
    handleCloseProject,
    editingSheetIdx,
    setEditingSheetIdx,
    editingSheetName,
    setEditingSheetName,
    saveSheetName,
    handleAddNewSheet,
    handleDeleteSheet,
    handleSelectSheet,
    ...tableEditor,
  };
}
