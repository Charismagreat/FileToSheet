'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

export interface LastUploadInfo {
  fileUid: string;
  fileName: string;
  rowCount: number;
  sheetName: string;
  mode: 'append_rows' | 'new_sheet' | 'new_document';
}

interface UploadUndoToastProps {
  uploadInfo: LastUploadInfo | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UploadUndoToast({ uploadInfo, onUndo, onDismiss }: UploadUndoToastProps) {
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!uploadInfo) return;
    setTimeLeft(10);

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    const dismissTimeout = setTimeout(() => {
      onDismissRef.current();
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(dismissTimeout);
    };
  }, [uploadInfo]);

  if (!uploadInfo) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/60 p-4 max-w-md w-full flex items-center gap-3 backdrop-blur-md">
        {/* 성공 아이콘 */}
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5" />
        </div>

        {/* 텍스트 안내 */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold text-slate-100 truncate">
              '{uploadInfo.fileName}'
            </span>
            <span className="text-[10px] bg-slate-800 text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-slate-700 shrink-0">
              +{uploadInfo.rowCount}행
            </span>
          </div>
          <p className="text-[11px] text-slate-300 truncate mt-0.5">
            <span className="text-blue-400 font-semibold">[{uploadInfo.sheetName}]</span> 시트에 적재되었습니다.
          </p>
        </div>

        {/* 실행 취소(Undo) 버튼 */}
        <button
          type="button"
          onClick={onUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-xs transition transform active:scale-95 shrink-0"
          title="잘못 올린 경우 방금 업로드된 데이터를 이전 상태로 즉시 롤백합니다"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>실행 취소 ({timeLeft}s)</span>
        </button>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 p-1 shrink-0"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
