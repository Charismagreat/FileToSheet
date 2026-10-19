import React from 'react';
import { AlertTriangle, CheckCircle2, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import { ValidationResult } from '@/lib/validation-engine';

interface ValidationBannerProps {
  validationResult: ValidationResult;
  totalRowCount: number;
  filterOnlyErrors: boolean;
  onToggleFilterOnlyErrors: () => void;
  onOpenRuleModal: () => void;
  activeRuleCount: number;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  validationResult,
  totalRowCount,
  filterOnlyErrors,
  onToggleFilterOnlyErrors,
  onOpenRuleModal,
  activeRuleCount,
}) => {
  if (activeRuleCount === 0) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span>활성화된 데이터 유효성 검증 규칙이 없습니다.</span>
        </span>
        <button
          onClick={onOpenRuleModal}
          className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors shadow-sm"
        >
          검증 규칙 설정 (자연어 추가)
        </button>
      </div>
    );
  }

  const { hasErrors, totalErrorCount, errorRowsCount } = validationResult;
  const matchRate = totalRowCount > 0 
    ? Math.max(0, Math.round(((totalRowCount - errorRowsCount) / totalRowCount) * 100))
    : 100;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b text-xs transition-colors ${
        hasErrors
          ? 'bg-rose-50/90 border-rose-200 text-rose-900'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
      }`}
    >
      <div className="flex items-center gap-2">
        {hasErrors ? (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-200 text-rose-700 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
        )}

        <div className="flex items-center gap-2 font-medium">
          {hasErrors ? (
            <span>
              데이터 불일치 <strong className="font-bold text-rose-700 underline">{totalErrorCount}건</strong> 발견
              (총 {errorRowsCount}개 행)
            </span>
          ) : (
            <span>모든 행의 데이터 검증을 통과했습니다 (데이터 일치율 100%)</span>
          )}
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/80 border border-current opacity-80">
            일치율 {matchRate}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasErrors && (
          <button
            onClick={onToggleFilterOnlyErrors}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shadow-sm ${
              filterOnlyErrors
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-100/70'
            }`}
          >
            {filterOnlyErrors ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{filterOnlyErrors ? '전체 행 보기' : '불일치 행만 모아보기'}</span>
          </button>
        )}

        <button
          onClick={onOpenRuleModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>검증 규칙 ({activeRuleCount}개 활성)</span>
        </button>
      </div>
    </div>
  );
};
