'use client';

import React from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';
import { calculateSheetSummary } from '@/lib/summary';

interface SummaryViewProps {
  sheet: ParsedSheet;
}

export function SummaryView({ sheet }: SummaryViewProps) {
  const summary = calculateSheetSummary(sheet);

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs min-h-[300px]">
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <span>통계를 계산할 데이터가 시트에 없습니다.</span>
      </div>
    );
  }

  const numStatKeys = Object.keys(summary.numericStats);

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto max-h-[600px] bg-slate-50/40">
      {/* 상단 KPI 개요 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">총 데이터 행 수</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {summary.totalRows.toLocaleString('ko-KR')}{' '}
            <span className="text-xs font-normal text-slate-400">행</span>
          </div>
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
