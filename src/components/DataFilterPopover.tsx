'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Filter, RotateCcw, Check, X, ChevronDown } from 'lucide-react';

export interface DateFilterConfig {
  column: string;
  startDate: string;
  endDate: string;
  preset?: 'all' | 'today' | '7days' | 'thisMonth' | '30days' | 'custom';
}

export interface FilterState {
  dateConfig: DateFilterConfig;
  limit: number; // 0 = 전체
}

interface DataFilterPopoverProps {
  headers: string[];
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
  onResetFilter: () => void;
  isFilterActive: boolean;
  activeFilterCount: number;
}

export function DataFilterPopover({
  headers,
  filterState,
  onFilterChange,
  onResetFilter,
  isFilterActive,
  activeFilterCount,
}: DataFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 날짜 관련 열 자동 감지 (일자, 날짜, 일시, date, time 등)
  const dateCandidates = headers.filter((h) =>
    /(일자|날짜|일시|등록일|작성일|date|time|created|timestamp)/i.test(h)
  );
  const effectiveDateCol = filterState.dateConfig.column || (dateCandidates[0] || headers[0] || '');

  // 팝오버 외부 클릭 감지 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 빠른 기간 프리셋 설정 함수
  const applyPreset = (preset: 'all' | 'today' | '7days' | 'thisMonth' | '30days') => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let start = '';
    let end = '';

    if (preset === 'today') {
      start = formatDate(today);
      end = formatDate(today);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      start = formatDate(past);
      end = formatDate(today);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      start = formatDate(past);
      end = formatDate(today);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = formatDate(firstDay);
      end = formatDate(lastDay);
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    onFilterChange({
      ...filterState,
      dateConfig: {
        ...filterState.dateConfig,
        column: effectiveDateCol,
        startDate: start,
        endDate: end,
        preset,
      },
    });
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
          isFilterActive
            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs hover:bg-blue-700'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
        }`}
        title="기간 및 건수 필터링 설정"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>기간·건수 필터</span>
        {isFilterActive && (
          <span className="bg-white text-blue-700 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ml-0.5">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 팝오버 패널 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>데이터 조회 필터 설정</span>
            </div>
            <div className="flex items-center gap-2">
              {isFilterActive && (
                <button
                  onClick={onResetFilter}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 transition"
                  title="모든 필터 초기화"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>초기화</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-3">
            {/* 1. 기간/날짜 필터 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                  📅 기간 필터 기준 열
                </label>
                {headers.length > 0 && (
                  <select
                    value={effectiveDateCol}
                    onChange={(e) =>
                      onFilterChange({
                        ...filterState,
                        dateConfig: { ...filterState.dateConfig, column: e.target.value },
                      })
                    }
                    className="text-[11px] font-semibold border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h} {dateCandidates.includes(h) ? '(날짜 감지)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 프리셋 버튼 그룹 */}
              <div className="grid grid-cols-5 gap-1 mb-2.5">
                {(
                  [
                    { id: 'all', label: '전체' },
                    { id: 'today', label: '오늘' },
                    { id: '7days', label: '최근 7일' },
                    { id: 'thisMonth', label: '이번 달' },
                    { id: '30days', label: '최근 30일' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`py-1 text-[11px] font-bold rounded-lg border transition ${
                      filterState.dateConfig.preset === preset.id
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* 직접 날짜 범위 입력 */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filterState.dateConfig.startDate}
                  onChange={(e) =>
                    onFilterChange({
                      ...filterState,
                      dateConfig: {
                        ...filterState.dateConfig,
                        startDate: e.target.value,
                        preset: 'custom',
                        column: effectiveDateCol,
                      },
                    })
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-slate-700"
                />
                <span className="text-slate-400 text-xs font-bold">~</span>
                <input
                  type="date"
                  value={filterState.dateConfig.endDate}
                  onChange={(e) =>
                    onFilterChange({
                      ...filterState,
                      dateConfig: {
                        ...filterState.dateConfig,
                        endDate: e.target.value,
                        preset: 'custom',
                        column: effectiveDateCol,
                      },
                    })
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 text-slate-700"
                />
              </div>
            </div>

            {/* 2. 건수 제한 필터 */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[11px] font-extrabold text-slate-700 mb-1.5 block">
                🔢 상위 건수 제한
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 0, label: '전체 보기' },
                  { value: 50, label: '최근 50건' },
                  { value: 100, label: '최근 100건' },
                  { value: 300, label: '최근 300건' },
                  { value: 500, label: '최근 500건' },
                  { value: 1000, label: '최근 1,000건' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() =>
                      onFilterChange({
                        ...filterState,
                        limit: item.value,
                      })
                    }
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition ${
                      filterState.limit === item.value
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 하단 완료 버튼 */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                표 화면에 즉시 반영되며 내보내기 시 연동됩니다.
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>확인</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
