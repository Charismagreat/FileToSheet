'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, Trash2, HelpCircle, Layers, Lightbulb } from 'lucide-react';

interface SheetRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetIndex: number;
  sheetName: string;
  sheetHeaders: string[];
  initialRule?: string;
  onSaveRule: (sheetIndex: number, rule: string) => void;
}

const PRESET_RULES = [
  {
    icon: '🏷️',
    title: '가맹점/용도별 자동 분류 태깅',
    description: '가맹점명에 맞춰 비고란에 비용 계정과목 태그 자동 부여',
    prompt: '가맹점명이나 거래처명에 따라 비고란에 [식대], [교통비], [소모품비], [도서인쇄비] 등으로 계정과목을 분류하여 기록해줘.',
  },
  {
    icon: '💰',
    title: '부가세 10% 자동 분리 계산',
    description: '부가세 미표기 영수증도 공급가액과 세액을 분리 산출',
    prompt: '영수증이나 전표에 부가세가 별도 표기되어 있지 않아도, 결제금액에서 공급가액과 부가세(10%)를 10:1 비율로 자동 계산하여 각각의 컬럼에 채워줘.',
  },
  {
    icon: '📅',
    title: '날짜 및 사업자번호 포맷 통일',
    description: '날짜(YYYY-MM-DD)와 사업자번호 하이픈 규격 통일',
    prompt: '거래일자는 반드시 YYYY-MM-DD 형식으로 통일하고, 사업자등록번호는 000-00-00000 형태로 하이픈을 정확히 삽입해줘.',
  },
  {
    icon: '⚠️',
    title: '금액 검산 및 판독 이상 알림',
    description: '공급가+세액 합계 불일치 또는 판독 오류 시 주의 표시',
    prompt: '공급가액과 세액의 합이 합계금액과 맞지 않거나, 문서가 훼손되어 식별이 불분명한 항목은 비고에 [검산 필요]를 기재해줘.',
  },
];

export function SheetRuleModal({
  isOpen,
  onClose,
  sheetIndex,
  sheetName,
  sheetHeaders = [],
  initialRule = '',
  onSaveRule,
}: SheetRuleModalProps) {
  const [ruleText, setRuleText] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setRuleText(initialRule || '');
    }
  }, [isOpen, initialRule]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetPrompt: string) => {
    if (!ruleText.trim()) {
      setRuleText(presetPrompt);
    } else {
      setRuleText((prev) => prev.trim() + '\n' + presetPrompt);
    }
  };

  const handleClear = () => {
    if (confirm('설정된 규칙을 초기화하시겠습니까?')) {
      setRuleText('');
    }
  };

  const handleSave = () => {
    onSaveRule(sheetIndex, ruleText.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 모달 헤더 */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-600 uppercase tracking-wider">AI Schema & Rules</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800 font-mono">
                  {sheetName}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">시트별 AI 분석·적재 규칙 설정</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. 모달 본문 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 설명 박스 */}
          <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              이 시트에 파일이 추가되거나 다중 파일 자동 분류 시, AI가 <strong>최우선으로 준수할 규칙을 자연어로 지정</strong>할 수 있습니다.
              금액 계산, 가맹점별 계정 태깅, 포맷 통일 등 원하는 지침을 자유롭게 작성해 보세요.
            </div>
          </div>

          {/* 현재 시트 컬럼 안내 */}
          {sheetHeaders.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2">📊 현재 시트 컬럼 규격 ({sheetHeaders.length}개):</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {sheetHeaders.map((header, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4대 추천 프리셋 템플릿 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>자주 사용하는 추천 규칙 템플릿 (클릭 시 추가)</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_RULES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset.prompt)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/50 text-left transition group shadow-2xs cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{preset.icon}</span>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition">
                      {preset.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight line-clamp-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 자연어 규칙 입력창 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-extrabold text-slate-800">
                ✏️ 자연어 분석·적재 규칙 직접 입력
              </label>
              {ruleText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>비우기</span>
                </button>
              )}
            </div>
            <textarea
              rows={5}
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              placeholder="예시)&#10;1. 가맹점명에 따라 비고에 [식대], [교통비], [소모품비]로 분류해서 달아줘.&#10;2. 부가세가 안 적혀 있어도 결제금액의 10%를 부가세로 자동 계산해서 분리해줘.&#10;3. 사업자번호는 000-00-00000 형태로 하이픈을 꼭 넣어줘."
              className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-normal leading-relaxed resize-none transition bg-white"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              * 작성된 규칙은 이 시트의 속성으로 저장되며, 추후 다중 파일 드롭 시 AI가 해당 시트에 맞춤 적재할 때 적용됩니다.
            </p>
          </div>
        </div>

        {/* 3. 모달 푸터 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
          >
            취소
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition transform hover:scale-102 active:scale-98"
          >
            <Check className="w-3.5 h-3.5" />
            <span>규칙 저장 및 적용</span>
          </button>
        </div>
      </div>
    </div>
  );
}
