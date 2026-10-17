'use client';

import React from 'react';
import { Download, Filter, Database, Check, X, FileSpreadsheet } from 'lucide-react';

export type ExportTargetType = 'xlsx' | 'sqlite' | 'sheets';

interface ExportScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ExportTargetType;
  filteredCount: number;
  totalCount: number;
  onConfirm: (scope: 'filtered' | 'all') => void;
  loading?: boolean;
}

export function ExportScopeModal({
  isOpen,
  onClose,
  targetType,
  filteredCount,
  totalCount,
  onConfirm,
  loading = false,
}: ExportScopeModalProps) {
  if (!isOpen) return null;

  const targetTitles: Record<ExportTargetType, { title: string; icon: React.ReactNode; color: string }> = {
    xlsx: {
      title: 'Excel (.xlsx) 다운로드',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
      color: 'emerald',
    },
    sqlite: {
      title: 'SQLite DB (.sqlite) 다운로드',
      icon: <Database className="w-5 h-5 text-amber-600" />,
      color: 'amber',
    },
    sheets: {
      title: 'Google 스프레드시트 내보내기',
      icon: <Download className="w-5 h-5 text-blue-600" />,
      color: 'blue',
    },
  };

  const currentMeta = targetTitles[targetType] || targetTitles.xlsx;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-blue-50/60 to-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center">
              {currentMeta.icon}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {currentMeta.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                현재 표에 조회 필터가 적용되어 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내보내기 범위 선택 영역 */}
        <div className="p-6 pt-2 space-y-3">
          <div className="text-xs text-slate-600 font-medium mb-1">
            어떤 범위의 데이터를 내보낼까요?
          </div>

          {/* 1. 필터된 결과만 내보내기 (추천) */}
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm('filtered')}
            className="w-full text-left p-4 rounded-xl border-2 border-blue-500 bg-blue-50/60 hover:bg-blue-100/60 transition-all flex items-start gap-3 group relative"
          >
            <div className="absolute top-2.5 right-3 bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
              추천 (WYSIWYG)
            </div>
            <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 group-hover:scale-105 transition-transform mt-0.5">
              <Filter className="w-4 h-4" />
            </div>
            <div className="pr-12">
              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>현재 필터된 결과만 내보내기</span>
                <span className="text-blue-700 bg-blue-100/80 px-1.5 py-0.2 text-xs rounded-md font-black">
                  {filteredCount.toLocaleString()}건
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                화면에서 검색하고 기간·조건으로 걸러낸 현재 상태 그대로 저장합니다.
              </div>
            </div>
          </button>

          {/* 2. 전체 원본 데이터 내보내기 */}
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm('all')}
            className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3 group"
          >
            <div className="p-2 rounded-lg bg-slate-700 text-white shrink-0 group-hover:scale-105 transition-transform mt-0.5">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>전체 원본 데이터 내보내기</span>
                <span className="text-slate-600 bg-slate-100 px-1.5 py-0.2 text-xs rounded-md font-bold">
                  {totalCount.toLocaleString()}건
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                화면의 필터를 무시하고 시트에 보관된 모든 원본 데이터를 내보냅니다.
              </div>
            </div>
          </button>
        </div>

        {/* 모달 푸터 */}
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
