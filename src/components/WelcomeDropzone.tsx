'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, RefreshCw, Sparkles } from 'lucide-react';

interface WelcomeDropzoneProps {
  isProcessing: boolean;
  processStatus: string;
  storageProgress: number;
  onFileSelect: (file: File, prompt?: string) => void;
}

const QUICK_PROMPTS = [
  '담당자, 승인번호 컬럼 필수 생성',
  '날짜 형식 YYYY-MM-DD 통일',
  '금액은 콤마 없는 순수 숫자로 적재',
  '비고란에 거래처 대표자 및 연락처 모으기',
];

export function WelcomeDropzone({
  isProcessing,
  processStatus,
  storageProgress,
  onFileSelect,
}: WelcomeDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [naturalPrompt, setNaturalPrompt] = useState<string>('');

  const handleAppendPrompt = (text: string) => {
    setNaturalPrompt((prev) => (prev ? `${prev.trim()}, ${text}` : text));
  };

  const handleSelectWithPrompt = (file: File) => {
    onFileSelect(file, naturalPrompt);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 min-h-[520px]">
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
            handleSelectWithPrompt(e.dataTransfer.files[0]);
          }
        }}
        className="max-w-2xl w-full border-2 border-dashed border-blue-300 hover:border-blue-600 bg-white hover:bg-blue-50/30 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all shadow-sm hover:shadow-md group flex flex-col items-center justify-center"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleSelectWithPrompt(e.target.files[0]);
            }
          }}
          accept=".xlsx,.xls,.csv,.pdf,image/*"
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center mb-4 transition-all shadow-sm group-hover:scale-105">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-800 group-hover:text-blue-700 tracking-tight">
          어떤 파일이든 여기에 끌어다 놓으세요
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md font-normal leading-relaxed">
          거래명세서 이미지, 영수증, 통장 엑셀, 카드 내역 등 어떤 파일이든 드롭 즉시 완벽한 2차원 표로 정리됩니다.
        </p>

        {/* 🌟 자연어 요청(프롬프트) 입력창 */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg mt-6 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 border border-indigo-100 text-left shadow-xs cursor-default"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI 맞춤 자연어 요청 (선택사항)</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            추출할 필수 컬럼이나 원하는 데이터 가공 형태를 자연어로 편하게 적어주세요.
          </p>
          <input
            type="text"
            value={naturalPrompt}
            onChange={(e) => setNaturalPrompt(e.target.value)}
            placeholder="예: '승인번호', '결제수단' 컬럼 필수 생성 / 금액은 숫자만"
            className="w-full text-xs px-3 py-2 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAppendPrompt(qp)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium transition cursor-pointer"
              >
                + {qp}
              </button>
            ))}
          </div>
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
