'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { DuplicateGroup } from '@/hooks/useTableEditor';

interface DeduplicateRowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateGroup[];
  headers: string[];
  totalSheetRows: number;
  onConfirmDeduplicate: (selectedIndices: number[]) => void;
}

export function DeduplicateRowsModal({
  isOpen,
  onClose,
  duplicateGroups,
  headers,
  totalSheetRows,
  onConfirmDeduplicate,
}: DeduplicateRowsModalProps) {
  // 모든 중복 행의 원본 index 목록 (기본 전체 선택)
  const allDuplicateIndices = useMemo(() => {
    return duplicateGroups.flatMap((g) => g.duplicateRows.map((d) => d.originIdx));
  }, [duplicateGroups]);

  // 선택된 삭제 대상 index 집합
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set(allDuplicateIndices));

  // 모달이 새로 열리거나 duplicateGroups가 변경될 때 기본값 재설정
  React.useEffect(() => {
    setSelectedIndices(new Set(allDuplicateIndices));
  }, [allDuplicateIndices]);

  // 그룹 접기/펼치기 상태 관리 (기본 모두 펼침)
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

  // 그룹 접기 토글
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // 표시할 컬럼 헤더 (일련번호, _시작 메타데이터 제외, 최대 6개 우선 표시)
  const visibleHeaders = headers
    .filter((h) => !h.startsWith('_') && h !== '일련번호' && h !== '등록일시')
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-purple-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col text-slate-800 relative overflow-hidden">
        {/* 상단 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-md">
                  스마트 데이터 정리
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  발견된 중복: <strong className="text-purple-700 font-bold">{totalDuplicatesCount}건</strong> ({duplicateGroups.length}개 그룹)
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                중복 행 정리 미리보기
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 요약 안내 배너 */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              기준이 되는 <strong>최초 1건(보존)</strong>은 유지되며, 이후 추가된 <strong>동일 중복 행(삭제)</strong>이 기본 선택되어 있습니다.
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs font-medium">
              <span className="text-slate-500">정리 후 시트:</span>
              <span className="font-bold text-slate-800">{totalSheetRows}행</span>
              <span className="text-slate-400">→</span>
              <span className="font-bold text-purple-600">{remainingRowsEstimate}행</span>
              <span className="text-[11px] text-red-500 font-semibold">(-{selectedCount}행)</span>
            </div>

            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
            >
              {selectedIndices.size === allDuplicateIndices.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                  <span>전체 해제</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>전체 선택</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 중복 그룹 목록 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          {duplicateGroups.map((group, groupIdx) => {
            const isCollapsed = collapsedGroups[group.groupId];
            const groupIndices = group.duplicateRows.map((d) => d.originIdx);
            const selectedInGroup = groupIndices.filter((idx) => selectedIndices.has(idx)).length;
            const isAllGroupSelected = groupIndices.length > 0 && selectedInGroup === groupIndices.length;

            return (
              <div
                key={group.groupId}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition"
              >
                {/* 그룹 헤더 바 */}
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.groupId)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition cursor-pointer"
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      중복 그룹 #{groupIdx + 1}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2 py-0.2 rounded-md">
                      총 {group.duplicateRows.length + 1}건 (보존 1건 / 삭제 {group.duplicateRows.length}건)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleGroupSelect(group)}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                    >
                      {isAllGroupSelected ? '이 그룹 삭제 해제' : '이 그룹 전체 삭제 선택'}
                    </button>
                  </div>
                </div>

                {/* 그룹 내 행 목록 테이블 */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                          <th className="py-2 px-3 w-12 text-center">선택</th>
                          <th className="py-2 px-3 w-16">구분</th>
                          <th className="py-2 px-3 w-16 text-center">행 번호</th>
                          <th className="py-2 px-3 min-w-[120px]">출처 파일</th>
                          {visibleHeaders.map((h) => (
                            <th key={h} className="py-2 px-3 min-w-[100px] text-slate-700">
                              {h}
                            </th>
                          ))}
                          <th className="py-2 px-3 w-28 text-slate-400">등록일시</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* 1. 보존 원본 행 */}
                        <tr className="bg-emerald-50/30 hover:bg-emerald-50/50 transition">
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] leading-4 text-center">
                              ✓
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md">
                              보존
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                            {group.primaryRow.row['일련번호'] || group.primaryRow.originIdx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded max-w-[160px] truncate"
                              title={group.primaryRow.fileName || '직접 입력/기존'}
                            >
                              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{group.primaryRow.fileName || '기존 데이터'}</span>
                            </span>
                          </td>
                          {visibleHeaders.map((h) => (
                            <td key={h} className="py-2.5 px-3 text-slate-800 font-medium max-w-[180px] truncate">
                              {String(group.primaryRow.row[h] ?? '')}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-[10px] text-slate-400 font-mono">
                            {group.primaryRow.uploadedAt || group.primaryRow.row['등록일시'] || '-'}
                          </td>
                        </tr>

                        {/* 2. 중복(삭제) 행들 */}
                        {group.duplicateRows.map((dup) => {
                          const isSelected = selectedIndices.has(dup.originIdx);

                          return (
                            <tr
                              key={dup.originIdx}
                              onClick={() => toggleIndex(dup.originIdx)}
                              className={`transition cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-50/40 hover:bg-rose-50/70 text-slate-700'
                                  : 'bg-white hover:bg-slate-50 text-slate-500 opacity-60'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleIndex(dup.originIdx)}
                                  className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                {isSelected ? (
                                  <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-md">
                                    삭제
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                    보존
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                {dup.row['일련번호'] || dup.originIdx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded max-w-[160px] truncate"
                                  title={dup.fileName || '중복 적재'}
                                >
                                  <FileText className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span className="truncate">{dup.fileName || '중복 적재 파일'}</span>
                                </span>
                              </td>
                              {visibleHeaders.map((h) => (
                                <td
                                  key={h}
                                  className={`py-2.5 px-3 max-w-[180px] truncate ${
                                    isSelected ? 'line-through text-slate-400' : 'text-slate-700'
                                  }`}
                                >
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
          })}
        </div>

        {/* 하단 고정 액션 버튼 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>삭제 후 일련번호(1, 2, 3...)는 자동으로 빈틈없이 재부여됩니다.</span>
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
                onConfirmDeduplicate(Array.from(selectedIndices));
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
