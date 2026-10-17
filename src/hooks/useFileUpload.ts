'use client';

import { useState, useRef } from 'react';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';
import { parseFileOnClient } from '@/lib/file-parser-client';
import { createUploadedFileRecord, uploadToEgdeskStorage, updateFileParseResult, saveParsedSheetRows } from '@/lib/egdesk-db';
import { getPlanLimits, checkSheetLimit, truncateRowsToLimit, validateUploadFile } from '@/lib/plan-limits';
import { generateFileUid, getUniqueFileName, computeFileHash } from '@/lib/sheet-helpers';

interface UseFileUploadOptions {
  projects: ProjectWorkspace[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
  setActiveProjectIndex: (idx: number) => void;
  plan?: string;
  onPlanLimit?: (title: string, reason: string) => void;
}

export function useFileUpload({
  projects, setProjects, activeProjectIndex, setActiveProjectIndex, plan, onPlanLimit,
}: UseFileUploadOptions) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [storageProgress, setStorageProgress] = useState<number>(0);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [duplicateWarning, setDuplicateWarning] = useState<{ existingFile: OriginalDocFile; newFile: File; mode: 'new_document' | 'new_sheet' | 'append_rows'; prompt?: string } | null>(null);
  const uploadTimestampsRef = useRef<number[]>([]);
  const todayUploadsRef = useRef<{ date: string; count: number }>({ date: '', count: 0 });

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  const checkSafety = (file: File): boolean => {
    const now = Date.now(), today = new Date().toISOString().slice(0, 10);
    if (todayUploadsRef.current.date !== today) todayUploadsRef.current = { date: today, count: 0 };
    uploadTimestampsRef.current = uploadTimestampsRef.current.filter((t) => now - t < 60000);
    const val = validateUploadFile(plan, file, uploadTimestampsRef.current.length, todayUploadsRef.current.count);
    if (!val.allowed) {
      if (onPlanLimit) onPlanLimit('업로드 안전 한도 제한', val.message || '업로드 제한 초과');
      else alert(val.message);
      return false;
    }
    uploadTimestampsRef.current.push(now);
    todayUploadsRef.current.count += 1;
    return true;
  };

  const processFile = async (file: File, mode: 'new_document' | 'new_sheet' | 'append_rows', customPrompt?: string, bypassDup = false) => {
    setPendingUploadFile(null);
    if (!bypassDup && currentProject) {
      const fileHash = await computeFileHash(file);
      const existing = (currentProject.originalFiles || []).find((f) => f.hash === fileHash);
      if (existing) return setDuplicateWarning({ existingFile: existing, newFile: file, mode, prompt: customPrompt });
    }

    setIsProcessing(true);
    setStorageProgress(0);
    const fileBlobUrl = URL.createObjectURL(file);
    const nowKst = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

    try {
      const targetHeaders = mode === 'append_rows' && currentSheet?.headers?.length ? currentSheet.headers : undefined;
      const { sheets: parsedSheets, category } = await parseFileOnClient(file, setProcessStatus, customPrompt, targetHeaders);

      setProcessStatus('이지데스크 My DB에 레코드 생성 중...');
      const fileId = await createUploadedFileRecord(file, category);
      if (fileId) {
        setProcessStatus('sheet_rows 테이블에 데이터 영구 적재 중...');
        const totalRows = parsedSheets.reduce((sum, s) => sum + s.rows.length, 0);
        await updateFileParseResult(fileId, parsedSheets.map((s) => s.name), totalRows, category);
        for (const sheet of parsedSheets) await saveParsedSheetRows(fileId, sheet.name, sheet.rows, category);
        try {
          await uploadToEgdeskStorage(fileId, file, ({ sentBytes, totalBytes }) => setStorageProgress(Math.round((sentBytes / totalBytes) * 100)));
        } catch (e) { console.warn('스토리지 업로드 건너뜀:', e); }
      }

      const fileHash = await computeFileHash(file);
      const existingDocNames = (currentProject?.originalFiles || []).map((f) => f.name);
      const resolvedFileName = getUniqueFileName(existingDocNames, file.name);
      const fileUid = generateFileUid();
      const docItem: OriginalDocFile = {
        id: fileId || undefined, uid: fileUid, hash: fileHash, name: resolvedFileName,
        url: fileBlobUrl, type: file.type, size: file.size, uploadedAt: nowKst,
      };

      setProjects((prev) => {
        const next = [...prev];
        if (mode === 'append_rows' && next[activeProjectIndex]) {
          const proj = { ...next[activeProjectIndex] };
          const s = [...proj.sheets];
          const target = s[proj.activeSheetIndex];
          const fixedHeaders = target.headers?.length ? target.headers : (parsedSheets[0]?.headers || []);

          if (!target.rows?.length) {
            const tr = truncateRowsToLimit(plan, 0, parsedSheets[0]?.rows || []);
            s[proj.activeSheetIndex] = {
              ...target, headers: fixedHeaders, originalFiles: [...(target.originalFiles || []), docItem],
              rows: tr.rows.map((r) => ({ ...r, _fileId: fileId, _fileUid: fileUid, _fileName: resolvedFileName })),
            };
          } else {
            const rawIncoming = parsedSheets.flatMap((sh) => sh.rows);
            const tr = truncateRowsToLimit(plan, target.rows.length, rawIncoming);
            const mappedRows = tr.rows.map((row, i) => {
              const cleanRow: Record<string, any> = {};
              for (const h of fixedHeaders) cleanRow[h] = row[h] ?? '';
              const extra = Object.entries(row).filter(([k]) => !fixedHeaders.includes(k) && !k.startsWith('_')).map(([k, v]) => `[${k}] ${v}`).join(' | ');
              if (extra && fixedHeaders.includes('비고')) cleanRow['비고'] = cleanRow['비고'] ? `${cleanRow['비고']} | ${extra}` : extra;
              cleanRow['일련번호'] = target.rows.length + i + 1;
              cleanRow['등록일시'] = cleanRow['등록일시'] || row.등록일시 || nowKst;
              cleanRow._fileId = fileId; cleanRow._fileUid = fileUid; cleanRow._fileName = resolvedFileName;
              return cleanRow;
            });
            s[proj.activeSheetIndex] = {
              ...target, headers: fixedHeaders, rows: [...target.rows, ...mappedRows],
              originalFiles: [...(target.originalFiles || []), docItem],
            };
          }

          const prevDocs = proj.originalFiles || (proj.originalFileUrl ? [{
            uid: generateFileUid(), name: proj.name || '기존 문서', url: proj.originalFileUrl, type: proj.originalFileType, size: proj.originalFileSize, uploadedAt: proj.uploadedAt,
          }] : []);
          proj.originalFiles = [...prevDocs, docItem]; proj.originalFileUrl = fileBlobUrl;
          proj.originalFileType = file.type; proj.originalFileSize = file.size; proj.sheets = s;
          next[activeProjectIndex] = proj;

        } else if (mode === 'new_sheet' && next[activeProjectIndex]) {
          const proj = { ...next[activeProjectIndex] };
          const check = checkSheetLimit(plan, proj.sheets.length);
          if (!check.allowed) {
            if (onPlanLimit) onPlanLimit('시트 생성 한도 도달', check.message);
            else alert(check.message);
            return prev;
          }
          const incomingSheets = parsedSheets.map((sh) => ({
            ...sh, originalFiles: [docItem],
            rows: truncateRowsToLimit(plan, 0, sh.rows).rows.map((r) => ({ ...r, _fileId: fileId, _fileUid: fileUid, _fileName: resolvedFileName })),
          }));
          proj.sheets = [...proj.sheets, ...incomingSheets]; proj.activeSheetIndex = proj.sheets.length - 1;
          proj.originalFiles = [...(proj.originalFiles || []), docItem]; next[activeProjectIndex] = proj;
        } else {
          const maxSheets = getPlanLimits(plan).maxSheetsPerProject;
          const createdSheets = parsedSheets.slice(0, maxSheets).map((sh) => ({
            ...sh, originalFiles: [docItem],
            rows: truncateRowsToLimit(plan, 0, sh.rows).rows.map((r) => ({ ...r, _fileId: fileId, _fileUid: fileUid, _fileName: resolvedFileName })),
          }));
          next.push({
            id: null, name: resolvedFileName.replace(/\.[^/.]+$/, ''), category, sheets: createdSheets,
            activeSheetIndex: 0, activeSubTab: 'table', originalFileUrl: fileBlobUrl, originalFileType: file.type,
            originalFileSize: file.size, originalFiles: [docItem], uploadedAt: nowKst,
          });
          setActiveProjectIndex(next.length - 1);
        }
        return next;
      });
    } catch (err: any) {
      console.error('파일 처리 실패:', err);
      alert(`파일 처리 중 오류가 발생했습니다: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setIsProcessing(false); setProcessStatus(''); setStorageProgress(0);
    }
  };

  const confirmProceedDuplicate = () => {
    if (!duplicateWarning) return;
    const { newFile, mode, prompt } = duplicateWarning;
    setDuplicateWarning(null);
    processFile(newFile, mode, prompt, true);
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
    isProcessing, processStatus, storageProgress, pendingUploadFile, setPendingUploadFile,
    initialPrompt, setInitialPrompt, processFile, handleFileDropOrSelect, handleDropDirectlyToTable,
    duplicateWarning, setDuplicateWarning, confirmProceedDuplicate,
  };
}
