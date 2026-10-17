'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, X, Download, BarChart3, CheckSquare, Square,
  Layers, RefreshCw, Trash2, ArrowUpRight, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserSession } from '@/types/workspace';

interface SharedSheetItem {
  id: number;
  senderPhone: string;
  senderBranch: string;
  receiverPhone: string;
  projectName: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  rowCount: number;
  sharedAt: string;
}

interface ConsolidatedStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
}

export function ConsolidatedStatsModal({
  isOpen,
  onClose,
  currentUser,
}: ConsolidatedStatsModalProps) {
  const [items, setItems] = useState<SharedSheetItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'preview'>('stats');

  // 1. 나에게 공유된 사업소 시트 목록 조회
  const fetchSharedSheets = async () => {
    if (!currentUser?.phoneNumber) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/share/to-manager?receiverPhone=${currentUser.phoneNumber}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
        // 기본적으로 모든 시트 전체 선택
        setSelectedIds(data.items.map((it: SharedSheetItem) => it.id));
      }
    } catch (e) {
      console.error('공유 수신함 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSharedSheets();
    }
  }, [isOpen, currentUser?.phoneNumber]);

  // 공유 항목 개별 삭제
  const handleDeleteItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 공유 시트를 수신함에서 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/share/to-manager?id=${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelectedIds((prev) => prev.filter((selId) => selId !== id));
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 선택 토글
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((it) => it.id));
    }
  };

  // 2. 선택된 시트들 기반 통합 집계 연산 (메모이제이션)
  const consolidated = useMemo(() => {
    const selectedItems = items.filter((it) => selectedIds.includes(it.id));
    let totalRows = 0;
    const branchStats: Record<string, { branch: string; rowCount: number; amount: number }> = {};
    const consolidatedRows: Record<string, any>[] = [];
    const allHeadersSet = new Set<string>(['소속사업소', '프로젝트', '시트명']);

    selectedItems.forEach((item) => {
      totalRows += item.rows.length;
      if (!branchStats[item.senderBranch]) {
        branchStats[item.senderBranch] = { branch: item.senderBranch, rowCount: 0, amount: 0 };
      }
      branchStats[item.senderBranch].rowCount += item.rows.length;

      item.headers.forEach((h) => allHeadersSet.add(h));

      item.rows.forEach((row) => {
        // 금액성 컬럼(금액, 합계, 공급가액, 결제금액 등) 자동 탐색 및 합산
        let rowAmount = 0;
        for (const [key, val] of Object.entries(row)) {
          if (/금액|합계|공급가|총액|결제/.test(key)) {
            const num = Number(String(val).replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) rowAmount += num;
          }
        }
        branchStats[item.senderBranch].amount += rowAmount;

        consolidatedRows.push({
          소속사업소: item.senderBranch,
          프로젝트: item.projectName,
          시트명: item.sheetName,
          ...row,
        });
      });
    });

    const branchList = Object.values(branchStats).sort((a, b) => b.rowCount - a.rowCount);
    const maxBranchRows = Math.max(...branchList.map((b) => b.rowCount), 1);
    const totalAmount = branchList.reduce((acc, cur) => acc + cur.amount, 0);

    return {
      selectedItems,
      totalRows,
      branchList,
      maxBranchRows,
      totalAmount,
      consolidatedRows,
      headers: Array.from(allHeadersSet),
    };
  }, [items, selectedIds]);

  // 3. 전사 통합 엑셀 일괄 다운로드
  const handleDownloadConsolidatedXlsx = () => {
    if (consolidated.consolidatedRows.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(consolidated.consolidatedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '전사_사업소_통합데이터');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `FileToSheet_전사통합집계_${today}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-blue-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">전사 사업소 공유 수신함 & 롤업 통계</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                  총 {items.length}개 시트
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                각 사업소 담당자가 공유한 시트를 모아서 통계를 분석하고 통합 엑셀을 내려받습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 사업소 시트 선택 목록 바 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition cursor-pointer"
                >
                  {selectedIds.length === items.length && items.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>전체 선택 ({selectedIds.length}/{items.length})</span>
                </button>
              </div>
              <button
                onClick={fetchSharedSheets}
                className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition"
                title="새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">공유받은 사업소 시트가 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">
                  사업소 담당자가 시트 상단의 [총괄 담당자에게 공유]를 통해 회원님의 휴대폰 번호로 시트를 보내면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-600 text-white">
                            {item.senderBranch}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                            {item.sheetName}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition"
                          title="공유 항목 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 font-mono">
                        <span>{item.rowCount.toLocaleString()}개 행</span>
                        <span>{item.sharedAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 통합 통계 요약 카드 & 탭 */}
          {items.length > 0 && (
            <div className="space-y-4">
              {/* 핵심 지표 3종 배너 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">선택된 사업소</span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {consolidated.branchList.length} <span className="text-sm font-normal text-slate-500">개소</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                  <span className="text-xs text-indigo-700 font-medium">전사 통합 데이터 행 수</span>
                  <div className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">
                    {consolidated.totalRows.toLocaleString()} <span className="text-sm font-normal text-indigo-500">행</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-medium">합산 추정 금액</span>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
                    {consolidated.totalAmount > 0
                      ? `${Math.round(consolidated.totalAmount).toLocaleString()}원`
                      : '집계 중'}
                  </div>
                </div>
              </div>

              {/* 탭 전환 버튼 */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'stats'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>사업소별 비교 차트</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'preview'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>통합 표 미리보기 ({consolidated.consolidatedRows.length}행)</span>
                  </button>
                </div>

                {/* 통합 엑셀 다운로드 버튼 */}
                <button
                  onClick={handleDownloadConsolidatedXlsx}
                  disabled={consolidated.consolidatedRows.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-98 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>전사 통합 엑셀 다운로드</span>
                </button>
              </div>

              {/* 탭 1: 사업소별 비교 차트 */}
              {activeTab === 'stats' && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700">사업소별 데이터 건수 및 금액 비교</h4>
                  <div className="space-y-2.5">
                    {consolidated.branchList.map((branch, idx) => {
                      const percent = Math.round((branch.rowCount / consolidated.maxBranchRows) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800">{branch.branch}</span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {branch.rowCount.toLocaleString()}건
                              {branch.amount > 0 ? ` (${Math.round(branch.amount).toLocaleString()}원)` : ''}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 탭 2: 통합 표 미리보기 */}
              {activeTab === 'preview' && (
                <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-60 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr>
                        {consolidated.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-slate-700 font-semibold truncate border-r border-slate-200">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {consolidated.consolidatedRows.slice(0, 30).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {consolidated.headers.map((h, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 border-r border-slate-200 truncate max-w-xs text-slate-700 font-mono">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {consolidated.consolidatedRows.length > 30 && (
                    <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                      (미리보기는 상위 30행만 표시됩니다. 전체 {consolidated.consolidatedRows.length}행은 엑셀 다운로드로 확인하세요.)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
