'use client';

import React from 'react';
import { Table as TableIcon, Eye, BarChart3, Search, Plus, Columns, ArrowUpDown, RotateCcw } from 'lucide-react';
import { DataFilterPopover, FilterState } from './DataFilterPopover';

interface SubTabBarProps {
  activeSubTab: 'table' | 'original' | 'summary';
  setActiveSubTab: (tab: 'table' | 'original' | 'summary') => void;
  rowsCount: number;
  totalRowsCount?: number;
  hasOriginalFile: boolean;
  originalFilesCount?: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddRow: () => void;
  onOpenAddColumn: () => void;
  sortOrder?: 'desc' | 'asc';
  onToggleSort?: () => void;
  activeSortLabel?: string;
  headers?: string[];
  filterState?: FilterState;
  onFilterChange?: (newState: FilterState) => void;
  onResetFilter?: () => void;
  isFilterActive?: boolean;
  activeFilterCount?: number;
}

export function SubTabBar({
  activeSubTab,
  setActiveSubTab,
  rowsCount,
  totalRowsCount,
  hasOriginalFile,
  originalFilesCount = 0,
  searchQuery,
  setSearchQuery,
  onAddRow,
  onOpenAddColumn,
  sortOrder = 'desc',
  onToggleSort,
  headers = [],
  filterState,
  onFilterChange,
  onResetFilter,
  isFilterActive = false,
  activeFilterCount = 0,
}: SubTabBarProps) {
  const isFiltered = (totalRowsCount !== undefined && rowsCount !== totalRowsCount) || Boolean(searchQuery.trim()) || isFilterActive;

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 mr-1.5 shrink-0">📌 탭:</span>
        <button
          onClick={() => setActiveSubTab('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'table' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>📊 표 데이터 ({rowsCount}행)</span>
          {isFiltered && totalRowsCount !== undefined && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded ml-0.5">
              전체 {totalRowsCount}행 중
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('original')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'original' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>👁️ 원본 증빙 대조 {originalFilesCount > 0 ? `(${originalFilesCount}개)` : hasOriginalFile ? '✓' : ''}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('summary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'summary' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>📈 요약 및 통계</span>
        </button>
      </div>

      {activeSubTab === 'table' && (
        <div className="flex items-center gap-2">
          {/* 기간 및 건수 필터 팝오버 */}
          {filterState && onFilterChange && onResetFilter && (
            <DataFilterPopover
              headers={headers}
              filterState={filterState}
              onFilterChange={onFilterChange}
              onResetFilter={onResetFilter}
              isFilterActive={isFilterActive}
              activeFilterCount={activeFilterCount}
            />
          )}

          {/* 최신순 / 등록순 / 컬럼별 정렬 토글 */}
          {onToggleSort && (
            <button
              onClick={onToggleSort}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                activeSortLabel
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="정렬 기준 토글 (컬럼 헤더를 클릭하여 해당 열 기준으로 정렬할 수도 있습니다)"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>{activeSortLabel || (sortOrder === 'desc' ? '⬇️ 최신순' : '⬆️ 과거순')}</span>
            </button>
          )}

          {/* 실시간 텍스트 검색창 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="표 데이터 실시간 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-36 sm:w-44 bg-slate-50 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>

          <button onClick={onAddRow} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition" title="새 데이터 행 추가">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>행 추가</span>
          </button>

          <button onClick={onOpenAddColumn} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition" title="새 열(Header) 추가">
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            <span>열 추가</span>
          </button>
        </div>
      )}
    </div>
  );
}
