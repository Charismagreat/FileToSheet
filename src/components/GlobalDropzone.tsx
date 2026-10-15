'use client';

import React from 'react';
import { UploadCloud, RefreshCw } from 'lucide-react';

interface GlobalDropzoneProps {
  isDragging: boolean;
  isProcessing: boolean;
  processStatus: string;
  storageProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const GlobalDropzone: React.FC<GlobalDropzoneProps> = ({
  isDragging,
  isProcessing,
  processStatus,
  storageProgress,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}) => {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 transition cursor-pointer flex flex-col items-center justify-center text-center relative overflow-hidden ${
        isDragging
          ? 'border-blue-500 bg-blue-50/80 scale-[1.003]'
          : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/60 shadow-xs'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept=".xlsx,.xls,.csv,.pdf,image/*"
        className="hidden"
      />

      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mb-2.5 shadow-2xs">
        <UploadCloud className="w-6 h-6 text-blue-600" />
      </div>

      <h3 className="text-sm font-bold text-slate-800">
        파일을 여기에 끌어다 놓으세요 (새 프로젝트 생성 또는 시트 추가)
      </h3>
      <p className="text-xs text-slate-500 mt-0.5 max-w-md font-normal">
        거래명세서 이미지, 영수증, 통장 엑셀, 카드 내역 등 어떤 파일이든 드롭 즉시 완벽한 2차원 표로 정리됩니다.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px] text-slate-600">
        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-medium">.xlsx / .xls</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-medium">.csv</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-medium">.pdf (AI OCR)</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-medium">영수증 / 전표 이미지</span>
      </div>

      {isProcessing && (
        <div className="mt-3.5 w-full max-w-md bg-white border border-slate-200 rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-700 mb-1.5 font-semibold">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              {processStatus}
            </span>
            {storageProgress > 0 && <span className="font-mono text-blue-600">{storageProgress}%</span>}
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(storageProgress, 35)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};
