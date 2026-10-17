'use client';

import React from 'react';
import { AlertTriangle, X, CheckCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { OriginalDocFile } from '@/types/workspace';

interface DuplicateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingFile: OriginalDocFile | null;
  newFile: File | null;
  onProceed: () => void;
}

export function DuplicateFileModal({ isOpen, onClose, existingFile, newFile, onProceed }: DuplicateFileModalProps) {
  if (!isOpen || !newFile) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-md w-full p-6 text-slate-800 relative">
        <button onClick={onClose} className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              동일 내용 파일 감지
            </span>
            <h3 className="text-base font-black text-slate-900 mt-0.5">이미 적재된 파일과 내용이 같습니다</h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          파일명은 다르지만 <strong>파일의 디지털 내용(SHA-256 지문)이 100% 동일</strong>합니다.<br />
          중복 파싱 시 <strong>AI 사용량이 낭비</strong>되고 표 데이터가 2번 들어갈 수 있습니다.
        </p>

        {/* 대조 카드 */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 mb-4 text-xs">
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 shrink-0 font-medium">기존 적재 파일</span>
            <div className="text-right">
              <span className="font-bold text-slate-800 break-all block">{existingFile?.name || '기존 문서'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{existingFile?.uploadedAt || '기존 적재'}</span>
            </div>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-amber-600 shrink-0 font-bold">새로 업로드 시도</span>
            <div className="text-right">
              <span className="font-bold text-amber-800 break-all block">{newFile.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{(newFile.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </div>

        {/* 알림 메시지 */}
        <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl mb-5 text-[11px] text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>취소하시면 이번 달 AI 파싱 제공량이 차감되지 않고 보존됩니다.</span>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5 active:scale-98"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>🚫 업로드 취소 (AI 크레딧 아끼기)</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onProceed();
            }}
            className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition"
          >
            그래도 새로 추가 적재하기
          </button>
        </div>
      </div>
    </div>
  );
}
