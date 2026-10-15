'use client';

import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface TableEmptyDropzoneProps {
  onFileSelect: (file: File) => void;
}

export function TableEmptyDropzone({ onFileSelect }: TableEmptyDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="m-8 p-12 border-2 border-dashed border-blue-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/40 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition group shadow-2xs"
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
      <div className="w-14 h-14 rounded-2xl bg-blue-100/70 group-hover:bg-blue-600 group-hover:scale-105 text-blue-600 group-hover:text-white flex items-center justify-center mb-3 transition shadow-xs">
        <UploadCloud className="w-7 h-7" />
      </div>
      <div className="text-base font-extrabold text-slate-800 group-hover:text-blue-700">
        여기에 파일을 끌어다 놓으세요 (이 시트의 표 데이터로 즉시 적재)
      </div>
      <p className="text-xs text-slate-500 mt-1.5 max-w-md font-normal leading-relaxed">
        선택 팝업 없이 엑셀, CSV, 영수증/전표 이미지가 현재 시트의 표 데이터로 바로 적재됩니다.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className="px-4 py-2 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-98">
          내 컴퓨터에서 파일 선택하기
        </span>
      </div>
    </div>
  );
}
