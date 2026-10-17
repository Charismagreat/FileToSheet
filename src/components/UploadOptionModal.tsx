'use client';

import React, { useState } from 'react';
import { UploadCloud, FolderOpen, Table as TableIcon, Plus, X, Sparkles } from 'lucide-react';

interface UploadOptionModalProps {
  pendingFile: File | null;
  onClose: () => void;
  onSelectOption: (file: File, mode: 'new_document' | 'new_sheet' | 'append_rows', customPrompt?: string) => void;
}

const QUICK_PROMPTS = [
  '담당자, 승인번호 컬럼 필수 생성',
  '날짜 형식 YYYY-MM-DD 통일',
  '금액은 콤마 없는 순수 숫자로 적재',
  '비고란에 거래처 대표자 및 연락처 모으기',
];

export function UploadOptionModal({
  pendingFile,
  onClose,
  onSelectOption,
}: UploadOptionModalProps) {
  const [customPrompt, setCustomPrompt] = useState<string>('');

  if (!pendingFile) return null;

  const handleAppendPrompt = (text: string) => {
    setCustomPrompt((prev) => (prev ? `${prev.trim()}, ${text}` : text));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">업로드 방식 및 추출 규칙 선택</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          <span className="font-semibold text-slate-800 font-mono">'{pendingFile.name}'</span> 파일을 어떻게 열까요?
        </p>

        {/* 🌟 자연어 필수 컬럼 및 적재 규칙 입력 영역 */}
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border border-indigo-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>✨ AI 맞춤 적재 지시사항 (선택사항)</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            꼭 생성되어야 할 필수 컬럼명이나 데이터 적재/변환 규칙을 자유롭게 적어주세요.
          </p>
          <textarea
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="예: '승인번호', '결제수단' 컬럼 필수 생성 / 금액은 콤마 없는 숫자만"
            className="w-full text-xs p-2.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 text-slate-800 resize-none placeholder:text-slate-400"
          />
          {/* 퀵 태그 버튼 */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAppendPrompt(qp)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium transition"
              >
                + {qp}
              </button>
            ))}
          </div>
        </div>

        {/* 업로드 대상 선택 버튼들 */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelectOption(pendingFile, 'new_document', customPrompt)}
            className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition"
          >
            <FolderOpen className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-blue-900">새로운 프로젝트로 열기</div>
              <div className="text-[11px] text-blue-700/80 mt-0.5">
                기존 작업과 별개로 상단에 독립된 프로젝트를 생성하여 보존합니다.
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectOption(pendingFile, 'new_sheet', customPrompt)}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition"
          >
            <TableIcon className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">현재 프로젝트에 새 시트로 추가 (권장)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                현재 프로젝트 내부에 새로운 서브 시트(Sheet)로 추가합니다.
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectOption(pendingFile, 'append_rows', customPrompt)}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition"
          >
            <Plus className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">현재 시트에 데이터 추가 (행 병합)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                현재 보고 있는 시트의 아래에 새 데이터 행들을 그대로 이어 붙입니다.
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
