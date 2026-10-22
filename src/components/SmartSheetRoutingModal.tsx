'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Table as TableIcon,
} from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';
import { RoutingRecommendation } from '@/lib/sheet-similarity';

interface SmartSheetRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  incomingHeaders: string[];
  recommendation: RoutingRecommendation | null;
  currentProject: ProjectWorkspace | null;
  onConfirm: (
    mode: 'new_sheet' | 'append_rows',
    targetSheetIndex?: number,
    customNewSheetName?: string,
    customPrompt?: string
  ) => void;
}

export function SmartSheetRoutingModal({
  isOpen,
  onClose,
  fileName,
  incomingHeaders,
  recommendation,
  currentProject,
  onConfirm,
}: SmartSheetRoutingModalProps) {
  // 🌟 React Hooks 규칙 준수: early return 이전에 모든 Hook 최상단 선언
  const [selectedMode, setSelectedMode] = useState<'append_rows' | 'new_sheet'>(
    recommendation?.recommendedMode || 'new_sheet'
  );

  const [targetSheetIdx, setTargetSheetIdx] = useState<number>(
    recommendation?.hasGoodMatch && recommendation.bestMatch
      ? recommendation.bestMatch.sheetIndex
      : currentProject?.activeSheetIndex ?? 0
  );

  const [newSheetName, setNewSheetName] = useState<string>(
    recommendation?.suggestedNewSheetName || '새 시트'
  );

  useEffect(() => {
    if (recommendation && currentProject) {
      setSelectedMode(recommendation.recommendedMode);
      if (recommendation.hasGoodMatch && recommendation.bestMatch) {
        setTargetSheetIdx(recommendation.bestMatch.sheetIndex);
      } else {
        setTargetSheetIdx(currentProject.activeSheetIndex ?? 0);
      }
      setNewSheetName(recommendation.suggestedNewSheetName || '새 시트');
    }
  }, [recommendation, currentProject]);

  if (!isOpen || !recommendation || !currentProject) return null;

  const sheets = currentProject.sheets || [];
  const hasGoodMatch = recommendation.hasGoodMatch;

  const handleSubmit = () => {
    onConfirm(
      selectedMode,
      selectedMode === 'append_rows' ? targetSheetIdx : undefined,
      selectedMode === 'new_sheet' ? newSheetName.trim() : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <span className="text-[10.5px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                AI 스마트 시트 라우팅
              </span>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                적재 위치를 선택해 주세요
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 (스크롤 가능) */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* 1. 업로드된 파일 정보 요약 */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800 truncate" title={fileName}>
                  {fileName}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                {incomingHeaders.length}개 열 감지
              </span>
            </div>

            {/* 감지된 주요 컬럼 태그들 */}
            <div className="flex flex-wrap gap-1 pt-1">
              {incomingHeaders.slice(0, 6).map((col, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[10.5px] font-mono"
                >
                  {col}
                </span>
              ))}
              {incomingHeaders.length > 6 && (
                <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">
                  외 {incomingHeaders.length - 6}개
                </span>
              )}
            </div>
          </div>

          {/* 2. AI 분석 진단 메시지 배너 */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-2.5 leading-relaxed ${
              hasGoodMatch
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            {hasGoodMatch ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block mb-0.5">
                {hasGoodMatch ? '💡 기존 시트와 양식 일치 감지' : '⚠️ 새로운 양식의 문서 감지'}
              </span>
              <span>{recommendation.reason}</span>
            </div>
          </div>

          {/* 3. 옵션 선택 카드들 */}
          <div className="space-y-2.5 pt-1">
            {/* 옵션 A: 새 시트 생성 */}
            <div
              onClick={() => setSelectedMode('new_sheet')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition relative ${
                selectedMode === 'new_sheet'
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {!hasGoodMatch && (
                <span className="absolute right-3 top-3 px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded-full shadow-2xs">
                  ⭐️ AI 추천
                </span>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedMode === 'new_sheet'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedMode === 'new_sheet' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-sm">
                      새 시트로 분리 생성하여 적재
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    이 문서 고유의 열 구조를 온전히 보존하여 전용 표를 만듭니다.
                  </p>

                  {selectedMode === 'new_sheet' && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-semibold shrink-0">
                        시트 이름:
                      </span>
                      <input
                        type="text"
                        value={newSheetName}
                        onChange={(e) => setNewSheetName(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 flex-1"
                        placeholder="새 시트 이름"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 옵션 B: 기존 시트에 행 추가 */}
            <div
              onClick={() => setSelectedMode('append_rows')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition relative ${
                selectedMode === 'append_rows'
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {hasGoodMatch && (
                <span className="absolute right-3 top-3 px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded-full shadow-2xs">
                  ⭐️ AI 추천
                </span>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedMode === 'append_rows'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedMode === 'append_rows' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-sm">
                      기존 시트에 행(Row) 추가
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    동일한 양식의 시트 아래에 누적하여 데이터를 합칩니다.
                  </p>

                  {selectedMode === 'append_rows' && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-semibold shrink-0">
                        대상 시트:
                      </span>
                      <select
                        value={targetSheetIdx}
                        onChange={(e) => setTargetSheetIdx(Number(e.target.value))}
                        className="px-2.5 py-1 text-xs border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 flex-1"
                      >
                        {sheets.map((s, idx) => {
                          const matchItem = recommendation.allMatches.find(
                            (m) => m.sheetIndex === idx
                          );
                          const ratio = matchItem ? matchItem.matchRatio : 0;
                          return (
                            <option key={idx} value={idx}>
                              {s.name} ({s.rows.length}행 적재 중) — 일치율 {ratio}%
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 하단 버튼 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95"
          >
            <span>적재 진행</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
