'use client';

import React, { useRef } from 'react';
import { UploadCloud, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface WelcomeDropzoneProps {
  isProcessing: boolean;
  processStatus: string;
  storageProgress: number;
  onFileSelect: (file: File) => void;
}

export function WelcomeDropzone({
  isProcessing,
  processStatus,
  storageProgress,
  onFileSelect,
}: WelcomeDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 min-h-[500px]">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(e.dataTransfer.files[0]);
          }
        }}
        className="max-w-2xl w-full border-2 border-dashed border-blue-300 hover:border-blue-600 bg-white hover:bg-blue-50/40 rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all shadow-sm hover:shadow-md group flex flex-col items-center justify-center"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onFileSelect(e.target.files[0]);
            }
          }}
          accept=".xlsx,.xls,.csv,.pdf,image/*"
          className="hidden"
        />

        <div className="w-20 h-20 rounded-3xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center mb-5 transition-all shadow-sm group-hover:scale-105">
          <UploadCloud className="w-10 h-10" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-800 group-hover:text-blue-700 tracking-tight">
          어떤 파일이든 여기에 끌어다 놓으세요
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md font-normal leading-relaxed">
          거래명세서 이미지, 영수증, 통장 액셀, 카드 내역 등 어떤 파일이든 드롭 즉시 완벽한 2차원 표로 정리됩니다.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-[11px] text-slate-500 font-medium">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">.xlsx / .xls</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">.csv</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">.pdf (AI OCR)</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">영수증 / 전표 이미지</span>
        </div>

        <div className="mt-6">
          <span className="px-6 py-3 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-98">
            내 컴퓨터에서 파일 선택하기
          </span>
        </div>

        {isProcessing && (
          <div className="mt-6 w-full max-w-md bg-white border border-blue-200 rounded-2xl p-4 shadow-lg text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-xs text-slate-700 mb-2 font-semibold">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                {processStatus}
              </span>
              {storageProgress > 0 && <span className="font-mono text-blue-600 font-bold">{storageProgress}%</span>}
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(storageProgress, 25)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
