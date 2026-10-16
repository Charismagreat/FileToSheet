'use client';

import { useState, useEffect, useRef } from 'react';
import { ProjectWorkspace } from '@/types/workspace';
import { deleteUploadedFile } from '@/lib/egdesk-db';
import { fetchUserProjectsFromDb, saveUserProjectToDb, deleteUserProjectFromDb } from '@/lib/project-db';
import { useTableEditor } from './useTableEditor';

interface UseWorkspaceOptions {
  phoneNumber?: string;
}

export function useWorkspace({ phoneNumber }: UseWorkspaceOptions = {}) {
  const [projects, setProjects] = useState<ProjectWorkspace[]>([]);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number>(0);
  const [editingProjectIdx, setEditingProjectIdx] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');
  const [editingSheetIdx, setEditingSheetIdx] = useState<number | null>(null);
  const [editingSheetName, setEditingSheetName] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  // 1. 실제 DB에서 사용자의 프로젝트 목록 자동 복원
  useEffect(() => {
    if (!phoneNumber) {
      setProjects([]);
      setActiveProjectIndex(0);
      return;
    }
    fetchUserProjectsFromDb(phoneNumber).then((dbProjects) => {
      if (dbProjects && dbProjects.length > 0) {
        setProjects(dbProjects);
        setActiveProjectIndex(0);
      }
    });
  }, [phoneNumber]);

  // 2. 프로젝트 변경 시 실제 DB에 자동 동기화 (디바운스 800ms)
  useEffect(() => {
    if (!phoneNumber || !currentProject) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const savedId = await saveUserProjectToDb(phoneNumber, currentProject);
      if (savedId && !currentProject.id) {
        setProjects((prev) => {
          const next = [...prev];
          if (next[activeProjectIndex]) next[activeProjectIndex] = { ...next[activeProjectIndex], id: savedId };
          return next;
        });
      }
    }, 800);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [projects, phoneNumber, activeProjectIndex]);

  const saveProjectName = () => {
    if (editingProjectIdx === null || !editingProjectName.trim()) return setEditingProjectIdx(null);
    setProjects((prev) => prev.map((p, i) => i === editingProjectIdx ? { ...p, name: editingProjectName.trim() } : p));
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

  const handleCloseProject = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = projects[idx];
    if (!confirm(`'${target?.name || '프로젝트'}'를 삭제하시겠습니까?\nDB에서 영구 삭제됩니다.`)) return;
    if (target?.id) await deleteUserProjectFromDb(target.id);
    setProjects((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeProjectIndex >= next.length) setActiveProjectIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const handleAddNewSheet = () => {
    if (!currentProject) return;
    const nextSheets = [...currentProject.sheets, { name: `Sheet${currentProject.sheets.length + 1}`, headers: ['일련번호', '등록일시', '항목', '금액', '비고'], rows: [], rawRows: [] }];
    setProjects((prev) => prev.map((p, i) => i === activeProjectIndex ? { ...p, sheets: nextSheets, activeSheetIndex: nextSheets.length - 1 } : p));
  };

  const saveSheetName = () => {
    if (editingSheetIdx === null || !currentProject || !editingSheetName.trim()) return setEditingSheetIdx(null);
    const nextSheets = currentProject.sheets.map((s, i) => i === editingSheetIdx ? { ...s, name: editingSheetName.trim() } : s);
    setProjects((prev) => prev.map((p, i) => i === activeProjectIndex ? { ...p, sheets: nextSheets } : p));
    setEditingSheetIdx(null);
  };

  const handleDeleteSheet = (sheetIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject || currentProject.sheets.length <= 1) return alert('최소 1개의 시트가 존재해야 합니다.');
    const nextSheets = currentProject.sheets.filter((_, i) => i !== sheetIdx);
    const nextIdx = currentProject.activeSheetIndex >= nextSheets.length ? Math.max(0, nextSheets.length - 1) : currentProject.activeSheetIndex;
    setProjects((prev) => prev.map((p, i) => i === activeProjectIndex ? { ...p, sheets: nextSheets, activeSheetIndex: nextIdx } : p));
  };

  const handleSelectSheet = (idx: number) => {
    setProjects((prev) => prev.map((p, i) => i === activeProjectIndex ? { ...p, activeSheetIndex: idx } : p));
  };

  const handleDeleteOriginalFile = async (fileIdx: number, deleteDataRows: boolean) => {
    if (!currentProject) return;
    const files = currentProject.originalFiles || (currentProject.originalFileUrl ? [{ name: currentProject.name, url: currentProject.originalFileUrl, id: currentProject.id || undefined }] : []);
    const target = files[fileIdx];
    if (!target) return;

    setProjects((prev) => prev.map((proj, pIdx) => {
      if (pIdx !== activeProjectIndex) return proj;
      let sheets = proj.sheets;
      if (deleteDataRows) {
        sheets = sheets.map((s) => ({
          ...s,
          rows: s.rows.filter((r) => r._fileName ? r._fileName !== target.name : (target.id && r._fileId ? r._fileId !== target.id : files.length > 1)).map((r, i) => ({ ...r, 일련번호: i + 1 })),
        }));
      }
      const nextFiles = files.filter((_, idx) => idx !== fileIdx);
      return { ...proj, sheets, originalFiles: nextFiles, originalFileUrl: nextFiles[0]?.url, originalFileType: nextFiles[0]?.type, originalFileSize: nextFiles[0]?.size };
    }));
    if (target.id) deleteUploadedFile(target.id).catch((e) => console.warn('스토리지 파일 삭제 무시:', e));
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
