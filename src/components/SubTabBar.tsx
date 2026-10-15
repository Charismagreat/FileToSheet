'use client';

import React from 'react';
import { Table as TableIcon, Eye, BarChart3, Search, Plus, Columns } from 'lucide-react';

interface SubTabBarProps {
  activeSubTab: 'table' | 'original' | 'summary';
  setActiveSubTab: (tab: 'table' | 'original' | 'summary') => void;
  rowsCount: number;
  hasOriginalFile: boolean;
  originalFilesCount?: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddRow: () => void;
  onOpenAddColumn: () => void;
}

export function SubTabBar({
  activeSubTab,
  setActiveSubTab,
  rowsCount,
  hasOriginalFile,
  originalFilesCount = 0,
  searchQuery,
  setSearchQuery,
  onAddRow,
  onOpenAddColumn,
}: SubTabBarProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      {/* 3단계 탭 버튼들 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 mr-1.5 shrink-0">📌 탭:</span>
        <button
          onClick={() => setActiveSubTab('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'table'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>📊 표 데이터 ({rowsCount}행)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('original')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'original'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>
            👁️ 원본 증빙 대조 {originalFilesCount > 0 ? `(${originalFilesCount}개)` : hasOriginalFile ? '✓' : ''}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('summary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'summary'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>📈 요약 및 통계</span>
        </button>
      </div>

      {/* 표 데이터 전용 제어 툴바 (검색, 행/열 추가) */}
      {activeSubTab === 'table' && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="데이터 실시간 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-36 sm:w-48 bg-slate-50 focus:bg-white transition"
            />
          </div>

          <button
            onClick={onAddRow}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition"
            title="새 데이터 행 추가"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>행 추가</span>
          </button>

          <button
            onClick={onOpenAddColumn}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition"
            title="새 열(Header) 추가"
          >
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            <span>열 추가</span>
          </button>
        </div>
      )}
    </div>
  );
}
