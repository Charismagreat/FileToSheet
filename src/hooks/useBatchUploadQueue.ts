'use client';

import { useState, useRef, useCallback } from 'react';
import { ProjectWorkspace, OriginalDocFile, ParsedSheet } from '@/types/workspace';
import { computeFileHash } from '@/lib/sheet-helpers';
import { truncateRowsToLimit } from '@/lib/plan-limits';
import { UserPlan } from '@/types/auth';

export interface BatchQueueItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  status: 'waiting' | 'uploading' | 'analyzing' | 'success' | 'mismatched' | 'failed';
  progress: number;
  matchedSheetIndex?: number;
  matchedSheetName?: string;
  addedRowCount?: number;
  mismatchReason?: string;
  errorMessage?: string;
  parsedData?: {
    category: string;
    sheetName: string;
    headers: string[];
    rows: Record<string, any>[];
    fileBlobUrl: string;
    docItem: OriginalDocFile;
  };
}

interface UseBatchUploadQueueOptions {
  project: ProjectWorkspace | null;
  plan?: UserPlan;
  onPlanLimit?: (title: string, reason: string) => void;
  onItemAppended: (targetSheetIndex: number, newRows: Record<string, any>[], docItem: OriginalDocFile) => void;
  onNewSheetCreated: (newSheet: ParsedSheet, docItem: OriginalDocFile) => void;
}

const CONCURRENCY_LIMIT = 2;

export function useBatchUploadQueue({
  project,
  plan = 'free',
  onPlanLimit,
  onItemAppended,
  onNewSheetCreated,
}: UseBatchUploadQueueOptions) {
  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const isRunningRef = useRef<boolean>(false);
  const activeCountRef = useRef<number>(0);
  const queueRef = useRef<BatchQueueItem[]>([]);
  queueRef.current = queue;

  // 전체 진행 통계 계산
  const totalCount = queue.length;
  const completedCount = queue.filter((i) => i.status === 'success').length;
  const mismatchedCount = queue.filter((i) => i.status === 'mismatched').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;
  const inProgressCount = queue.filter((i) => i.status === 'uploading' || i.status === 'analyzing').length;
  const waitingCount = queue.filter((i) => i.status === 'waiting').length;
  const totalAddedRows = queue.reduce((sum, i) => sum + (i.addedRowCount || 0), 0);
  const isAllFinished = totalCount > 0 && waitingCount === 0 && inProgressCount === 0;

  const updateItem = useCallback((id: string, updates: Partial<BatchQueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  /**
   * 단일 파일 파싱 및 스마트 시트 매칭 워커
   */
  const processQueueItem = useCallback(
    async (item: BatchQueueItem) => {
      const { id, file, fileName } = item;
      const fileUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      try {
        updateItem(id, { status: 'uploading', progress: 15 });

        // 1. 파일 Base64 인코딩 및 Hash 계산
        const fileHash = await computeFileHash(file);
        const fileBlobUrl = URL.createObjectURL(file);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('파일 읽기 실패'));
          reader.readAsDataURL(file);
        });
        const fileBase64 = await base64Promise;

        updateItem(id, { status: 'analyzing', progress: 40 });

        // 2. 현재 프로젝트의 모든 시트 정보 수집 (시트별 자연어 규칙 및 누적 데이터 Few-Shot 예시 포함)
        const existingSheetsPayload = (project?.sheets || []).map((sh, idx) => {
          // 시스템 내부 컬럼(_로 시작) 및 기본 컬럼 제외하고 의미 있는 비즈니스 값만 샘플링
          const cleanSamples = (sh.rows || []).slice(-3).map((row) => {
            const clean: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
              if (!k.startsWith('_') && k !== '일련번호' && k !== '등록일시' && v !== '' && v !== null && v !== undefined) {
                clean[k] = v;
              }
            }
            return clean;
          }).filter((r) => Object.keys(r).length > 0);

          return {
            sheetIndex: idx,
            name: sh.name,
            headers: sh.headers,
            customPrompt: sh.customPrompt,
            sampleRows: cleanSamples,
          };
        });

        // 3. 백엔드 AI 스마트 시트 라우터 호출
        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: fileName,
            fileBase64,
            existingSheets: existingSheetsPayload,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `서버 오류 (${res.status})`);
        }

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || '문서 분석에 실패했습니다.');
        }

        const nowKst = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const docItem: OriginalDocFile = {
          id: fileUid,
          name: fileName,
          url: fileBlobUrl,
          size: file.size,
          type: file.type,
          uploadedAt: nowKst,
          fileHash,
        };

        // 4. 기존 시트 매칭 결과 판별
        if (data.matched) {
          const targetIndex = typeof data.matchedSheetIndex === 'number' && data.matchedSheetIndex >= 0
            ? data.matchedSheetIndex
            : (project?.activeSheetIndex ?? 0);

          const targetSheetName = data.matchedSheetName || project?.sheets[targetIndex]?.name || '시트';

          // 행 데이터에 메타데이터 태깅
          const enrichedRows = (data.rows || []).map((r: any) => ({
            ...r,
            _fileId: fileUid,
            _fileUid: fileUid,
            _fileName: fileName,
          }));

          // 플랜 한도 적용
          const existingRowsCount = project?.sheets[targetIndex]?.rows.length || 0;
          const { rows: allowedRows } = truncateRowsToLimit(plan, existingRowsCount, enrichedRows);

          // 워크스페이스 상태에 즉시 누적 반영
          onItemAppended(targetIndex, allowedRows, docItem);

          updateItem(id, {
            status: 'success',
            progress: 100,
            matchedSheetIndex: targetIndex,
            matchedSheetName: targetSheetName,
            addedRowCount: allowedRows.length,
          });
        } else {
          // 기존 시트 양식 불일치 (적재 제외)
          updateItem(id, {
            status: 'mismatched',
            progress: 100,
            mismatchReason: data.mismatchReason || '기존 시트들과 데이터 양식이 일치하지 않습니다.',
            parsedData: {
              category: data.category || '비정형 문서',
              sheetName: data.sheetName || fileName.replace(/\.[^/.]+$/, ''),
              headers: data.headers || [],
              rows: (data.rows || []).map((r: any) => ({
                ...r,
                _fileId: fileUid,
                _fileUid: fileUid,
                _fileName: fileName,
              })),
              fileBlobUrl,
              docItem,
            },
          });
        }
      } catch (err: any) {
        updateItem(id, {
          status: 'failed',
          progress: 100,
          errorMessage: err?.message || '처리 중 알 수 없는 오류 발생',
        });
      } finally {
        activeCountRef.current = Math.max(0, activeCountRef.current - 1);
        processNext();
      }
    },
    [project, plan, onItemAppended, updateItem]
  );

  /**
   * 큐 순차/병렬 소비 루프 (Concurrency 제어)
   */
  const processNext = useCallback(() => {
    if (activeCountRef.current >= CONCURRENCY_LIMIT) return;

    const nextWaiting = queueRef.current.find((i) => i.status === 'waiting');
    if (!nextWaiting) {
      if (activeCountRef.current === 0) {
        isRunningRef.current = false;
      }
      return;
    }

    activeCountRef.current += 1;
    updateItem(nextWaiting.id, { status: 'uploading', progress: 10 });
    processQueueItem(nextWaiting);

    // Concurrency 여유가 있으면 추가 워커 가동
    if (activeCountRef.current < CONCURRENCY_LIMIT) {
      processNext();
    }
  }, [processQueueItem, updateItem]);

  /**
   * 파일들을 큐에 등록하고 백그라운드 파이프라인 시작
   */
  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (!files || files.length === 0) return;

      const newItems: BatchQueueItem[] = files.map((file, idx) => ({
        id: `${file.name}_${Date.now()}_${idx}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        status: 'waiting',
        progress: 0,
      }));

      setQueue((prev) => [...prev, ...newItems]);
      setIsQueueOpen(true);
      setIsMinimized(false);

      // 다음 틱에서 큐 가동
      setTimeout(() => {
        if (!isRunningRef.current) {
          isRunningRef.current = true;
          processNext();
          processNext(); // 동시 워커 2개 시동
        }
      }, 50);
    },
    [processNext]
  );

  /**
   * 불일치(mismatched) 파일에서 새 시트 생성 액션
   */
  const createSheetFromMismatched = useCallback(
    (itemId: string) => {
      const targetItem = queueRef.current.find((i) => i.id === itemId);
      if (!targetItem || !targetItem.parsedData) return;

      const { headers, rows, sheetName, docItem } = targetItem.parsedData;
      const newSheet: ParsedSheet = {
        name: sheetName,
        headers,
        rows,
        originalFiles: [docItem],
      };

      onNewSheetCreated(newSheet, docItem);

      updateItem(itemId, {
        status: 'success',
        matchedSheetName: sheetName,
        addedRowCount: rows.length,
        mismatchReason: undefined,
      });
    },
    [onNewSheetCreated, updateItem]
  );

  /**
   * 실패 파일 재시도
   */
  const retryItem = useCallback(
    (itemId: string) => {
      updateItem(itemId, {
        status: 'waiting',
        progress: 0,
        errorMessage: undefined,
        mismatchReason: undefined,
      });
      setTimeout(() => {
        if (!isRunningRef.current) {
          isRunningRef.current = true;
          processNext();
        }
      }, 50);
    },
    [processNext, updateItem]
  );

  /**
   * 큐 초기화 / 닫기
   */
  const clearFinished = useCallback(() => {
    setQueue((prev) => prev.filter((i) => i.status !== 'success'));
  }, []);

  const closeQueue = useCallback(() => {
    setIsQueueOpen(false);
  }, []);

  return {
    queue,
    isQueueOpen,
    setIsQueueOpen,
    isMinimized,
    setIsMinimized,
    totalCount,
    completedCount,
    mismatchedCount,
    failedCount,
    inProgressCount,
    waitingCount,
    totalAddedRows,
    isAllFinished,
    enqueueFiles,
    retryItem,
    createSheetFromMismatched,
    clearFinished,
    closeQueue,
  };
}
