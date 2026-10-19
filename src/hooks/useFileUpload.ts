'use client';

import { useState, useRef } from 'react';
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
  plan?: string;
  onPlanLimit?: (title: string, reason: string) => void;
}

export function useFileUpload({
  projects,
  setProjects,
  activeProjectIndex,
  setActiveProjectIndex,
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
      const allOriginalDocs: OriginalDocFile[] = [
        ...(currentProject.originalFiles || []),
        ...(currentProject.sheets || []).flatMap((s) => s.originalFiles || []),
      ];
      const existing = allOriginalDocs.find(
        (f) =>
          (f.hash && f.hash === fileHash) ||
          ((f as any).fileHash && (f as any).fileHash === fileHash) ||
          (f.name === file.name && f.size === file.size)
      );
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
      const effectiveDestSheet =
        currentProject && targetSheetIndex !== undefined
          ? currentProject.sheets[targetSheetIndex]
          : currentSheet;

      const targetHeaders =
        mode === 'append_rows' && effectiveDestSheet?.headers?.length
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

      // 3. 이지데스크 영구 스토리지 및 DB 연동
      setProcessStatus('이지데스크 My DB에 레코드 생성 중...');
      const fileId = await createUploadedFileRecord(file, category);

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

      // 4. 고유 UID 발급, 중복 파일명 자동 넘버링 및 SHA-256 지문 저장
      const fileHash = await computeFileHash(file);
      const existingDocNames = (currentProject?.originalFiles || []).map((f) => f.name);
      const resolvedFileName = getUniqueFileName(existingDocNames, file.name);
      const fileUid = generateFileUid();

      const docItem: OriginalDocFile = {
        id: fileId || undefined,
        uid: fileUid,
        hash: fileHash,
        name: resolvedFileName,
        url: fileBlobUrl,
        type: file.type,
        size: file.size,
        uploadedAt: nowKst,
      };

      let recordedRowCount = 0;
      let recordedSheetName = '';

      // 5. 프로젝트 및 시트 상태 업데이트 (모드별 분기)
      setProjects((prev) => {
        const next = [...prev];

        // [모드 A] 지정된 시트(또는 현재 시트) 끝에 행 추가 (append_rows)
        if (mode === 'append_rows' && next[activeProjectIndex]) {
          const proj = { ...next[activeProjectIndex] };
          const s = [...proj.sheets];
          const destIdx = targetSheetIndex !== undefined ? targetSheetIndex : proj.activeSheetIndex;
          const target = s[destIdx] || s[0];
          const fixedHeaders =
            target.headers?.length ? target.headers : (parsedSheets[0]?.headers || []);

          if (!target.rows?.length) {
            const tr = truncateRowsToLimit(plan, 0, parsedSheets[0]?.rows || []);
            recordedRowCount = tr.rows.length;
            recordedSheetName = target.name;
            s[destIdx] = {
              ...target,
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

              // 기존 열 스키마에 없는 추가 필드는 '비고'에 보존
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
          proj.originalFileUrl = fileBlobUrl;
          proj.originalFileType = file.type;
          proj.originalFileSize = file.size;
          proj.sheets = s;
          proj.activeSheetIndex = destIdx; // 병합된 시트로 화면 즉시 전환
          next[activeProjectIndex] = proj;

        // [모드 B] 현재 프로젝트 내 새 시트로 생성 (new_sheet)
        } else if (mode === 'new_sheet' && next[activeProjectIndex]) {
          const proj = { ...next[activeProjectIndex] };
          const check = checkSheetLimit(plan, proj.sheets.length);

          if (!check.allowed) {
            if (onPlanLimit) onPlanLimit('시트 생성 한도 도달', check.message);
            else alert(check.message);
            return prev;
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
          next[activeProjectIndex] = proj;

        // [모드 C] 새 프로젝트로 생성 (new_document)
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

          const newProj: ProjectWorkspace = {
            id: fileId ? String(fileId) : Date.now().toString(),
            name: resolvedFileName.replace(/\.[^/.]+$/, ''),
            category,
            sheets: enrichedSheets,
            activeSheetIndex: 0,
            originalFileUrl: fileBlobUrl,
            originalFileType: file.type,
            originalFileSize: file.size,
            originalFiles: [docItem],
            uploadedAt: nowKst,
          };

          next.push(newProj);
          setActiveProjectIndex(next.length - 1);
        }

        return next;
      });

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

  const dismissUndoToast = () => {
    setLastUploadAction(null);
  };

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
