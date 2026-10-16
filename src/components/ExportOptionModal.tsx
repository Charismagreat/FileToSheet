'use client';

import React from 'react';

interface ExportOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (mode: 'update' | 'create') => void;
  spreadsheetUrl?: string;
  loading?: boolean;
}

export function ExportOptionModal({
  isOpen,
  onClose,
  onSelectOption,
  spreadsheetUrl,
  loading = false,
}: ExportOptionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* 모달 헤더 */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-blue-50/60 to-white">
          <div className="w-12 h-12 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Google 시트 내보내기</h3>
          <p className="text-xs text-slate-500 mt-1">
            이전에 내보낸 Google 스프레드시트가 연결되어 있습니다.
          </p>
          {spreadsheetUrl && (
            <div className="mt-2.5">
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md transition-colors"
              >
                <span>연결된 시트 바로가기</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* 선택 버튼 영역 */}
        <div className="p-6 pt-3 space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => onSelectOption('update')}
            className="w-full text-left p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-start gap-3 group disabled:opacity-50"
          >
            <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">기존 시트 덮어쓰기 (업데이트)</div>
              <div className="text-xs text-slate-500 mt-0.5">기존 시트의 링크를 유지하면서 최신 데이터로 변경합니다.</div>
            </div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => onSelectOption('create')}
            className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3 group disabled:opacity-50"
          >
            <div className="p-2 rounded-lg bg-slate-700 text-white shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">새 Google 스프레드시트로 생성</div>
              <div className="text-xs text-slate-500 mt-0.5">기존 파일과 별개로 새로운 스프레드시트를 만듭니다.</div>
            </div>
          </button>
        </div>

        {/* 하단 취소 버튼 */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
