'use client';

import React from 'react';
import { AlertTriangle, Trash2, Database, FileText, X } from 'lucide-react';

interface DeleteProofModalProps {
  show: boolean;
  fileName: string;
  onClose: () => void;
  onConfirmDelete: (deleteDataRows: boolean) => void;
}

export function DeleteProofModal({
  show,
  fileName,
  onClose,
  onConfirmDelete,
}: DeleteProofModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>원본 증빙 삭제</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 flex flex-col gap-3.5">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold truncate">{fileName}</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            해당 원본 증빙을 삭제합니다. 이 증빙 파일에서 추출되어 <strong className="text-slate-900 font-semibold">현재 표(시트)에 적재된 데이터 행도 함께 삭제</strong>하시겠습니까?
          </p>

          <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-1">
            <span className="font-semibold text-amber-800">💡 삭제 옵션 안내:</span>
            <span>• <strong>표 데이터도 함께 삭제</strong>: 해당 증빙에서 파싱된 모든 데이터 행이 표에서 제거됩니다.</span>
            <span>• <strong>데이터 유지하고 파일만 삭제</strong>: 표 데이터는 그대로 보존되며 증빙 파일만 목록에서 제거됩니다.</span>
          </div>
        </div>

        {/* 모달 액션 버튼 그룹 */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition"
          >
            취소
          </button>
          <button
            onClick={() => onConfirmDelete(false)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span>데이터 유지 / 파일만 삭제</span>
          </button>
          <button
            onClick={() => onConfirmDelete(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>표 데이터도 함께 삭제</span>
          </button>
        </div>
      </div>
    </div>
  );
}
