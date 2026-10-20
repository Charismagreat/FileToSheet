'use client';

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';
import { deleteUploadedFile } from '@/lib/egdesk-db';
import { fetchUserProjectsFromDb, saveUserProjectToDb, deleteUserProjectFromDb } from '@/lib/project-db';
import { checkSheetLimit } from '@/lib/plan-limits';
import { useTableEditor } from './useTableEditor';

interface UseWorkspaceOptions {
  phoneNumber?: string;
  plan?: string;
  onPlanLimit?: (title: string, reason: string) => void;
}

export function useWorkspace({ phoneNumber, plan, onPlanLimit }: UseWorkspaceOptions = {}) {
  const [projects, setProjects] = useState<ProjectWorkspace[]>([]);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number>(0);
  const [editingProjectIdx, setEditingProjectIdx] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');
  const [editingSheetIdx, setEditingSheetIdx] = useState<number | null>(null);
  const [editingSheetName, setEditingSheetName] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadedRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  // 1. 실제 DB 또는 로컬 스토리지에서 프로젝트 목록 자동 복원
  useEffect(() => {
    isLoadedRef.current = false;

    // 새로고침(F5) 시 즉시 로컬 캐시에서 프로젝트를 복원하여 화면 깜빡임 및 증발 방지
    try {
      const guestSaved = localStorage.getItem('filetosheet_guest_projects');
      if (guestSaved) {
        const parsed = JSON.parse(guestSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjects(parsed);
          setActiveProjectIndex(0);
        }
      }
    } catch (e) {
      console.warn('로컬 프로젝트 캐시 복원 실패:', e);
    }
    if (phoneNumber) {
      fetchUserProjectsFromDb(phoneNumber).then((dbProjects) => {
        if (dbProjects && dbProjects.length > 0) {
          // 기존 데이터 중 등록일시가 누락된 행이 있을 경우 자동 보정
          const sanitized = dbProjects.map((proj) => ({
            ...proj,
            sheets: proj.sheets.map((sh) => ({
              ...sh,
              rows: (sh.rows || []).map((row) => {
                if (row['등록일시'] && String(row['등록일시']).trim() !== '') return row;
                const matchedDoc =
                  (sh.originalFiles || []).find(
                    (f) =>
                      (row._fileUid && f.id === row._fileUid) ||
                      (row._fileId && f.id === row._fileId) ||
                      (row._fileName && f.name === row._fileName)
                  ) ||
                  (proj.originalFiles || []).find(
                    (f) =>
                      (row._fileUid && f.id === row._fileUid) ||
                      (row._fileId && f.id === row._fileId) ||
                      (row._fileName && f.name === row._fileName)
                  );
                const fallbackDate = matchedDoc?.uploadedAt || proj.uploadedAt || '26. 10. 19. 오전 10:20:00';
                return {
                  ...row,
                  등록일시: fallbackDate,
                };
              }),
            })),
          }));
          setProjects(sanitized);
          setActiveProjectIndex(0);
        } else {
          try {
            const guestSaved = localStorage.getItem('filetosheet_guest_projects');
            if (guestSaved) {
              const parsed = JSON.parse(guestSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setProjects(parsed);
              }
            }
          } catch {}
        }
        isLoadedRef.current = true;
      }).catch(() => {
        isLoadedRef.current = true;
      });
    } else {
      // 미로그인(게스트) 상태일 경우 로컬 스토리지에서 이전 시트/프로젝트 복원 (F5 새로고침 증발 방지)
      try {
        const guestSaved = localStorage.getItem('filetosheet_guest_projects');
        if (guestSaved) {
          const parsed = JSON.parse(guestSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            setActiveProjectIndex(0);
          }
        }
      } catch (e) {
        console.warn('게스트 프로젝트 복원 실패:', e);
      }
      isLoadedRef.current = true;
    }
  }, [phoneNumber]);

  // 2. 프로젝트 변경 시 실제 DB 또는 로컬 스토리지에 자동 동기화 (안전 락 + 디바운스 1000ms)
  useEffect(() => {
    if (!isLoadedRef.current || !currentProject) return;

    // 모든 상태(게스트 및 로그인 공통)에 대해 로컬 스토리지에 즉시 안전 보존 (Base64 제거로 5MB 한도 초과 방지)
    try {
      const sanitized = projects.map((proj) => ({
        ...proj,
        originalFiles: (proj.originalFiles || []).map((f) => {
          const { dataUrl, ...rest } = f;
          return rest;
        }),
      }));
      localStorage.setItem('filetosheet_guest_projects', JSON.stringify(sanitized));
    } catch (e) {
      console.warn('로컬 프로젝트 캐시 저장 실패:', e);
    }
    if (!phoneNumber) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        const savedId = await saveUserProjectToDb(phoneNumber, currentProject);
        if (savedId && !currentProject.id) {
          setProjects((prev) => {
            const next = [...prev];
            if (next[activeProjectIndex] && !next[activeProjectIndex].id) {
              next[activeProjectIndex] = { ...next[activeProjectIndex], id: savedId };
            }
            return next;
          });
        }
        if (plan === 'pro') {
          apiFetch('/api/sync-sqlite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: { ...currentProject, id: savedId || currentProject.id } }),
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('자동 저장 중 경고:', err);
      } finally {
        isSavingRef.current = false;
      }
    }, 1000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [projects, phoneNumber, activeProjectIndex, plan, currentProject]);


  const saveProjectName = () => {
    if (editingProjectIdx === null || !editingProjectName.trim()) return setEditingProjectIdx(null);
    setProjects((prev) => prev.map((p, i) => i === editingProjectIdx ? { ...p, name: editingProjectName.trim() } : p));
    setEditingProjectIdx(null);
  };

  const handleAddNewProject = () => {
    const newProj: ProjectWorkspace = {
      id: null,
      name: `새 프로젝트 ${projects.length + 1}`,
      filename: `새 프로젝트 ${projects.length + 1}`,
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
    const check = checkSheetLimit(plan, currentProject.sheets.length);
    if (!check.allowed) {
      if (onPlanLimit) onPlanLimit('시트 생성 한도 도달', check.message);
      else alert(check.message);
      return;
    }
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

  const handleDeleteOriginalFile = async (fileIdx: number, deleteDataRows: boolean, targetDoc?: OriginalDocFile) => {
    if (!currentProject) return;
    const files = currentProject.originalFiles || (currentProject.originalFileUrl ? [{ name: currentProject.name, url: currentProject.originalFileUrl, id: currentProject.id || undefined }] : []);
    const target = targetDoc || files[fileIdx];
    if (!target) return;

    setProjects((prev) => prev.map((proj, pIdx) => {
      if (pIdx !== activeProjectIndex) return proj;
      const isTargetFile = (f: OriginalDocFile) => target.uid ? f.uid === target.uid : (target.id ? f.id === target.id : f.name === target.name);
      const isTargetRow = (r: any) => target.uid ? r._fileUid === target.uid : (target.id && r._fileId ? r._fileId === target.id : r._fileName === target.name);

      const sheets = proj.sheets.map((s) => ({
        ...s,
        originalFiles: s.originalFiles?.filter((f) => !isTargetFile(f)),
        rows: deleteDataRows
          ? s.rows.filter((r) => !isTargetRow(r)).map((r, i) => ({ ...r, 일련번호: i + 1 }))
          : s.rows,
      }));
      const nextFiles = files.filter((f) => !isTargetFile(f));
      return { ...proj, sheets, originalFiles: nextFiles, originalFileUrl: nextFiles[0]?.url, originalFileType: nextFiles[0]?.type, originalFileSize: nextFiles[0]?.size };
    }));
    if (target.id && !isNaN(Number(target.id))) deleteUploadedFile(Number(target.id)).catch((e) => console.warn('스토리지 파일 삭제 무시:', e));
  };

  const tableEditor = useTableEditor({ projects, setProjects, activeProjectIndex, plan, onPlanLimit });

  return {
    projects, setProjects, activeProjectIndex, setActiveProjectIndex,
    currentProject, currentSheet,
    editingProjectIdx, setEditingProjectIdx, editingProjectName, setEditingProjectName, saveProjectName,
    handleAddNewProject, handleCloseProject,
    editingSheetIdx, setEditingSheetIdx, editingSheetName, setEditingSheetName, saveSheetName,
    handleAddNewSheet, handleDeleteSheet, handleSelectSheet, handleDeleteOriginalFile,
    ...tableEditor,
  };
}

