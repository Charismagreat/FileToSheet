'use client';

import { useState } from 'react';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';
import { parseFileOnClient } from '@/lib/file-parser-client';
import {
  createUploadedFileRecord,
  uploadToEgdeskStorage,
  updateFileParseResult,
  saveParsedSheetRows,
} from '@/lib/egdesk-db';

interface UseFileUploadOptions {
  projects: ProjectWorkspace[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectWorkspace[]>>;
  activeProjectIndex: number;
  setActiveProjectIndex: (idx: number) => void;
}

export function useFileUpload({
  projects,
  setProjects,
  activeProjectIndex,
  setActiveProjectIndex,
}: UseFileUploadOptions) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [storageProgress, setStorageProgress] = useState<number>(0);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  const handleFileDropOrSelect = (file: File) => {
    if (!file) return;
    if (projects.length > 0 && currentSheet) setPendingUploadFile(file);
    else processFile(file, 'new_document');
  };

  const handleDropDirectlyToTable = (file: File) => {
    if (!file) return;
    processFile(file, 'append_rows');
  };

  const processFile = async (file: File, mode: 'new_document' | 'new_sheet' | 'append_rows') => {
    setPendingUploadFile(null);
    setIsProcessing(true);
    setStorageProgress(0);
    const fileBlobUrl = URL.createObjectURL(file);
    const nowKst = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

    try {
      const { sheets: parsedSheets, category } = await parseFileOnClient(file, setProcessStatus);
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

      const docItem: OriginalDocFile = {
        id: fileId || undefined,
        name: file.name,
        url: fileBlobUrl,
        type: file.type,
        size: file.size,
        uploadedAt: nowKst,
      };

      setProjects((prev) => {
        const next = [...prev];
        if (mode === 'append_rows' && next[activeProjectIndex]) {
          const proj = { ...next[activeProjectIndex] };
          const s = [...proj.sheets];
          const target = s[proj.activeSheetIndex];
          if (!target.rows || target.rows.length === 0) {
            s[proj.activeSheetIndex] = {
              ...target,
              headers: parsedSheets[0]?.headers || target.headers,
              rows: (parsedSheets[0]?.rows || []).map((r) => ({ ...r, _fileId: fileId, _fileName: file.name })),
            };
          } else {
            const incoming = parsedSheets.flatMap((sh) => sh.rows);
            const curSet = new Set(target.headers);
            const mergedH = [...target.headers, ...parsedSheets.flatMap((sh) => sh.headers).filter((h) => !curSet.has(h))];
            s[proj.activeSheetIndex] = {
              ...target,
              headers: mergedH,
              rows: [...target.rows, ...incoming.map((r, i) => ({ ...r, 일련번호: target.rows.length + i + 1, 등록일시: r.등록일시 || nowKst, _fileId: fileId, _fileName: file.name }))],
            };
          }
          const prevDocs = proj.originalFiles || (proj.originalFileUrl ? [{
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
          next[activeProjectIndex] = proj;
        } else if (mode === 'new_sheet' && next[activeProjectIndex]) {
          const proj = { ...next[activeProjectIndex] };
          proj.sheets = [...proj.sheets, ...parsedSheets.map((sh) => ({ ...sh, rows: sh.rows.map((r) => ({ ...r, _fileId: fileId, _fileName: file.name })) }))];
          proj.activeSheetIndex = proj.sheets.length - 1;
          const prevDocs = proj.originalFiles || [];
          proj.originalFiles = [...prevDocs, docItem];
          next[activeProjectIndex] = proj;
        } else {
          next.push({
            id: fileId,
            name: file.name.replace(/\.[^/.]+$/, ''),
            category,
            sheets: parsedSheets.map((sh) => ({ ...sh, rows: sh.rows.map((r) => ({ ...r, _fileId: fileId, _fileName: file.name })) })),
            activeSheetIndex: 0,
            activeSubTab: 'table',
            originalFileUrl: fileBlobUrl,
            originalFileType: file.type,
            originalFileSize: file.size,
            originalFiles: [docItem],
            uploadedAt: nowKst,
          });
          setActiveProjectIndex(next.length - 1);
        }
        return next;
      });

      setProcessStatus('완료되었습니다!');
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processStatus,
    storageProgress,
    pendingUploadFile,
    setPendingUploadFile,
    handleFileDropOrSelect,
    handleDropDirectlyToTable,
    processFile,
  };
}
