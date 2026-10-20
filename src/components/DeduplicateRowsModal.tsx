'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  X,
  Trash2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Check,
  RotateCcw,
} from 'lucide-react';
import { DuplicateGroup, computeDuplicateGroups, DeduplicateOptions } from '@/hooks/useTableEditor';

interface DeduplicateRowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows?: Record<string, any>[];
  headers: string[];
  totalSheetRows: number;
  duplicateGroups?: DuplicateGroup[];
  onConfirmDeduplicate: (selectedIndices: number[], renumberColumn?: string | null) => void;
}

export function DeduplicateRowsModal({
  isOpen,
  onClose,
  rows = [],
  headers,
  totalSheetRows,
  duplicateGroups: initialDuplicateGroups = [],
  onConfirmDeduplicate,
}: DeduplicateRowsModalProps) {
  // 사용 가능한 비즈니스 열 목록 (내부 _ 메타데이터 제외)
  const availableHeaders = useMemo(() => {
    return headers.filter((h) => !h.startsWith('_'));
  }, [headers]);

  // 자동 감지된 기본 순번/메타데이터 열 (무시 후보군)
  const defaultDetectedMetaCols = useMemo(() => {
    const metaKeywords = ['일련번호', '등록일시', 'id', 'no', 'seq', 'created_at', 'timestamp', '생성일시'];
    return availableHeaders.filter((h) => metaKeywords.includes(h.trim().toLowerCase()));
  }, [availableHeaders]);

  // 1. 중복 비교 모드: 'all' (전체 열 일치) vs 'custom' (사용자 지정 기준 열 일치)
  const [matchMode, setMatchMode] = useState<'all' | 'custom'>('all');

  // 2. 사용자 지정 기준 열 (custom 모드 시)
  const [keyColumns, setKeyColumns] = useState<string[]>(() => {
    // 식별자 가능성이 높은 열 우선 추천 (예: 주문번호, 송장번호, 거래처, 이름 등)
    const candidate = availableHeaders.find(
      (h) => h.includes('번호') || h.includes('코드') || h.includes('아이디') || h.toLowerCase().includes('id')
    );
    return candidate ? [candidate] : (availableHeaders.slice(0, 2));
  });

  // 3. 전체 일치 시 무시할 열 목록 (기본: 일련번호/등록일시 등)
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>(() => defaultDetectedMetaCols);

  // 4. 보존 기준: 'first' (최초 등록본 보존) vs 'last' (최근 등록본 보존)
  const [retentionStrategy, setRetentionStrategy] = useState<'first' | 'last'>('first');

  // 5. 순번 열 재부여 설정
  const defaultRenumberCol = useMemo(() => {
    return availableHeaders.find(
      (h) => h === '일련번호' || h.toLowerCase() === 'no' || h.toLowerCase() === 'seq' || h.includes('순번')
    );
  }, [availableHeaders]);

  const [shouldRenumber, setShouldRenumber] = useState<boolean>(!!defaultRenumberCol);
  const [renumberCol, setRenumberCol] = useState<string>(defaultRenumberCol || '일련번호');

  // 기준 변경 시 실시간 중복 그룹 재계산
  const activeDuplicateGroups = useMemo(() => {
    if (rows && rows.length > 0) {
      return computeDuplicateGroups(rows, headers, {
        matchMode,
        keyColumns,
        ignoredColumns,
        retentionStrategy,
      });
    }
    return initialDuplicateGroups;
  }, [rows, headers, matchMode, keyColumns, ignoredColumns, retentionStrategy, initialDuplicateGroups]);

  // 모든 중복 행의 원본 index 목록
  const allDuplicateIndices = useMemo(() => {
    return activeDuplicateGroups.flatMap((g) => g.duplicateRows.map((d) => d.originIdx));
  }, [activeDuplicateGroups]);

  // 선택된 삭제 대상 index 집합 (기본: 전체 중복 행 선택)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set(allDuplicateIndices));

  useEffect(() => {
    setSelectedIndices(new Set(allDuplicateIndices));
  }, [allDuplicateIndices]);

  // 그룹 접기/펼치기 상태 관리
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const totalDuplicatesCount = allDuplicateIndices.length;
  const selectedCount = selectedIndices.size;
  const remainingRowsEstimate = totalSheetRows - selectedCount;

  // 체크박스 토글
  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // 전체 선택 / 해제
  const toggleSelectAll = () => {
    if (selectedIndices.size === allDuplicateIndices.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(allDuplicateIndices));
    }
  };

  // 특정 그룹 전체 선택 / 해제
  const toggleGroupSelect = (group: DuplicateGroup) => {
    const groupIndices = group.duplicateRows.map((d) => d.originIdx);
    const allSelected = groupIndices.every((idx) => selectedIndices.has(idx));

    setSelectedIndices((prev) => {
      const next = new Set(prev);
      groupIndices.forEach((idx) => {
        if (allSelected) {
          next.delete(idx);
        } else {
          next.add(idx);
        }
      });
      return next;
    });
  };

  // 기준 열 토글
  const toggleKeyColumn = (col: string) => {
    setKeyColumns((prev) => {
      if (prev.includes(col)) {
        if (prev.length <= 1) return prev; // 최소 1개 유지
        return prev.filter((c) => c !== col);
      } else {
        return [...prev, col];
      }
    });
  };

  // 무시할 열 토글
  const toggleIgnoredColumn = (col: string) => {
    setIgnoredColumns((prev) => {
      if (prev.includes(col)) {
        return prev.filter((c) => c !== col);
      } else {
        return [...prev, col];
      }
    });
  };

  // 표시할 컬럼 헤더 (최대 6개)
  const visibleHeaders = availableHeaders
    .filter((h) => !ignoredColumns.includes(h))
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-purple-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-slate-800 relative overflow-hidden">
        {/* 상단 헤더 */}
        <div className="px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  중복 데이터 정리 및 검증 설정
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  사용자 맞춤 설정
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                사용자가 지정한 기준 열과 보존 정책에 따라 중복 행을 검출하고 안전하게 정리합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 중복 판별 기준 설정 패널 (사용자 정의 컨트롤) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>중복 판별 기준:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => setMatchMode('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                    matchMode === 'all'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  모든 열 일치 (무시 열 제외)
                </button>
                <button
                  type="button"
                  onClick={() => setMatchMode('custom')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                    matchMode === 'custom'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  지정 기준 열만 비교 (Key Columns)
                </button>
              </div>
            </div>

            {/* 보존 정책 선택 */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">보존 기준:</span>
              <select
                value={retentionStrategy}
                onChange={(e) => setRetentionStrategy(e.target.value as 'first' | 'last')}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="first">최초 등록본 보존 (첫 행 유지)</option>
                <option value="last">최근 등록본 보존 (마지막 행 유지)</option>
              </select>
            </div>
          </div>

          {/* 모드별 열 선택 칩들 */}
          {matchMode === 'custom' ? (
            <div className="bg-white p-2.5 rounded-xl border border-purple-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-purple-900 mr-1 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                일치해야 하는 기준 열:
              </span>
              {availableHeaders.map((col) => {
                const isSelected = keyColumns.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleKeyColumn(col)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {col}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-600 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                비교에서 제외할 열 (무시 열):
              </span>
              {availableHeaders.map((col) => {
                const isIgnored = ignoredColumns.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleIgnoredColumn(col)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      isIgnored
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 line-through'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 중복 요약 및 전체 선택 컨트롤 바 */}
        <div className="px-6 py-2.5 bg-purple-50/50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">
              발견된 중복: <strong className="text-purple-700 font-bold">{totalDuplicatesCount}건</strong> ({activeDuplicateGroups.length}개 그룹)
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              정리 후 예상 행 수: <strong className="text-slate-800 font-bold">{remainingRowsEstimate}행</strong>
            </span>
          </div>

          {totalDuplicatesCount > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 font-semibold text-purple-700 hover:text-purple-900 transition cursor-pointer"
            >
              {selectedIndices.size === allDuplicateIndices.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  <span>전체 선택 해제</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>전체 선택 ({allDuplicateIndices.length}건)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 중복 그룹 목록 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {activeDuplicateGroups.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                선택한 기준에 해당하는 중복 행이 없습니다.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                현재 데이터는 깨끗하거나, 위 패널에서 다른 기준 열(Key Columns)을 선택하여 검사할 수 있습니다.
              </p>
            </div>
          ) : (
            activeDuplicateGroups.map((group, groupIdx) => {
              const groupIndices = group.duplicateRows.map((d) => d.originIdx);
              const isGroupAllSelected = groupIndices.every((idx) => selectedIndices.has(idx));
              const isGroupSomeSelected = groupIndices.some((idx) => selectedIndices.has(idx));
              const isCollapsed = collapsedGroups[group.groupId];

              return (
                <div
                  key={group.groupId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition hover:border-purple-200"
                >
                  {/* 그룹 헤더 */}
                  <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleGroupSelect(group)}
                        className="text-purple-600 hover:text-purple-800 transition cursor-pointer"
                        title={isGroupAllSelected ? '그룹 전체 해제' : '그룹 전체 선택'}
                      >
                        {isGroupAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : isGroupSomeSelected ? (
                          <div className="w-4 h-4 rounded border border-purple-600 bg-purple-100 flex items-center justify-center text-[10px] text-purple-700 font-bold">
                            -
                          </div>
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <span className="font-bold text-slate-800">
                        중복 그룹 #{groupIdx + 1}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        총 {group.duplicateRows.length + 1}건 (보존 1건 / 삭제 {group.duplicateRows.length}건)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                          [group.groupId]: !prev[group.groupId],
                        }))
                      }
                      className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <span>{isCollapsed ? '펼치기' : '접기'}</span>
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 그룹 테이블 내용 */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="py-2 px-3 w-10 text-center">선택</th>
                            <th className="py-2 px-3 w-16">구분</th>
                            <th className="py-2 px-3 w-12 text-center">행번호</th>
                            {visibleHeaders.map((h) => (
                              <th key={h} className="py-2 px-3 truncate max-w-[120px]">
                                {h}
                              </th>
                            ))}
                            <th className="py-2 px-3 w-28 text-slate-400">등록일시</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* 1. 보존 대상 (Primary Row) */}
                          <tr className="bg-emerald-50/40 text-slate-700">
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] leading-4 text-center">
                                ✓
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                보존 (유지)
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                              {group.primaryRow.originIdx + 1}
                            </td>
                            {visibleHeaders.map((h) => (
                              <td key={h} className="py-2.5 px-3 truncate max-w-[120px] font-medium text-slate-900">
                                {String(group.primaryRow.row[h] ?? '')}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-[10px] text-slate-400 font-mono">
                              {group.primaryRow.uploadedAt || group.primaryRow.row['등록일시'] || '-'}
                            </td>
                          </tr>

                          {/* 2. 중복(삭제) 행들 */}
                          {group.duplicateRows.map((dup) => {
                            const isChecked = selectedIndices.has(dup.originIdx);
                            return (
                              <tr
                                key={dup.originIdx}
                                className={`transition ${
                                  isChecked
                                    ? 'bg-purple-50/30 hover:bg-purple-50/50'
                                    : 'bg-white hover:bg-slate-50 opacity-60'
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleIndex(dup.originIdx)}
                                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                    중복 (삭제)
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                  {dup.originIdx + 1}
                                </td>
                                {visibleHeaders.map((h) => (
                                  <td key={h} className="py-2.5 px-3 truncate max-w-[120px] text-slate-600">
                                    {String(dup.row[h] ?? '')}
                                  </td>
                                ))}
                                <td className="py-2.5 px-3 text-[10px] text-slate-400 font-mono">
                                  {dup.uploadedAt || dup.row['등록일시'] || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 하단 고정 액션 버튼 및 순번 재부여 설정 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldRenumber}
                onChange={(e) => setShouldRenumber(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
              />
              <span className="font-medium text-slate-700">
                삭제 후 순번(1, 2, 3...) 자동 재부여
              </span>
            </label>

            {shouldRenumber && availableHeaders.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500">대상 열:</span>
                <select
                  value={renumberCol}
                  onChange={(e) => setRenumberCol(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                >
                  {availableHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => {
                if (selectedCount === 0) return;
                onConfirmDeduplicate(
                  Array.from(selectedIndices),
                  shouldRenumber ? renumberCol : null
                );
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/25 active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>선택한 중복 {selectedCount}개 행 정리하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
