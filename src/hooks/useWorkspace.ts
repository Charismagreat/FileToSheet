'use client';

import { useState } from 'react';
import { ProjectWorkspace } from '@/types/workspace';
import { deleteUploadedFile } from '@/lib/egdesk-db';
import { useTableEditor } from './useTableEditor';

export function useWorkspace() {
  const [projects, setProjects] = useState<ProjectWorkspace[]>([]);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number>(0);

  const [editingProjectIdx, setEditingProjectIdx] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');
  const [editingSheetIdx, setEditingSheetIdx] = useState<number | null>(null);
  const [editingSheetName, setEditingSheetName] = useState<string>('');

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

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
      sheets: [{ name: 'Sheet1', headers: ['일련번호', '등록일시', '항목', '금액', '비고'], rows: [], rawRows: [] }],
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
    const projName = projects[idx]?.name || '프로젝트';
    if (!confirm(`'${projName}' 프로젝트를 삭제하시겠습니까?\n포함된 모든 시트 데이터가 함께 닫힙니다.`)) return;
    setProjects((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeProjectIndex >= next.length) setActiveProjectIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const handleAddNewSheet = () => {
    if (!currentProject) return;
    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      proj.sheets = [...proj.sheets, { name: `Sheet${proj.sheets.length + 1}`, headers: ['일련번호', '등록일시', '항목', '금액', '비고'], rows: [], rawRows: [] }];
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
      const s = [...proj.sheets];
      s[editingSheetIdx] = { ...s[editingSheetIdx], name: editingSheetName.trim() };
      proj.sheets = s;
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
      if (proj.activeSheetIndex >= proj.sheets.length) proj.activeSheetIndex = Math.max(0, proj.sheets.length - 1);
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

  // 원본 증빙 삭제 (표 데이터 함께 삭제 여부 반영)
  const handleDeleteOriginalFile = async (fileIdx: number, deleteDataRows: boolean) => {
    if (!currentProject) return;
    const files = currentProject.originalFiles || (currentProject.originalFileUrl ? [{
      name: currentProject.name,
      url: currentProject.originalFileUrl,
      id: currentProject.id || undefined,
    }] : []);
    const target = files[fileIdx];
    if (!target) return;

    setProjects((prev) => {
      const next = [...prev];
      const proj = { ...next[activeProjectIndex] };
      if (deleteDataRows) {
        proj.sheets = proj.sheets.map((sheet) => {
          const filtered = sheet.rows.filter((r) => {
            if (r._fileName) return r._fileName !== target.name;
            if (target.id && r._fileId) return r._fileId !== target.id;
            return files.length > 1;
          });
          return { ...sheet, rows: filtered.map((r, i) => ({ ...r, 일련번호: i + 1 })) };
        });
      }
      const nextFiles = files.filter((_, idx) => idx !== fileIdx);
      proj.originalFiles = nextFiles;
      proj.originalFileUrl = nextFiles[0]?.url;
      proj.originalFileType = nextFiles[0]?.type;
      proj.originalFileSize = nextFiles[0]?.size;
      next[activeProjectIndex] = proj;
      return next;
    });
    if (target.id) deleteUploadedFile(target.id).catch((e) => console.warn('파일 삭제 무시:', e));
  };

  const tableEditor = useTableEditor({ projects, setProjects, activeProjectIndex });

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
    handleDeleteOriginalFile,
    ...tableEditor,
  };
}
