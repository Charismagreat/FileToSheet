'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  AlertCircle,
  Filter,
  RotateCcw,
  Calendar,
  Scale,
  Plus,
  Trash2,
  Check,
  CheckSquare,
  Square,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';
import { calculateSheetSummary } from '@/lib/summary';
import { SheetSummaryData } from '@/types/workspace';

interface SummaryViewProps {
  sheet: ParsedSheet;
  filteredRows?: Record<string, any>[];
  totalRowsCount?: number;
  isFiltered?: boolean;
  onResetFilter?: () => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export interface PeriodConfig {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  colorTheme: 'blue' | 'purple' | 'emerald' | 'amber';
}

const THEME_STYLES: Record<
  PeriodConfig['colorTheme'],
  {
    badge: string;
    border: string;
    bg: string;
    text: string;
    accent: string;
    subText: string;
  }
> = {
  blue: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    text: 'text-blue-700',
    accent: 'bg-blue-600',
    subText: 'text-blue-600',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    border: 'border-purple-200',
    bg: 'bg-purple-50/50',
    text: 'text-purple-700',
    accent: 'bg-purple-600',
    subText: 'text-purple-600',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-700',
    accent: 'bg-emerald-600',
    subText: 'text-emerald-600',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    border: 'border-amber-200',
    bg: 'bg-amber-50/50',
    text: 'text-amber-700',
    accent: 'bg-amber-600',
    subText: 'text-amber-600',
  },
};

const THEME_CYCLE: PeriodConfig['colorTheme'][] = ['blue', 'purple', 'emerald', 'amber'];

/**
 * 날짜 문자열 정규화 (YYYY-MM-DD 추출)
 */
function normalizeDateValue(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const match = str.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}/);
  if (!match) return null;
  const parts = match[0].replace(/[./]/g, '-').split('-');
  if (parts.length !== 3) return null;
  const y = parts[0];
  const m = parts[1].padStart(2, '0');
  const d = parts[2].padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 날짜 포맷팅 헬퍼 (YYYY-MM-DD)
 */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 시트 내 날짜 컬럼 자동 감지
 */
function detectDateColumns(headers: string[], rows: Record<string, any>[]): string[] {
  const nameKeywords = ['일자', '날짜', 'date', '거래일', '작성일', '등록일', '일시', '시간', '생성일', '지급일'];
  const candidatesByName = headers.filter((h) =>
    nameKeywords.some((k) => h.toLowerCase().includes(k.toLowerCase()))
  );
  if (candidatesByName.length > 0) return candidatesByName;

  // 데이터 내용 기반 감지 (상위 15행 검사)
  const sample = rows.slice(0, 15);
  const candidatesByData = headers.filter((h) => {
    let matchCount = 0;
    sample.forEach((row) => {
      if (normalizeDateValue(row[h])) matchCount++;
    });
    return matchCount >= Math.min(2, sample.length);
  });

  return candidatesByData.length > 0 ? candidatesByData : headers;
}

export type SingleDatePreset = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'custom';
export type ComparePreset = 'mom' | 'wow' | '3months' | '4quarters' | 'custom';

export interface SavedSummaryConfig {
  viewMode?: 'single' | 'compare';
  selectedDateCol?: string;
  singleStartDate?: string;
  singleEndDate?: string;
  singlePreset?: SingleDatePreset; // 🌟 'all' | 'today' | 'week' | 'month' | 'quarter' | 'custom'
  comparePreset?: ComparePreset;   // 🌟 'mom' | 'wow' | '3months' | '4quarters' | 'custom'
  periods?: PeriodConfig[];
  selectedMetricCols?: string[];
}

/**
 * 🌟 방문 당일(현재) 기준 동적 상대 날짜 계산기
 * 다음날/다음주/다음달에 재방문하더라도 항상 방문 시점 기준으로 최신 기간 산출
 */
function computeSinglePresetRange(preset: SingleDatePreset): { start: string; end: string } {
  const now = new Date();
  if (preset === 'today') {
    const s = formatDate(now);
    return { start: s, end: s };
  }
  if (preset === 'week') {
    const past = new Date(now);
    past.setDate(past.getDate() - 6);
    return { start: formatDate(past), end: formatDate(now) };
  }
  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: formatDate(first), end: formatDate(now) };
  }
  if (preset === 'quarter') {
    const past = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { start: formatDate(past), end: formatDate(now) };
  }
  return { start: '', end: '' };
}

/**
 * 🌟 비교 모드 템플릿의 재방문 시점 동적 재계산기
 */
function computeComparePresetPeriods(preset: ComparePreset): PeriodConfig[] | null {
  const now = new Date();
  if (preset === 'mom') {
    const p1Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const p1End = new Date(now.getFullYear(), now.getMonth(), 0);
    const p2Start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [
      {
        id: 'p1',
        label: '기간 A (전월)',
        startDate: formatDate(p1Start),
        endDate: formatDate(p1End),
        colorTheme: 'blue',
      },
      {
        id: 'p2',
        label: '기간 B (당월)',
        startDate: formatDate(p2Start),
        endDate: formatDate(now),
        colorTheme: 'purple',
      },
    ];
  }
  if (preset === 'wow') {
    const p1Start = new Date(now);
    p1Start.setDate(now.getDate() - 13);
    const p1End = new Date(now);
    p1End.setDate(now.getDate() - 7);
    const p2Start = new Date(now);
    p2Start.setDate(now.getDate() - 6);
    return [
      {
        id: 'p1',
        label: '기간 A (전주)',
        startDate: formatDate(p1Start),
        endDate: formatDate(p1End),
        colorTheme: 'blue',
      },
      {
        id: 'p2',
        label: '기간 B (금주)',
        startDate: formatDate(p2Start),
        endDate: formatDate(now),
        colorTheme: 'purple',
      },
    ];
  }
  if (preset === '3months') {
    const m1Start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const m1End = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    const m2Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const m2End = new Date(now.getFullYear(), now.getMonth(), 0);
    const m3Start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [
      {
        id: 'p1',
        label: '기간 A (2달 전)',
        startDate: formatDate(m1Start),
        endDate: formatDate(m1End),
        colorTheme: 'blue',
      },
      {
        id: 'p2',
        label: '기간 B (지난달)',
        startDate: formatDate(m2Start),
        endDate: formatDate(m2End),
        colorTheme: 'purple',
      },
      {
        id: 'p3',
        label: '기간 C (이번달)',
        startDate: formatDate(m3Start),
        endDate: formatDate(now),
        colorTheme: 'emerald',
      },
    ];
  }
  if (preset === '4quarters') {
    const curYear = now.getFullYear();
    return [
      {
        id: 'q1',
        label: '1분기 (Q1)',
        startDate: `${curYear}-01-01`,
        endDate: `${curYear}-03-31`,
        colorTheme: 'blue',
      },
      {
        id: 'q2',
        label: '2분기 (Q2)',
        startDate: `${curYear}-04-01`,
        endDate: `${curYear}-06-30`,
        colorTheme: 'purple',
      },
      {
        id: 'q3',
        label: '3분기 (Q3)',
        startDate: `${curYear}-07-01`,
        endDate: `${curYear}-09-30`,
        colorTheme: 'emerald',
      },
      {
        id: 'q4',
        label: '4분기 (Q4)',
        startDate: `${curYear}-10-01`,
        endDate: `${curYear}-12-31`,
        colorTheme: 'amber',
      },
    ];
  }
  return null;
}

function loadSavedSummaryConfig(sheetName: string): SavedSummaryConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`fts_summary_config_${sheetName || 'default'}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
  // 1. 모드 상태: 'single' (단일 일자 구간 조회) vs 'compare' (복수 기간 비교)
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  // 2. 날짜 기준 컬럼 자동 감지 및 선택
  const detectedDateCols = useMemo(
    () => detectDateColumns(sheet.headers || [], sheet.rows || []),
    [sheet.headers, sheet.rows]
  );
  const [selectedDateCol, setSelectedDateCol] = useState<string>(() => detectedDateCols[0] || '');

  // 3. 단일 일자 구간 상태 및 상대 프리셋 상태
  const [singleStartDate, setSingleStartDate] = useState<string>('');
  const [singleEndDate, setSingleEndDate] = useState<string>('');
  const [singlePreset, setSinglePreset] = useState<SingleDatePreset>('all');
  const [comparePreset, setComparePreset] = useState<ComparePreset>('mom');

  // 4. 복수 기간 비교 상태 (기본 2개, 최대 4개)
  const today = useMemo(() => new Date(), []);
  const initialPeriods: PeriodConfig[] = useMemo(() => {
    // 기본 기간 1: 전월 1일 ~ 말일
    const prevMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthLast = new Date(today.getFullYear(), today.getMonth(), 0);
    // 기본 기간 2: 당월 1일 ~ 오늘
    const curMonthFirst = new Date(today.getFullYear(), today.getMonth(), 1);

    return [
      {
        id: 'p1',
        label: '기간 A (전월)',
        startDate: formatDate(prevMonthFirst),
        endDate: formatDate(prevMonthLast),
        colorTheme: 'blue',
      },
      {
        id: 'p2',
        label: '기간 B (당월)',
        startDate: formatDate(curMonthFirst),
        endDate: formatDate(today),
        colorTheme: 'purple',
      },
    ];
  }, [today]);

  const [periods, setPeriods] = useState<PeriodConfig[]>(initialPeriods);

  // 5. 전체 기준 요약 (숫자 컬럼 목록 추출용)
  const baseSummary = useMemo(() => calculateSheetSummary(sheet), [sheet]);
  const allNumStatKeys = useMemo(
    () => (baseSummary ? Object.keys(baseSummary.numericStats) : []),
    [baseSummary]
  );

  // 6. 비교 대상 지표(카드) 선택 상태 (스마트 기본값: No, 순번 등 제외)
  const defaultSelectedMetrics = useMemo(() => {
    const excludePatterns = ['no', '순번', '연번', 'id', '번호', '일련번호', 'index'];
    const filtered = allNumStatKeys.filter(
      (k) => !excludePatterns.some((pat) => k.toLowerCase().includes(pat))
    );
    return filtered.length > 0 ? filtered : allNumStatKeys;
  }, [allNumStatKeys]);

  const [selectedMetricCols, setSelectedMetricCols] = useState<string[]>(defaultSelectedMetrics);

  // 대상 지표 토글 핸들러
  const handleToggleMetric = (col: string) => {
    setSelectedMetricCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSelectAllMetrics = () => setSelectedMetricCols(allNumStatKeys);
  const handleResetMetrics = () => setSelectedMetricCols(defaultSelectedMetrics);

  // 🌟 통계 탭 재방문 시 최종 설정 내용 자동 복원 및 자동 저장
  const isInitialRestoreRef = React.useRef(false);

  // 6-1. 시트 변경 및 마운트 시 저장된 마지막 설정 자동 복원 (방문일 기준 동적 재계산 지원)
  React.useEffect(() => {
    isInitialRestoreRef.current = false;
    const saved = loadSavedSummaryConfig(sheet.name);
    if (saved) {
      if (saved.viewMode) setViewMode(saved.viewMode);
      if (saved.selectedDateCol && sheet.headers.includes(saved.selectedDateCol)) {
        setSelectedDateCol(saved.selectedDateCol);
      }

      // 🌟 상대적 프리셋 동적 재계산 복원 (다음날/다음주/다음달 방문 시 당일 기준으로 최신 산출)
      const p = saved.singlePreset || (saved.singleStartDate || saved.singleEndDate ? 'custom' : 'all');
      setSinglePreset(p);
      if (p !== 'custom') {
        const computed = computeSinglePresetRange(p);
        setSingleStartDate(computed.start);
        setSingleEndDate(computed.end);
      } else {
        if (saved.singleStartDate !== undefined) setSingleStartDate(saved.singleStartDate);
        if (saved.singleEndDate !== undefined) setSingleEndDate(saved.singleEndDate);
      }

      // 🌟 비교 모드 템플릿 프리셋 동적 재계산 복원
      const cp = saved.comparePreset || 'custom';
      setComparePreset(cp);
      if (cp !== 'custom') {
        const computedPeriods = computeComparePresetPeriods(cp);
        if (computedPeriods) {
          setPeriods(computedPeriods);
        } else if (Array.isArray(saved.periods) && saved.periods.length >= 2) {
          setPeriods(saved.periods);
        }
      } else if (Array.isArray(saved.periods) && saved.periods.length >= 2) {
        setPeriods(saved.periods);
      }

      if (Array.isArray(saved.selectedMetricCols) && saved.selectedMetricCols.length > 0) {
        const valid = saved.selectedMetricCols.filter((c) => allNumStatKeys.includes(c));
        if (valid.length > 0) {
          setSelectedMetricCols(valid);
        }
      }
    }
    const timer = setTimeout(() => {
      isInitialRestoreRef.current = true;
    }, 100);
    return () => clearTimeout(timer);
  }, [sheet.name]);

  // 6-2. 설정 변경 시 로컬 스토리지에 자동 영구 저장 (프리셋 유형도 함께 저장하여 상대 날짜 지원)
  React.useEffect(() => {
    if (!isInitialRestoreRef.current) return;
    try {
      const config: SavedSummaryConfig = {
        viewMode,
        selectedDateCol,
        singleStartDate,
        singleEndDate,
        singlePreset,
        comparePreset,
        periods,
        selectedMetricCols,
      };
      localStorage.setItem(`fts_summary_config_${sheet.name || 'default'}`, JSON.stringify(config));
    } catch (e) {
      console.warn('통계 설정 자동 저장 실패:', e);
    }
  }, [sheet.name, viewMode, selectedDateCol, singleStartDate, singleEndDate, singlePreset, comparePreset, periods, selectedMetricCols]);

  // 7. 단일 모드 집계 대상 행 계산
  const singleEffectiveRows = useMemo(() => {
    const srcRows = filteredRows !== undefined ? filteredRows : sheet.rows;
    if (!selectedDateCol || (!singleStartDate && !singleEndDate)) {
      return srcRows;
    }
    return srcRows.filter((row) => {
      const d = normalizeDateValue(row[selectedDateCol]);
      if (!d) return false;
      if (singleStartDate && d < singleStartDate) return false;
      if (singleEndDate && d > singleEndDate) return false;
      return true;
    });
  }, [filteredRows, sheet.rows, selectedDateCol, singleStartDate, singleEndDate]);

  const singleSummary = useMemo(() => {
    return calculateSheetSummary({ ...sheet, rows: singleEffectiveRows });
  }, [sheet, singleEffectiveRows]);

  // 8. 비교 모드: 각 기간별 집계 계산
  const periodResults = useMemo(() => {
    const srcRows = sheet.rows || [];
    return periods.map((p) => {
      const pRows = srcRows.filter((row) => {
        if (!selectedDateCol) return true;
        if (!p.startDate && !p.endDate) return true;
        const d = normalizeDateValue(row[selectedDateCol]);
        if (!d) return false;
        if (p.startDate && d < p.startDate) return false;
        if (p.endDate && d > p.endDate) return false;
        return true;
      });
      const summary = calculateSheetSummary({ ...sheet, rows: pRows });
      return {
        period: p,
        rowCount: pRows.length,
        summary,
      };
    });
  }, [periods, sheet, selectedDateCol]);

  // 9. 기간 동적 조작 함수
  const handleAddPeriod = () => {
    if (periods.length >= 4) return;
    const nextIdx = periods.length;
    const theme = THEME_CYCLE[nextIdx % THEME_CYCLE.length];
    const newPeriod: PeriodConfig = {
      id: `p_${Date.now()}`,
      label: `기간 ${String.fromCharCode(65 + nextIdx)}`,
      startDate: '',
      endDate: '',
      colorTheme: theme,
    };
    setPeriods([...periods, newPeriod]);
  };

  const handleRemovePeriod = (id: string) => {
    if (periods.length <= 2) return; // 최소 2개 유지
    setPeriods(periods.filter((p) => p.id !== id));
  };

  const handleUpdatePeriod = (id: string, updates: Partial<PeriodConfig>) => {
    setPeriods(periods.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  // 10. 단일 모드 빠른 프리셋 핸들러 (상대 프리셋 타입 저장)
  const applySinglePreset = (preset: SingleDatePreset) => {
    setSinglePreset(preset);
    const computed = computeSinglePresetRange(preset);
    setSingleStartDate(computed.start);
    setSingleEndDate(computed.end);
  };

  // 11. 비교 모드 빠른 프리셋 핸들러 (상대 템플릿 프리셋 저장)
  const applyComparePreset = (preset: ComparePreset) => {
    setComparePreset(preset);
    const computed = computeComparePresetPeriods(preset);
    if (computed) {
      setPeriods(computed);
    }
  };

  // 데이터가 아예 없을 때의 Empty 처리
  if (!sheet || !sheet.rows || sheet.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs min-h-[300px] gap-3">
        <AlertCircle className="w-8 h-8 text-amber-500/70" />
        <span>통계를 계산할 데이터가 시트에 없습니다.</span>
      </div>
    );
  }

  const isSingleDateFiltered = Boolean(singleStartDate || singleEndDate);

  return (
    <div className="flex-1 p-5 md:p-6 flex flex-col gap-5 overflow-y-auto max-h-[700px] bg-slate-50/50">
      {/* 🌟 1. 헤더 컨트롤 바: 모드 전환 & 기준 날짜 열 선택 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* 모드 전환 탭 */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>단일 일자 구간 조회</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compare')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'compare'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-purple-600" />
              <span>기간별 상호 비교 (A/B)</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-semibold">
                최대 4개
              </span>
            </button>
          </div>

          {/* 🌟 최종 설정 자동 저장 안내 배지 */}
          <div className="hidden xl:flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-medium">
            <Check className="w-3 h-3" />
            <span>설정 자동 저장됨</span>
          </div>

          {/* 기준 날짜 열 드롭다운 */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 text-xs">
            <span className="text-slate-500 font-medium shrink-0">기준 일자 열:</span>
            <select
              value={selectedDateCol}
              onChange={(e) => setSelectedDateCol(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-blue-400 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer transition"
            >
              {sheet.headers.map((h) => (
                <option key={h} value={h}>
                  {h} {detectedDateCols.includes(h) ? '★ (날짜 인식됨)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 표 데이터 탭 연동 필터 알림 / 전체 초기화 버튼 */}
        <div className="flex items-center gap-2">
          {isFiltered && (
            <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
              <Filter className="w-3 h-3 text-amber-600" />
              <span>표 탭 필터 연동 중 ({filteredRows?.length}행)</span>
            </div>
          )}
          {(onResetFilter || onClearSearch) && isFiltered && (
            <button
              type="button"
              onClick={() => {
                if (onResetFilter) onResetFilter();
                if (onClearSearch) onClearSearch();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>표 필터 해제</span>
            </button>
          )}
        </div>
      </div>

      {/* 🌟 2-A. [단일 모드] 일자 구간 필터 바 */}
      {viewMode === 'single' && (
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>조회 기간 설정:</span>
              </span>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <input
                  type="date"
                  value={singleStartDate}
                  onChange={(e) => {
                    setSingleStartDate(e.target.value);
                    setSinglePreset('custom');
                  }}
                  className="bg-transparent text-xs text-slate-800 font-mono font-semibold outline-none cursor-pointer"
                />
                <span className="text-slate-400 text-xs">~</span>
                <input
                  type="date"
                  value={singleEndDate}
                  onChange={(e) => {
                    setSingleEndDate(e.target.value);
                    setSinglePreset('custom');
                  }}
                  className="bg-transparent text-xs text-slate-800 font-mono font-semibold outline-none cursor-pointer"
                />
              </div>

              {isSingleDateFiltered && (
                <button
                  type="button"
                  onClick={() => applySinglePreset('all')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition cursor-pointer"
                  title="일자 구간 초기화"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>구간 해제</span>
                </button>
              )}
            </div>

            {/* 원클릭 빠른 프리셋 버튼 (현재 활성 뱃지 하이라이트 & 상대 날짜 보존) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">빠른 선택:</span>
              <button
                type="button"
                onClick={() => applySinglePreset('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  singlePreset === 'all' || (!singleStartDate && !singleEndDate && singlePreset !== 'custom')
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => applySinglePreset('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  singlePreset === 'today'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600'
                }`}
                title="방문한 당일 기준 실시간 집계"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => applySinglePreset('week')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  singlePreset === 'week'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600'
                }`}
                title="방문일 기준 최근 7일 동적 집계"
              >
                최근 7일
              </button>
              <button
                type="button"
                onClick={() => applySinglePreset('month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  singlePreset === 'month'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600'
                }`}
                title="방문일 기준 당월 1일~오늘 동적 집계"
              >
                이번 달
              </button>
              <button
                type="button"
                onClick={() => applySinglePreset('quarter')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  singlePreset === 'quarter'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600'
                }`}
                title="방문일 기준 최근 3개월 동적 집계"
              >
                최근 3개월
              </button>
            </div>
          </div>

          {/* 단일 모드 집계 대상 안내 뱃지 */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              기준 열 <span className="font-bold text-slate-700">[{selectedDateCol || '전체'}]</span> 기준{' '}
              {isSingleDateFiltered ? (
                <span className="font-semibold text-blue-700">
                  {singleStartDate || '최초'} ~ {singleEndDate || '현재'} 기간
                </span>
              ) : (
                <span className="font-semibold text-slate-700">시트 전체 기간</span>
              )}
            </span>
            <span className="font-mono text-slate-600 font-bold">
              총 <span className="text-blue-600">{singleEffectiveRows.length.toLocaleString('ko-KR')}</span> /{' '}
              {sheet.rows.length.toLocaleString('ko-KR')}행 집계 중
            </span>
          </div>
        </div>
      )}

      {/* 🌟 2-B. [비교 모드] 복수 기간 설정 & 대상 카드(지표) 선택 바 */}
      {viewMode === 'compare' && (
        <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-xs flex flex-col gap-4">
          {/* 비교 프리셋 및 기간 추가 컨트롤 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>원클릭 비교 템플릿:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyComparePreset('mom')}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition cursor-pointer"
                >
                  전월 대비 (MoM)
                </button>
                <button
                  type="button"
                  onClick={() => applyComparePreset('wow')}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition cursor-pointer"
                >
                  전주 대비 (WoW)
                </button>
                <button
                  type="button"
                  onClick={() => applyComparePreset('3months')}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition cursor-pointer"
                >
                  최근 3개월 추이 (3개)
                </button>
                <button
                  type="button"
                  onClick={() => applyComparePreset('4quarters')}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition cursor-pointer"
                >
                  4개 분기 총괄 (Q1~Q4)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddPeriod}
              disabled={periods.length >= 4}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                periods.length >= 4
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs active:scale-95'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>기간 추가 ({periods.length}/4)</span>
            </button>
          </div>

          {/* 기간 목록 인풋 그리드 (2~4개 동적) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {periods.map((p, idx) => {
              const theme = THEME_STYLES[p.colorTheme];
              const result = periodResults.find((r) => r.period.id === p.id);
              const isBase = idx === 0;

              return (
                <div
                  key={p.id}
                  className={`border rounded-xl p-3 flex flex-col gap-2 transition ${theme.border} ${theme.bg}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${theme.badge}`}>
                        {isBase ? '기준 기간' : `비교 기간 #${idx + 1}`}
                      </span>
                      <input
                        type="text"
                        value={p.label}
                        onChange={(e) => handleUpdatePeriod(p.id, { label: e.target.value })}
                        className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 outline-none w-28 px-1"
                        placeholder="기간 라벨"
                      />
                    </div>
                    {periods.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePeriod(p.id)}
                        className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                        title="이 기간 제거"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
                    <input
                      type="date"
                      value={p.startDate}
                      onChange={(e) => handleUpdatePeriod(p.id, { startDate: e.target.value })}
                      className="bg-transparent text-[11px] text-slate-800 font-mono font-semibold outline-none w-full"
                    />
                    <span className="text-slate-300">~</span>
                    <input
                      type="date"
                      value={p.endDate}
                      onChange={(e) => handleUpdatePeriod(p.id, { endDate: e.target.value })}
                      className="bg-transparent text-[11px] text-slate-800 font-mono font-semibold outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>데이터 매칭:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {result?.rowCount.toLocaleString('ko-KR') ?? 0}건
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🎯 비교 대상 지표(카드) 선택 칩 영역 */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>비교 대상 지표(카드) 선택:</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (의미 없는 No/순번은 제외하고 핵심 지표만 집중 조명합니다)
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllMetrics}
                  className="text-[11px] text-purple-700 hover:underline font-semibold cursor-pointer"
                >
                  전체 선택
                </button>
                <span className="text-slate-300 text-xs">|</span>
                <button
                  type="button"
                  onClick={handleResetMetrics}
                  className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                >
                  스마트 기본값 복원
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {allNumStatKeys.map((colName) => {
                const isSelected = selectedMetricCols.includes(colName);
                return (
                  <button
                    key={colName}
                    type="button"
                    onClick={() => handleToggleMetric(colName)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                    <span>{colName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 3-A. [단일 모드 결과 렌더링] 상단 KPI 카드 & 개별 통계 카드 */}
      {viewMode === 'single' && (
        <>
          {/* 상단 KPI 개요 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  {isSingleDateFiltered || isFiltered ? '조회 대상 행 수' : '총 데이터 행 수'}
                </span>
                {(isSingleDateFiltered || isFiltered) && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                    구간 필터 적용
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {singleEffectiveRows.length.toLocaleString('ko-KR')}{' '}
                <span className="text-xs font-normal text-slate-400">행</span>
              </div>
              {(isSingleDateFiltered || isFiltered) && (
                <div className="text-[11px] text-slate-400 mt-1">
                  전체 시트{' '}
                  <span className="font-mono font-bold text-slate-600">
                    {sheet.rows.length.toLocaleString('ko-KR')}
                  </span>
                  행 중
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-xs font-bold text-slate-500">총 열(컬럼) 수</span>
              <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
                {sheet.headers.length.toLocaleString('ko-KR')}{' '}
                <span className="text-xs font-normal text-slate-400">개</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-xs font-bold text-slate-500">통계 분석 대상 숫자 열</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                {allNumStatKeys.length}{' '}
                <span className="text-xs font-normal text-slate-400">개 항목</span>
              </div>
            </div>
          </div>

          {/* 숫자 열별 상세 통계 카드 그리드 */}
          {allNumStatKeys.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>항목별 자동 집계 및 통계 카드</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    (공급가액, 세액, 출금액 등 숫자 데이터를 실시간 산출합니다)
                  </span>
                </div>

                {/* 🎯 단일 모드 통계 카드 선택/필터 컨트롤 */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>표시할 카드 선택 ({selectedMetricCols.length}/{allNumStatKeys.length}):</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllMetrics}
                    className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    전체 선택
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleResetMetrics}
                    className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                    title="순번/일련번호 등 식별 번호를 제외하고 금액/수량 지표만 선택합니다"
                  >
                    스마트 기본값 (순번 제외)
                  </button>
                </div>
              </div>

              {/* 🎯 카드 선택 필터 칩 목록 */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-wrap items-center gap-1.5 shadow-2xs">
                {allNumStatKeys.map((colName) => {
                  const isSelected = selectedMetricCols.includes(colName);
                  return (
                    <button
                      key={colName}
                      type="button"
                      onClick={() => handleToggleMetric(colName)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                      <span>{colName}</span>
                    </button>
                  );
                })}
              </div>

              {/* 0건 안내 배너 (데이터가 없더라도 카드는 0으로 유지) */}
              {isSingleDateFiltered && singleEffectiveRows.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    설정하신 조회 기간({singleStartDate || '시작일'} ~ {singleEndDate || '종료일'})에 부합하는 데이터가 없습니다. (모든 수치가 0으로 집계됩니다)
                  </span>
                </div>
              )}

              {selectedMetricCols.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                  선택된 통계 카드가 없습니다. 상단에서 표시할 카드를 1개 이상 선택해 주세요.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
                  {selectedMetricCols.map((colName) => {
                    const stat = singleSummary?.numericStats[colName];
                    const count = stat?.count ?? 0;
                    const sum = stat?.sum ?? 0;
                    const avg = stat?.avg ?? 0;
                    const max = stat ? (stat.max === -Infinity ? 0 : stat.max) : 0;
                    const min = stat ? (stat.min === Infinity ? 0 : stat.min) : 0;

                    return (
                      <div
                        key={colName}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800">{colName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                              count > 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              유효 {count}건
                            </span>
                          </div>

                          <div className="mt-3">
                            <span className="text-[11px] text-slate-400 font-medium">총합계 (Sum)</span>
                            <div className={`text-xl font-extrabold font-mono ${
                              count > 0 ? 'text-blue-700' : 'text-slate-400'
                            }`}>
                              {sum.toLocaleString('ko-KR')}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">평균값</span>
                              <span className="font-mono font-bold text-slate-700">
                                {avg.toLocaleString('ko-KR')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">최대값</span>
                              <span className={`font-mono font-bold ${count > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {max.toLocaleString('ko-KR')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">최소값</span>
                              <span className="font-mono font-bold text-slate-500">
                                {min.toLocaleString('ko-KR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
              시트 내에 집계 가능한 숫자 컬럼이 없습니다.
            </div>
          )}
        </>
      )}

      {/* 🌟 3-B. [비교 모드 결과 렌더링] 기간별 나란히 비교 카드 그리드 */}
      {viewMode === 'compare' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>기간별 실적 비교 및 증감 분석 카드</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              선택된 지표: <span className="font-bold text-purple-700">{selectedMetricCols.length}</span>개
            </span>
          </div>

          {selectedMetricCols.length === 0 ? (
            <div className="bg-white border border-dashed border-purple-200 rounded-2xl p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6 text-purple-400" />
              <span>선택된 비교 대상 지표가 없습니다. 상단에서 비교할 지표를 1개 이상 선택해 주세요.</span>
              <button
                type="button"
                onClick={handleSelectAllMetrics}
                className="mt-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition"
              >
                전체 지표 선택하기
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {selectedMetricCols.map((colName) => {
                // 기준 기간(Period A)의 통계
                const baseStat = periodResults[0]?.summary?.numericStats[colName];
                const baseSum = baseStat?.sum ?? 0;

                return (
                  <div
                    key={colName}
                    className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-xs transition"
                  >
                    {/* 카드 헤더 */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{colName}</span>
                        <span className="text-[11px] text-slate-400">
                          ({periods.length}개 기간 증감률 비교)
                        </span>
                      </div>
                    </div>

                    {/* 기간별 수치 비교 그리드 */}
                    <div
                      className={`grid gap-3 mt-4 ${
                        periods.length === 2
                          ? 'grid-cols-1 md:grid-cols-2'
                          : periods.length === 3
                          ? 'grid-cols-1 md:grid-cols-3'
                          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      }`}
                    >
                      {periodResults.map((res, pIdx) => {
                        const stat = res.summary?.numericStats[colName];
                        const theme = THEME_STYLES[res.period.colorTheme];
                        const isBase = pIdx === 0;

                        // 증감액 및 증감률(%) 계산 (기준 기간 대비)
                        let diffVal = 0;
                        let diffRate: number | null = null;

                        if (!isBase && stat) {
                          diffVal = stat.sum - baseSum;
                          if (baseSum !== 0) {
                            diffRate = ((stat.sum - baseSum) / Math.abs(baseSum)) * 100;
                          }
                        }

                        return (
                          <div
                            key={res.period.id}
                            className={`border rounded-xl p-3.5 flex flex-col justify-between ${theme.border} ${theme.bg}`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${theme.badge}`}>
                                  {res.period.label}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {stat?.count ?? 0}건
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 font-medium">총합계</div>
                              <div className={`text-xl font-black font-mono mt-0.5 ${theme.text}`}>
                                {stat ? stat.sum.toLocaleString('ko-KR') : '0'}
                              </div>

                              {/* 증감 뱃지 (비교 대상 기간인 경우 표시) */}
                              {!isBase && (
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  {diffRate !== null ? (
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                                        diffVal > 0
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : diffVal < 0
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {diffVal > 0 ? (
                                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : diffVal < 0 ? (
                                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                                      ) : null}
                                      {diffVal > 0 ? '+' : ''}
                                      {diffRate.toFixed(1)}%
                                      <span className="text-[10px] font-normal opacity-80">
                                        ({diffVal > 0 ? '+' : ''}
                                        {diffVal.toLocaleString('ko-KR')})
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">기준금액 0원</span>
                                  )}
                                </div>
                              )}
                              {isBase && (
                                <div className="mt-2 text-[10px] text-slate-400 font-medium">
                                  ★ 비교 기준 기간
                                </div>
                              )}
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">평균값</span>
                              <span className="font-mono font-bold text-slate-700">
                                {stat ? stat.avg.toLocaleString('ko-KR') : '-'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
