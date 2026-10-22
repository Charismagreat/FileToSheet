'use client';

import { useState, useRef, useCallback } from 'react';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';
import { parseFileOnClient } from '@/lib/file-parser-client';
import {
  createUploadedFileRecord,
  uploadToEgdeskStorage,
  updateFileParseResult,
  saveParsedSheetRows,
} from '@/lib/egdesk-db';
import {
  getPlanLimits,
  checkSheetLimit,
  truncateRowsToLimit,
  validateUploadFile,
} from '@/lib/plan-limits';
import { generateFileUid, getUniqueFileName, computeFileHash } from '@/lib/sheet-helpers';
import { saveUserProjectToDb } from '@/lib/project-db';

export interface LastUploadAction {
  fileUid: string;
  fileName: string;
  rowCount: number;
  sheetName: string;
  mode: 'append_rows' | 'new_sheet' | 'new_document';
  snapshot: ProjectWorkspace[];
}

interface UseFileUploadOptions {
  projects: ProjectWorkspace[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
  setActiveProjectIndex: (idx: number) => void;
  phoneNumber?: string;
  plan?: string;
  onPlanLimit?: (title: string, reason: string) => void;
}

export function useFileUpload({
  projects,
  setProjects,
  activeProjectIndex,
  setActiveProjectIndex,
  phoneNumber,
  plan,
  onPlanLimit,
}: UseFileUploadOptions) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [storageProgress, setStorageProgress] = useState<number>(0);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');

  // 🌟 SHA-256 동일 파일 지문 감지 경고 상태
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingFile: OriginalDocFile;
    newFile: File;
    mode: 'new_document' | 'new_sheet' | 'append_rows';
    prompt?: string;
    targetSheetIndex?: number;
  } | null>(null);

  // 🌟 방금 업로드된 내역 1-Click 실행 취소(Undo) 상태
  const [lastUploadAction, setLastUploadAction] = useState<LastUploadAction | null>(null);

  // 분당 호출 제한 및 일일 공정 사용 정책(FUP) 추적용 ref
  const uploadTimestampsRef = useRef<number[]>([]);
  const todayUploadsRef = useRef<{ date: string; count: number }>({ date: '', count: 0 });

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  /**
   * DDoS 및 매크로 어뷰징 방지를 위한 3대 안전 방어벽 사전 검증
   */
  const checkSafety = (file: File): boolean => {
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    if (todayUploadsRef.current.date !== today) {
      todayUploadsRef.current = { date: today, count: 0 };
    }

    // 1분 내 업로드 이력만 보존 (분당 레이트 리밋 검증)
    uploadTimestampsRef.current = uploadTimestampsRef.current.filter((t) => now - t < 60000);

    const val = validateUploadFile(
      plan,
      file,
      uploadTimestampsRef.current.length,
      todayUploadsRef.current.count
    );

    if (!val.allowed) {
      if (onPlanLimit) {
        onPlanLimit('업로드 안전 한도 제한', val.message || '업로드 제한 초과');
      } else {
        alert(val.message);
      }
      return false;
    }

    uploadTimestampsRef.current.push(now);
    todayUploadsRef.current.count += 1;
    return true;
  };

  /**
   * 핵심 파일 파싱 및 프로젝트/시트 데이터 적재 파이프라인
   */
  const processFile = async (
    file: File,
    mode: 'new_document' | 'new_sheet' | 'append_rows',
    customPrompt?: string,
    bypassDup = false,
    targetSheetIndex?: number
  ) => {
    setPendingUploadFile(null);

    // 1. 동일 내용 파일(SHA-256 지문 또는 파일명+용량) 중복 감지 인터셉트
    if (!bypassDup && currentProject) {
      const fileHash = await computeFileHash(file);

      // 🌟 현재 살아있는 유효한 시트들에 실제로 연결되어 있는 파일들만 수집 (삭제된 시트의 파일 제외)
      const validFileUids = new Set<string>();
      const validFileIds = new Set<number>();
      const validFileNames = new Set<string>();

      for (const s of currentProject.sheets || []) {
        for (const f of s.originalFiles || []) {
          if (f.uid) validFileUids.add(f.uid);
          if (f.id && !isNaN(Number(f.id))) validFileIds.add(Number(f.id));
          if (f.name) validFileNames.add(f.name.trim());
        }
        for (const r of s.rows || []) {
          if (r._fileUid) validFileUids.add(String(r._fileUid));
          if (r._fileId && !isNaN(Number(r._fileId))) validFileIds.add(Number(r._fileId));
          if (r._fileName) validFileNames.add(String(r._fileName).trim());
        }
      }

      const activeProjectDocs = (currentProject.originalFiles || []).filter((f) => {
        if (f.uid && validFileUids.has(f.uid)) return true;
        if (f.id && !isNaN(Number(f.id)) && validFileIds.has(Number(f.id))) return true;
        if (f.name && validFileNames.has(f.name.trim())) return true;
        return false;
      });

      const allOriginalDocs: OriginalDocFile[] = [
        ...activeProjectDocs,
        ...(currentProject.sheets || []).flatMap((s) => s.originalFiles || []),
      ];
      const existing = allOriginalDocs.find((f) => {
        const existingHash = f.hash || (f as any).fileHash;
        if (existingHash && fileHash) {
          return existingHash === fileHash;
        }
        return f.name === file.name && f.size === file.size;
      });
      if (existing) {
        setDuplicateWarning({
          existingFile: existing,
          newFile: file,
          mode,
          prompt: customPrompt,
          targetSheetIndex,
        });
        return;
      }
    }

    // 롤백(Undo)을 위해 직전 projects 상태 스냅샷 저장
    const snapshotBeforeUpload: ProjectWorkspace[] = JSON.parse(JSON.stringify(projects));

    setIsProcessing(true);
    setStorageProgress(0);
    const fileBlobUrl = URL.createObjectURL(file);
    const nowKst = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    try {
      // 🌟 Base64 데이터 URL 사전 캐싱 (브라우저 세션 만료 및 F5 새로고침 영구 방어)
      let fileBase64 = '';
      try {
        const reader = new FileReader();
        fileBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch (e) {
        console.warn('Base64 캐싱 실패:', e);
      }

      const effectiveDestSheet =
        currentProject && targetSheetIndex !== undefined
          ? currentProject.sheets[targetSheetIndex]
          : currentSheet;

      // 🌟 대상 시트에 이미 데이터 행이 존재하는 경우에만 기존 컬럼 스키마를 강제함.
      // 빈 시트(rows가 0개)인 경우에는 업로드되는 새 파일 본연의 컬럼을 채택하도록 undefined 전달!
      const isDestSheetEmpty = !effectiveDestSheet?.rows || effectiveDestSheet.rows.length === 0;

      const targetHeaders =
        mode === 'append_rows' && effectiveDestSheet?.headers?.length && !isDestSheetEmpty
          ? effectiveDestSheet.headers
          : undefined;

      // 2. 대상 시트 전용 AI 규칙과 사용자 임시 프롬프트 결합
      const combinedPrompt = [
        effectiveDestSheet?.customPrompt?.trim(),
        customPrompt?.trim(),
      ].filter(Boolean).join('\n\n');

      const sampleRows =
        mode === 'append_rows' && effectiveDestSheet?.rows?.length
          ? (effectiveDestSheet.rows || []).slice(-3).map((row) => {
              const clean: Record<string, any> = {};
              for (const [k, v] of Object.entries(row)) {
                if (!k.startsWith('_') && k !== '일련번호' && k !== '등록일시' && v !== '' && v !== null && v !== undefined) {
                  clean[k] = v;
                }
              }
              return clean;
            }).filter((r) => Object.keys(r).length > 0)
          : undefined;

      // 2. 클라이언트 사이드 파일 파싱 (엑셀은 자체 파싱, PDF/이미지는 AI OCR)
      const { sheets: parsedSheets, category } = await parseFileOnClient(
        file,
        setProcessStatus,
        combinedPrompt || undefined,
        targetHeaders,
        sampleRows
      );

      // 3. 이지데스크 영구 스토리지 및 DB 연동 (file_data 컬럼에 Base64 영구 적재)
      setProcessStatus('이지데스크 My DB에 레코드 생성 중...');
      const fileId = await createUploadedFileRecord(file, category, fileBase64 || undefined);

      if (fileId) {
        setProcessStatus('sheet_rows 테이블에 데이터 영구 적재 중...');
        const totalRows = parsedSheets.reduce((sum, s) => sum + s.rows.length, 0);
        await updateFileParseResult(fileId, parsedSheets.map((s) => s.name), totalRows, category);

        for (const sheet of parsedSheets) {
          await saveParsedSheetRows(fileId, sheet.name, sheet.rows, category);
        }

        try {
          await uploadToEgdeskStorage(fileId, file, ({ sentBytes, totalBytes }) => {
            setStorageProgress(Math.round((sentBytes / totalBytes) * 100));
          });
        } catch (e) {
          console.warn('스토리지 청크 업로드 건너뜀:', e);
        }
      }

      // 4. 고유 UID 발급, 중복 파일명 자동 넘버링 및 영구 URL 바인딩
      const fileHash = await computeFileHash(file);
      const existingDocNames = (currentProject?.originalFiles || []).map((f) => f.name);
      const resolvedFileName = getUniqueFileName(existingDocNames, file.name);
      const fileUid = generateFileUid();

      // 영구 접근 URL: DB ID가 있으면 /api/files/:id 우선, 없으면 Base64, 마지막이 blob URL
      const permanentUrl = fileId ? `/api/files/${fileId}` : (fileBase64 || fileBlobUrl);

      const docItem: OriginalDocFile = {
        id: fileId || undefined,
        uid: fileUid,
        hash: fileHash,
        name: resolvedFileName,
        url: permanentUrl,
        dataUrl: fileBase64 || undefined,
        type: file.type,
        size: file.size,
        uploadedAt: nowKst,
      };

      let recordedRowCount = 0;
      let recordedSheetName = '';

      // 5. 대상 프로젝트 업데이트 객체 사전 계산 (비동기 상태 클로저 이슈 완전 해결)
      let projectToSave: ProjectWorkspace;
      let newActiveIndex = activeProjectIndex;

      if (mode === 'append_rows' && projects[activeProjectIndex]) {
        const proj = JSON.parse(JSON.stringify(projects[activeProjectIndex])) as ProjectWorkspace;
        const s = [...proj.sheets];
        const destIdx = targetSheetIndex !== undefined ? targetSheetIndex : proj.activeSheetIndex;
        const target = s[destIdx] || s[0];
        const isTargetEmpty = !target.rows?.length;

        // 🌟 빈 시트에 첫 업로드인 경우, 기존 임시 컬럼을 버리고 파싱된 파일의 실제 컬럼을 100% 채택!
        const parsedHeaders = parsedSheets[0]?.headers || [];
        const fixedHeaders = isTargetEmpty && parsedHeaders.length > 0
          ? parsedHeaders
          : (target.headers?.length ? target.headers : parsedHeaders);

        if (isTargetEmpty) {
          const tr = truncateRowsToLimit(plan, 0, parsedSheets[0]?.rows || []);
          recordedRowCount = tr.rows.length;

          // 기본 'SheetN' 이름인 경우 파싱된 원본 시트명이나 카테고리로 가독성 있게 자동 업그레이드
          const isGenericSheetName = /^Sheet\d+$/i.test(target.name);
          const newSheetName = isGenericSheetName && parsedSheets[0]?.name && !/^Sheet\d+$/i.test(parsedSheets[0].name)
            ? parsedSheets[0].name
            : target.name;
          recordedSheetName = newSheetName;

          s[destIdx] = {
            ...target,
            name: newSheetName,
            headers: fixedHeaders,
            originalFiles: [...(target.originalFiles || []), docItem],
            rows: tr.rows.map((r) => ({
              ...r,
              _fileId: fileId,
              _fileUid: fileUid,
              _fileName: resolvedFileName,
            })),
          };
        } else {
          const rawIncoming = parsedSheets.flatMap((sh) => sh.rows);
          const tr = truncateRowsToLimit(plan, target.rows.length, rawIncoming);
          recordedRowCount = tr.rows.length;
          recordedSheetName = target.name;

          const mappedRows = tr.rows.map((row, i) => {
            const cleanRow: Record<string, any> = {};
            for (const h of fixedHeaders) {
              cleanRow[h] = row[h] !== undefined && row[h] !== null ? row[h] : '';
            }
            const extra = Object.entries(row)
              .filter(([k]) => !fixedHeaders.includes(k) && !k.startsWith('_'))
              .map(([k, v]) => `[${k}] ${v}`)
              .join(' | ');

            if (extra && fixedHeaders.includes('비고')) {
              cleanRow['비고'] = cleanRow['비고'] ? `${cleanRow['비고']} | ${extra}` : extra;
            }
            cleanRow['일련번호'] = target.rows.length + i + 1;
            cleanRow['등록일시'] = cleanRow['등록일시'] || row.등록일시 || nowKst;
            cleanRow._fileId = fileId;
            cleanRow._fileUid = fileUid;
            cleanRow._fileName = resolvedFileName;
            return cleanRow;
          });

          s[destIdx] = {
            ...target,
            headers: fixedHeaders,
            rows: [...target.rows, ...mappedRows],
            originalFiles: [...(target.originalFiles || []), docItem],
          };
        }

        const prevDocs = proj.originalFiles || (proj.originalFileUrl ? [{
          uid: generateFileUid(),
          name: proj.name || '기존 문서',
          url: proj.originalFileUrl,
          type: proj.originalFileType,
          size: proj.originalFileSize,
          uploadedAt: proj.uploadedAt,
        }] : []);

        proj.originalFiles = [...prevDocs, docItem];
        proj.originalFileUrl = permanentUrl;
        proj.originalFileType = file.type;
        proj.originalFileSize = file.size;
        proj.sheets = s;
        proj.activeSheetIndex = destIdx;
        projectToSave = proj;

      } else if (mode === 'new_sheet' && projects[activeProjectIndex]) {
        const proj = JSON.parse(JSON.stringify(projects[activeProjectIndex])) as ProjectWorkspace;
        const check = checkSheetLimit(plan, proj.sheets.length);
        if (!check.allowed) {
          if (onPlanLimit) onPlanLimit('시트 생성 한도 도달', check.message);
          else alert(check.message);
          return;
        }

        const incomingSheets = parsedSheets.map((sh) => ({
          ...sh,
          originalFiles: [docItem],
          rows: truncateRowsToLimit(plan, 0, sh.rows).rows.map((r) => ({
            ...r,
            _fileId: fileId,
            _fileUid: fileUid,
            _fileName: resolvedFileName,
          })),
        }));

        recordedRowCount = incomingSheets.reduce((sum, s) => sum + s.rows.length, 0);
        recordedSheetName = incomingSheets[0]?.name || '새 시트';

        proj.sheets = [...proj.sheets, ...incomingSheets];
        proj.activeSheetIndex = proj.sheets.length - 1;
        proj.originalFiles = [...(proj.originalFiles || []), docItem];
        proj.originalFileUrl = permanentUrl;
        projectToSave = proj;

      } else {
        const enrichedSheets = parsedSheets.map((sh) => ({
          ...sh,
          originalFiles: [docItem],
          rows: truncateRowsToLimit(plan, 0, sh.rows).rows.map((r) => ({
            ...r,
            _fileId: fileId,
            _fileUid: fileUid,
            _fileName: resolvedFileName,
          })),
        }));

        recordedRowCount = enrichedSheets.reduce((sum, s) => sum + s.rows.length, 0);
        recordedSheetName = enrichedSheets[0]?.name || 'Sheet1';

        projectToSave = {
          id: null,
          filename: resolvedFileName,
          name: resolvedFileName.replace(/\.[^/.]+$/, ''),
          category,
          sheets: enrichedSheets,
          activeSheetIndex: 0,
          originalFileUrl: permanentUrl,
          originalFileType: file.type,
          originalFileSize: file.size,
          originalFiles: [docItem],
          uploadedAt: nowKst,
        };
        newActiveIndex = projects.length;
      }

      // 5-1. 실제 물리 DB에 즉시 영구 저장 실행 (새로고침 시 데이터 증발 원천 차단)
      const targetPhone = phoneNumber || (process.env.NODE_ENV === 'development' ? '010-7216-5884' : '');
      if (targetPhone) {
        setProcessStatus('물리 DB에 데이터 영구 커밋 중...');
        try {
          const savedId = await saveUserProjectToDb(targetPhone, projectToSave);
          if (savedId) {
            projectToSave.id = savedId;
          }
        } catch (err) {
          console.error('[useFileUpload] 즉시 저장 실패:', err);
        }
      }

      // 5-2. 화면 React 상태 및 로컬 스토리지에 동기화
      setProjects((prev) => {
        const next = [...prev];
        if (mode === 'append_rows' || mode === 'new_sheet') {
          if (next[activeProjectIndex]) {
            next[activeProjectIndex] = projectToSave;
          } else {
            next.push(projectToSave);
          }
        } else {
          next.push(projectToSave);
        }
        try {
          const sanitized = next.map((p) => ({
            ...p,
            originalFiles: (p.originalFiles || []).map(({ dataUrl, ...rest }) => rest),
          }));
          localStorage.setItem('filetosheet_guest_projects', JSON.stringify(sanitized));
        } catch {}
        return next;
      });

      if (mode === 'new_document') {
        setActiveProjectIndex(newActiveIndex);
      }

      // 6. 업로드 직후 실행 취소(Undo) 토스트 활성화
      setLastUploadAction({
        fileUid,
        fileName: resolvedFileName,
        rowCount: recordedRowCount,
        sheetName: recordedSheetName,
        mode,
        snapshot: snapshotBeforeUpload,
      });

    } catch (err: any) {
      alert(`파일 처리 실패: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
      setStorageProgress(0);
    }
  };

  // 1-Click 실행 취소 (Undo)
  const undoLastUpload = () => {
    if (!lastUploadAction) return;
    setProjects(lastUploadAction.snapshot);
    const fname = lastUploadAction.fileName;
    setLastUploadAction(null);
    alert(`방금 업로드된 '${fname}' 파일 데이터가 성공적으로 실행 취소(롤백)되었습니다.`);
  };

  const dismissUndoToast = useCallback(() => {
    setLastUploadAction(null);
  }, []);

  const confirmProceedDuplicate = () => {
    if (!duplicateWarning) return;
    const { newFile, mode, prompt, targetSheetIndex } = duplicateWarning;
    setDuplicateWarning(null);
    processFile(newFile, mode, prompt, true, targetSheetIndex);
  };

  const handleFileDropOrSelect = (file: File) => {
    if (!checkSafety(file)) return;
    if (projects.length === 0) processFile(file, 'new_document');
    else setPendingUploadFile(file);
  };

  const handleDropDirectlyToTable = (file: File) => {
    if (!checkSafety(file)) return;
    if (projects.length === 0) processFile(file, 'new_document');
    else processFile(file, 'append_rows');
  };

  return {
    isProcessing,
    processStatus,
    storageProgress,
    pendingUploadFile,
    setPendingUploadFile,
    initialPrompt,
    setInitialPrompt,
    processFile,
    handleFileDropOrSelect,
    handleDropDirectlyToTable,
    duplicateWarning,
    setDuplicateWarning,
    confirmProceedDuplicate,
    lastUploadAction,
    undoLastUpload,
    dismissUndoToast,
  };
}
