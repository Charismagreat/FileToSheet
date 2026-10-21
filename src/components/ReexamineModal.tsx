// c:\dev\FileToSheet\src\components\ReexamineModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Table,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface ComparisonItem {
  field: string;
  current: string | number;
  correct: string | number;
  status: '오류' | '왜곡' | '환각' | '누락' | '일치' | string;
  reason?: string;
}

export interface ReexamineResult {
  hasIssues: boolean;
  summary: string;
  comparisonTable: ComparisonItem[];
  detailedReport?: string;
  correctedRows: Record<string, any>[];
  suggestedRule?: string;
}

interface ReexamineModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  sheetName: string;
  loading: boolean;
  result: ReexamineResult | null;
  error?: string | null;
  onApplyCorrection: (correctedRows: Record<string, any>[], learnRule: boolean, suggestedRule?: string) => Promise<void>;
}

export function ReexamineModal({
  isOpen,
  onClose,
  filename,
  sheetName,
  loading,
  result,
  error,
  onApplyCorrection,
}: ReexamineModalProps) {
  const [learnRule, setLearnRule] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [showDetailedReport, setShowDetailedReport] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!result?.correctedRows) return;
    setApplying(true);
    try {
      await onApplyCorrection(result.correctedRows, learnRule, result.suggestedRule);
      onClose();
    } catch (e) {
      console.error('정정 데이터 적용 실패:', e);
    } finally {
      setApplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '오류':
      case '왜곡':
      case '환각':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case '누락':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case '일치':
      case '정상':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-purple-50/30 to-indigo-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                  AI 원본 1:1 정밀 대조 및 재검토 보고서
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold font-mono">
                  Deep Audit
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                대상 파일: <strong className="text-slate-800">{filename}</strong> · 시트:{' '}
                <strong className="text-indigo-600">[{sheetName}]</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-800 text-sm">원본 문서와 현재 적재 데이터를 1:1 정밀 대조 중입니다...</p>
                <p className="text-slate-400 text-xs">
                  공급자/공급받는자 뒤바뀜, 유령 상호 침범, 2행 품목 환각, 발주번호 누락 등을 철저히 검증하고 있습니다.
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-900 mb-0.5">재검토 진단 실패</h4>
                <p className="text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!loading && result && (
            <>
              {/* 1. 핵심 요약 카드 */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  result.hasIssues
                    ? 'bg-amber-50/80 border-amber-200/90 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                {result.hasIssues ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs">
                      {result.hasIssues ? '⚠️ 원본 대비 불일치 및 왜곡 발견' : '✅ 완벽 일치 (이상 없음)'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium">
                    {result.summary || '원본 문서와 비교 검증이 완료되었습니다.'}
                  </p>
                </div>
              </div>

              {/* 2. 항목별 1:1 정밀 대조표 */}
              {result.comparisonTable && result.comparisonTable.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-purple-600" />
                      <span>항목별 1:1 정밀 대조표 (현재 적재 데이터 vs 원본 실제 내용)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">총 {result.comparisonTable.length}개 항목 대조</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                          <th className="p-2.5 w-24">점검 항목</th>
                          <th className="p-2.5 w-1/3">현재 적재 데이터 (오류)</th>
                          <th className="p-2.5 w-1/3 text-emerald-800">원본 실제 내용 (정답)</th>
                          <th className="p-2.5 text-center w-20">판정</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.comparisonTable.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition">
                            <td className="p-2.5 font-bold text-slate-700 bg-slate-50/40">{item.field}</td>
                            <td className="p-2.5 text-rose-700 font-mono line-through opacity-85">
                              {String(item.current || '(비어있음)')}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-emerald-700 bg-emerald-50/30">
                              {String(item.correct || '(비어있음)')}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getStatusBadge(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. 상세 분석 보고서 (아코디언) */}
              {result.detailedReport && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setShowDetailedReport(!showDetailedReport)}
                    className="w-full p-3 flex items-center justify-between text-slate-700 hover:bg-slate-100/70 transition text-left cursor-pointer font-bold"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>상세 분석 보고서</span>
                    </span>
                    {showDetailedReport ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {showDetailedReport && (
                    <div className="p-3.5 pt-0 border-t border-slate-200/60 bg-white text-slate-700 leading-relaxed whitespace-pre-line text-xs font-mono">
                      {result.detailedReport}
                    </div>
                  )}
                </div>
              )}

              {/* 4. AI 올바른 정정 데이터 미리보기 */}
              {result.correctedRows && result.correctedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>AI가 원본에 맞추어 올바르게 정정한 데이터 ({result.correctedRows.length}개 행)</span>
                    </h4>
                    <span className="text-[11px] text-emerald-600 font-semibold">반영 시 즉시 교체 적재됨</span>
                  </div>

                  <div className="border border-emerald-200 rounded-xl overflow-x-auto shadow-2xs bg-emerald-50/20 max-h-48">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-emerald-100/60 text-emerald-900 border-b border-emerald-200 text-[11px] font-bold">
                          {Object.keys(result.correctedRows[0] || {})
                            .filter((k) => !k.startsWith('_'))
                            .slice(0, 10)
                            .map((k) => (
                              <th key={k} className="p-2">
                                {k}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {result.correctedRows.map((r, rIdx) => (
                          <tr key={rIdx} className="bg-white">
                            {Object.keys(r)
                              .filter((k) => !k.startsWith('_'))
                              .slice(0, 10)
                              .map((k, cIdx) => (
                                <td key={cIdx} className="p-2 font-mono text-slate-800">
                                  {String(r[k] !== undefined && r[k] !== null ? r[k] : '')}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. AI 학습 규칙 영구 반영 체크박스 */}
              {result.suggestedRule && (
                <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={learnRule}
                      onChange={(e) => setLearnRule(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <span>이 정정 내역을 [{sheetName}] 시트의 AI 학습 규칙에 영구 반영합니다.</span>
                  </label>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-mono">
                    자동 학습
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 하단 푸터 액션 바 */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
          >
            닫기 / 유지
          </button>

          {!loading && result && result.correctedRows && result.correctedRows.length > 0 && (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {applying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>정정 데이터 반영 중...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>정정 데이터 즉시 반영 및 AI 학습</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
