'use client';

import React from 'react';
import { UploadCloud, FolderOpen, Table as TableIcon, Plus, X } from 'lucide-react';

interface UploadOptionModalProps {
  pendingFile: File | null;
  onClose: () => void;
  onSelectOption: (file: File, mode: 'new_document' | 'new_sheet' | 'append_rows') => void;
}

export function UploadOptionModal({
  pendingFile,
  onClose,
  onSelectOption,
}: UploadOptionModalProps) {
  if (!pendingFile) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">업로드 방식 선택</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4">
          <span className="font-semibold text-slate-800 font-mono">'{pendingFile.name}'</span> 파일을 어떻게 열까요?
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onSelectOption(pendingFile, 'new_document')}
            className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition"
          >
            <FolderOpen className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-blue-900">새로운 프로젝트로 열기 (권장)</div>
              <div className="text-[11px] text-blue-700/80 mt-0.5">
                기존 작업과 별개로 상단에 독립된 프로젝트를 생성하여 보존합니다.
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectOption(pendingFile, 'new_sheet')}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition"
          >
            <TableIcon className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">현재 프로젝트에 새 시트로 추가</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                현재 열려있는 프로젝트 내부에 새로운 서브 시트(Sheet)로 추가합니다.
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectOption(pendingFile, 'append_rows')}
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
