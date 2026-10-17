'use client';

import React from 'react';
import { BarChart3, AlertCircle, Filter, RotateCcw } from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';
import { calculateSheetSummary } from '@/lib/summary';

interface SummaryViewProps {
  sheet: ParsedSheet;
  filteredRows?: Record<string, any>[];
  totalRowsCount?: number;
  isFiltered?: boolean;
  onResetFilter?: () => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function SummaryView({
  sheet,
  filteredRows,
  totalRowsCount,
  isFiltered = false,
  onResetFilter,
  searchQuery = '',
  onClearSearch,
}: SummaryViewProps) {
  const effectiveRows = filteredRows !== undefined ? filteredRows : sheet.rows;
  const effectiveSheet: ParsedSheet = {
    ...sheet,
    rows: effectiveRows,
  };
  const summary = calculateSheetSummary(effectiveSheet);

  if (!summary || effectiveRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs min-h-[300px] gap-3">
        <AlertCircle className="w-8 h-8 text-amber-500/70" />
        {sheet.rows.length === 0 ? (
          <span>통계를 계산할 데이터가 시트에 없습니다.</span>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-slate-600 font-semibold">현재 적용된 필터 조건에 일치하는 데이터가 없습니다.</span>
            <span className="text-[11px] text-slate-400">필터 조건을 완화하거나 초기화하여 전체 데이터 통계를 확인하세요.</span>
            {(onResetFilter || onClearSearch) && (
              <button
                type="button"
                onClick={() => {
                  if (onResetFilter) onResetFilter();
                  if (onClearSearch) onClearSearch();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer mt-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>필터 초기화 및 전체 통계 보기</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const numStatKeys = Object.keys(summary.numericStats);

  return (
    <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto max-h-[600px] bg-slate-50/40">
      {/* 🌟 필터 적용 알림 배너 (필터 시 동기화 인지 강화) */}
      {isFiltered && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-blue-900 flex items-center gap-2">
                <span>조회 필터 연동 집계 중</span>
                <span className="text-[10px] bg-blue-200/90 text-blue-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  {effectiveRows.length.toLocaleString('ko-KR')} / {(totalRowsCount ?? sheet.rows.length).toLocaleString('ko-KR')}행
                </span>
              </div>
              <p className="text-[11px] text-blue-700/90 mt-0.5">
                표 데이터 탭의 필터(기간·조건·검색어)가 반영되어 선별된 행을 기준으로 실시간 산출된 통계입니다.
              </p>
            </div>
          </div>
          {(onResetFilter || onClearSearch) && (
            <button
              type="button"
              onClick={() => {
                if (onResetFilter) onResetFilter();
                if (onClearSearch) onClearSearch();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-100/70 text-blue-700 text-xs font-bold border border-blue-200 shadow-2xs transition active:scale-95 cursor-pointer"
              title="필터를 모두 해제하고 시트 전체 데이터 통계 보기"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>필터 해제 (전체 통계 보기)</span>
            </button>
          )}
        </div>
      )}

      {/* 상단 KPI 개요 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {isFiltered ? '집계 대상 행 수' : '총 데이터 행 수'}
            </span>
            {isFiltered && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                필터 적용
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {effectiveRows.length.toLocaleString('ko-KR')}{' '}
            <span className="text-xs font-normal text-slate-400">행</span>
          </div>
          {isFiltered && totalRowsCount !== undefined && (
            <div className="text-[11px] text-slate-400 mt-1">
              전체 <span className="font-mono font-bold text-slate-600">{totalRowsCount.toLocaleString('ko-KR')}</span>행 중
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">총 열(컬럼) 수</span>
          <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
            {summary.totalCols.toLocaleString('ko-KR')}{' '}
            <span className="text-xs font-normal text-slate-400">개</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">통계 분석 대상 숫자 열</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {numStatKeys.length}{' '}
            <span className="text-xs font-normal text-slate-400">개 항목</span>
          </div>
        </div>
      </div>

      {/* 숫자 열별 상세 통계 카드 그리드 */}
      {numStatKeys.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>항목별 자동 집계 및 통계 카드</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              (공급가액, 세액, 출금액 등 숫자 데이터를 자동으로 인식해 실시간 집계합니다)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {numStatKeys.map((colName) => {
              const stat = summary.numericStats[colName];
              return (
                <div
                  key={colName}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800">{colName}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                        유효 {stat.count}건
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="text-[11px] text-slate-400 font-medium">총합계 (Sum)</span>
                      <div className="text-xl font-extrabold text-blue-700 font-mono">
                        {stat.sum.toLocaleString('ko-KR')}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">평균값</span>
                        <span className="font-mono font-bold text-slate-700">
                          {stat.avg.toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">최대값</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {stat.max.toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">최소값</span>
                        <span className="font-mono font-bold text-slate-500">
                          {stat.min.toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
          현재 시트에 집계할 수 있는 숫자 데이터 열(금액, 단가, 수량 등)이 없습니다.
        </div>
      )}
    </div>
  );
}
