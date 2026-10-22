'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, Table as TableIcon } from 'lucide-react';

interface DeleteSheetModalProps {
  isOpen: boolean;
  sheetName: string;
  rowCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteSheetModal({
  isOpen,
  sheetName,
  rowCount,
  onClose,
  onConfirm,
}: DeleteSheetModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150">
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5 text-rose-600 font-bold text-sm">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <span>시트 삭제 확인</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              <TableIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900 truncate text-sm">
                {sheetName}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold font-mono text-xs shrink-0">
              {rowCount}개 행 보관 중
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-900 text-sm">
              이 시트에는 <span className="text-rose-600 font-bold">{rowCount}개의 데이터 행</span>이 포함되어 있습니다.
            </p>
            <p>
              시트를 삭제하면 적재된 표 데이터와 연관된 전용 증빙 파일이 함께 정리되며, <strong>삭제된 데이터는 복구할 수 없습니다.</strong>
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
            <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
            <span>
              정말 이 시트를 삭제하시겠습니까? 작업을 계속하려면 <strong>[시트 삭제]</strong>를 누르세요.
            </span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>시트 삭제</span>
          </button>
        </div>
      </div>
    </div>
  );
}
