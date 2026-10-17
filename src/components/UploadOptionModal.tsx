'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, FolderOpen, Table as TableIcon, Plus, X, Sparkles, Layers } from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';

interface UploadOptionModalProps {
  pendingFile: File | null;
  onClose: () => void;
  onSelectOption: (
    file: File,
    mode: 'new_document' | 'new_sheet' | 'append_rows',
    customPrompt?: string,
    targetSheetIndex?: number
  ) => void;
  hasExistingProject?: boolean;
  initialPrompt?: string;
  currentProject?: ProjectWorkspace | null;
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
  hasExistingProject = true,
  initialPrompt = '',
  currentProject,
}: UploadOptionModalProps) {
  const [customPrompt, setCustomPrompt] = useState<string>(initialPrompt);
  const [targetSheetIdx, setTargetSheetIdx] = useState<number>(currentProject?.activeSheetIndex ?? 0);

  // currentProject나 initialPrompt가 변경되면 반영
  useEffect(() => {
    if (initialPrompt) setCustomPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (currentProject) {
      setTargetSheetIdx(currentProject.activeSheetIndex ?? 0);
    }
  }, [currentProject]);

  if (!pendingFile) return null;

  const handleAppendPrompt = (text: string) => {
    setCustomPrompt((prev) => (prev ? `${prev.trim()}, ${text}` : text));
  };

  const sheets = currentProject?.sheets || [];
  const selectedSheet = sheets[targetSheetIdx] || sheets[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">업로드 방식 및 적재 대상 시트 선택</h3>
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
        <div className="flex flex-col gap-2.5">
          {!hasExistingProject ? (
            <button
              onClick={() => onSelectOption(pendingFile, 'new_document', customPrompt)}
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-98"
            >
              <FolderOpen className="w-4 h-4 text-white" />
              <span>AI 파싱 및 새 프로젝트 시작하기</span>
            </button>
          ) : (
            <>
              {/* 1. 현재 프로젝트 내 새 시트로 추가 */}
              <button
                onClick={() => onSelectOption(pendingFile, 'new_sheet', customPrompt)}
                className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition group"
              >
                <TableIcon className="w-4 h-4 text-blue-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-blue-900">새 시트(Sheet)로 독립 생성 (권장)</div>
                  <div className="text-[11px] text-blue-700/80 mt-0.5">기존 표와 섞이지 않도록 새 탭을 만들어 독립 적재합니다.</div>
                </div>
              </button>

              {/* 2. 대상 시트에 데이터 행 병합 (시트 선택 드롭다운 내장) */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Plus className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">지정된 시트에 데이터 추가 (행 병합)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">선택한 시트 아래에 데이터 행들을 이어 붙입니다.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectOption(pendingFile, 'append_rows', customPrompt, targetSheetIdx)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition active:scale-95 shrink-0"
                  >
                    이 시트에 병합
                  </button>
                </div>

                {/* 📌 적재 대상 시트 명시 및 선택 드롭다운 */}
                {sheets.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1 shrink-0">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>적재 대상 시트:</span>
                    </span>
                    <select
                      value={targetSheetIdx}
                      onChange={(e) => setTargetSheetIdx(Number(e.target.value))}
                      className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500 truncate max-w-[200px]"
                    >
                      {sheets.map((s, idx) => (
                        <option key={idx} value={idx}>
                          {s.name} ({s.rows?.length ?? 0}행)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 3. 새로운 독립 프로젝트로 열기 */}
              <button
                onClick={() => onSelectOption(pendingFile, 'new_document', customPrompt)}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition group"
              >
                <FolderOpen className="w-4 h-4 text-slate-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-slate-800">새로운 독립 프로젝트로 열기</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">기존 작업과 별개로 상단에 독립된 프로젝트를 생성합니다.</div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
