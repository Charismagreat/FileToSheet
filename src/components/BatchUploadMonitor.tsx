'use client';

import React from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Plus,
  Layers,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { BatchQueueItem } from '@/hooks/useBatchUploadQueue';

interface BatchUploadMonitorProps {
  isOpen: boolean;
  isMinimized: boolean;
  setIsMinimized: (val: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  queue: BatchQueueItem[];
  totalCount: number;
  completedCount: number;
  mismatchedCount: number;
  failedCount: number;
  canceledCount?: number;
  duplicateCount?: number;
  inProgressCount: number;
  waitingCount: number;
  totalAddedRows: number;
  isAllFinished: boolean;
  onRetryItem: (itemId: string) => void;
  onCancelItem?: (itemId: string) => void;
  onCancelAll?: () => void;
  onRemoveItem?: (itemId: string) => void;
  onForceUploadItem?: (itemId: string) => void;
  onCreateSheetFromMismatched: (itemId: string) => void;
  onClearFinished: () => void;
}

export function BatchUploadMonitor({
  isOpen,
  isMinimized,
  setIsMinimized,
  onClose,
  queue,
  totalCount,
  completedCount,
  mismatchedCount,
  failedCount,
  canceledCount = 0,
  duplicateCount = 0,
  inProgressCount,
  waitingCount,
  totalAddedRows,
  isAllFinished,
  onRetryItem,
  onCancelItem,
  onCancelAll,
  onRemoveItem,
  onForceUploadItem,
  onCreateSheetFromMismatched,
  onClearFinished,
}: BatchUploadMonitorProps) {
  if (!isOpen || totalCount === 0) return null;

  const doneCount = completedCount + mismatchedCount + failedCount + canceledCount + duplicateCount;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      {/* 1. 모니터링 창 헤더 */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            {inProgressCount > 0 ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black truncate flex items-center gap-1.5">
              <span>스마트 시트 일괄 적재</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white/90">
                {doneCount}/{totalCount}
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* 대기 또는 진행 중인 작업이 있을 때 원클릭 전체 취소 버튼 */}
          {(waitingCount > 0 || inProgressCount > 0) && onCancelAll && (
            <button
              type="button"
              onClick={onCancelAll}
              className="px-2 py-0.5 rounded-md bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border border-rose-400/30 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 active:scale-95"
              title="대기 및 진행 중인 모든 작업을 일괄 취소합니다"
            >
              <X className="w-3 h-3 text-rose-300" />
              <span>전체 취소</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title={isMinimized ? '창 펼치기' : '창 접기'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title="모니터링 창 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. 접혔을 때의 미니 요약 뷰 */}
      {isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100 transition"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">{percent}% 완료</span>
            <span className="text-[11px] text-blue-600 font-mono font-bold">+{totalAddedRows}행 누적</span>
          </div>
          <span className="text-[11px] text-slate-400">클릭하여 펼치기</span>
        </div>
      )}

      {/* 3. 펼쳐진 본문 영역 */}
      {!isMinimized && (
        <>
          {/* 상단 프로그레스 바 & 통계 요약 */}
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                {inProgressCount > 0 ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>AI 시트 자동 분류 진행 중...</span>
                  </>
                ) : isAllFinished ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>일괄 처리 완료!</span>
                  </span>
                ) : (
                  <span>대기 중</span>
                )}
              </span>
              <span className="font-mono font-black text-blue-700 text-xs">{percent}%</span>
            </div>

            {/* 진행률 게이지 바 */}
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* 실시간 적재 요약 뱃지들 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-bold">
                성공 {completedCount}건 (+{totalAddedRows}행)
              </span>
              {mismatchedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 font-bold">
                  양식불일치 {mismatchedCount}건
                </span>
              )}
              {failedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-100/90 text-rose-800 font-bold">
                  오류 {failedCount}건
                </span>
              )}
              {canceledCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold">
                  취소 {canceledCount}건
                </span>
              )}
              {duplicateCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-100/90 text-purple-800 font-bold">
                  중복제외 {duplicateCount}건
                </span>
              )}
              {waitingCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                  대기 {waitingCount}건
                </span>
              )}
            </div>
          </div>

          {/* 파일 큐 리스트 (스크롤 영역) */}
          <div className="flex-1 max-h-64 overflow-y-auto p-2.5 space-y-2 divide-y divide-slate-100">
            {queue.map((item) => {
              return (
                <div key={item.id} className="pt-2 first:pt-0 flex flex-col gap-1.5 group/item">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate" title={item.fileName}>
                          {item.fileName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(item.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    {/* 상태별 우측 인디케이터 및 취소 버튼 */}
                    <div className="shrink-0 flex items-center gap-1">
                      {item.status === 'waiting' && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                            대기
                          </span>
                          {onCancelItem && (
                            <button
                              type="button"
                              onClick={() => onCancelItem(item.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="대기 작업 취소"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      {(item.status === 'uploading' || item.status === 'analyzing') && (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{item.status === 'uploading' ? '업로드' : 'AI 분석'}</span>
                          </div>
                          {onCancelItem && (
                            <button
                              type="button"
                              onClick={() => onCancelItem(item.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="분석 중단 및 취소"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      {item.status === 'duplicate' && (
                        <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                          <ShieldAlert className="w-3 h-3 text-purple-600" />
                          <span>중복 제외</span>
                        </div>
                      )}
                      {item.status === 'canceled' && (
                        <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          <span>취소됨</span>
                        </div>
                      )}
                      {item.status === 'success' && (
                        <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>적재 완료</span>
                        </div>
                      )}
                      {item.status === 'mismatched' && (
                        <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>적재 제외</span>
                        </div>
                      )}
                      {item.status === 'failed' && (
                        <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>실패</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 세부 상태 메시지 & 구제/재시도/취소 액션 버튼 */}
                  {item.status === 'success' && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50/60 rounded-lg px-2 py-1 flex items-center justify-between">
                      <span className="truncate">
                        👉 <strong>[{item.matchedSheetName}]</strong> 시트에 적재됨
                      </span>
                      <span className="font-mono font-bold shrink-0">+{item.addedRowCount}행</span>
                    </div>
                  )}

                  {item.status === 'duplicate' && (
                    <div className="text-[11px] bg-purple-50/70 border border-purple-200/70 rounded-lg p-2 flex flex-col gap-1.5">
                      <div className="text-purple-800">
                        🛡️ {item.mismatchReason || item.errorMessage || '동일한 내용의 파일이 이미 시트에 존재하여 중복 적재를 방지했습니다.'}
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] text-purple-600 font-medium">AI 사용량 미차감 (보존됨)</span>
                        <div className="flex items-center gap-1">
                          {onForceUploadItem && (
                            <button
                              type="button"
                              onClick={() => onForceUploadItem(item.id)}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 transition active:scale-95 cursor-pointer shadow-2xs"
                              title="중복 검사를 건너뛰고 강제로 분석하여 적재합니다"
                            >
                              <span>강제 적재</span>
                            </button>
                          )}
                          {onRemoveItem && (
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id)}
                              className="p-1 hover:bg-purple-100 text-purple-400 hover:text-purple-700 rounded transition cursor-pointer"
                              title="목록에서 제거"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {item.status === 'canceled' && (
                    <div className="text-[11px] bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex items-center justify-between gap-1">
                      <span className="text-slate-500 truncate" title={item.errorMessage}>
                        {item.errorMessage || '작업이 취소되었습니다.'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRetryItem(item.id)}
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>재시도</span>
                        </button>
                        {onRemoveItem && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="목록에서 제거"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {item.status === 'mismatched' && (
                    <div className="text-[11px] bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 flex flex-col gap-1.5">
                      <div className="text-amber-800">
                        ⚠️ {item.mismatchReason || '기존 시트의 데이터 양식과 일치하지 않습니다.'}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => onCreateSheetFromMismatched(item.id)}
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>새 시트로 독립 생성</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {item.status === 'failed' && (
                    <div className="text-[11px] bg-rose-50/70 border border-rose-200/70 rounded-lg p-2 flex items-center justify-between gap-1">
                      <span className="text-rose-700 truncate" title={item.errorMessage}>
                        {item.errorMessage || '문서 분석에 실패했습니다.'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRetryItem(item.id)}
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>재시도</span>
                        </button>
                        {onRemoveItem && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 hover:bg-rose-100 text-rose-400 hover:text-rose-700 rounded transition cursor-pointer"
                            title="목록에서 제거"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 하단 푸터 액션 */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {isAllFinished ? '모든 작업 완료' : '백그라운드에서 자동 적재 중'}
            </span>
            <div className="flex items-center gap-1.5">
              {(completedCount > 0 || canceledCount > 0 || duplicateCount > 0) && (
                <button
                  type="button"
                  onClick={onClearFinished}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-200/60 transition cursor-pointer"
                  title="완료, 취소 및 중복 제외 항목 목록 정리"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>완료/정리</span>
                </button>
              )}
              {isAllFinished && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  닫기
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
