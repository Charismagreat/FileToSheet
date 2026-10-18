'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, Trash2, HelpCircle, Layers, Lightbulb, Brain, Wand2 } from 'lucide-react';

interface SheetRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetIndex: number;
  sheetName: string;
  sheetHeaders: string[];
  sheetRowCount?: number;
  sampleRows?: Record<string, any>[];
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
  sheetRowCount = 0,
  sampleRows = [],
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

  /**
   * 시트 내 누적 데이터에서 대표 패턴을 스스로 감지하여 자연어 규칙으로 변환
   */
  const handleMineRulesFromData = () => {
    if (!sampleRows || sampleRows.length === 0) return;

    const detectedRules: string[] = [];

    // 1. 비고 태그 패턴 감지 (예: [식대], [소액경비], [승인대기] 등)
    const tags = new Set<string>();
    for (const r of sampleRows) {
      const remark = String(r['비고'] || '');
      const matches = remark.match(/\[([가-힣a-zA-Z0-9_\s]+)\]/g);
      if (matches) {
        matches.forEach((t) => tags.add(t));
      }
    }
    if (tags.size > 0) {
      const tagList = Array.from(tags).slice(0, 4).join(', ');
      detectedRules.push(`기존 데이터에 사용된 계정/상태 태그(${tagList}) 양식을 계승하여 적절히 분류해줘.`);
    }

    // 2. 날짜 컬럼 형식 감지
    const dateCol = sheetHeaders.find((h) => h.includes('일자') || h.includes('일시') || h.includes('날짜'));
    if (dateCol) {
      detectedRules.push(`'${dateCol}' 컬럼은 기존 적재 데이터와 동일하게 표준 날짜 규격(YYYY-MM-DD)으로 맞춰줘.`);
    }

    // 3. 금액/부가세 관련 컬럼 감지
    const hasVat = sheetHeaders.some((h) => h.includes('세액') || h.includes('부가세'));
    const hasSupply = sheetHeaders.some((h) => h.includes('공급가') || h.includes('금액'));
    if (hasVat && hasSupply) {
      detectedRules.push(`공급가액과 세액은 기존 데이터와 같이 10:1 분리 계산 규칙을 일관되게 유지해줘.`);
    }

    if (detectedRules.length === 0) {
      detectedRules.push(`기존에 적재된 ${sheetRowCount}건의 데이터 양식과 동일한 표기 스타일을 유지해줘.`);
    }

    const autoPrompt = detectedRules.map((r, i) => `${i + 1}. ${r}`).join('\n');
    if (!ruleText.trim()) {
      setRuleText(autoPrompt);
    } else {
      setRuleText((prev) => prev.trim() + '\n' + autoPrompt);
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

          {/* 🧠 누적 데이터 In-Context 학습 상태 배너 */}
          {sheetRowCount > 0 ? (
            <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-blue-50/40 rounded-2xl border border-purple-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-900">누적 데이터 In-Context 학습 활성화</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                        {sheetRowCount}건의 패턴 참조 중
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-700 leading-tight mt-1">
                      다음 파일 업로드 시, 기존에 적재된 날짜 포맷, 계정 분류 태그, 비고 스타일을 AI가 모범 예시(Few-Shot)로 자동 학습하여 완벽한 일관성으로 처리합니다.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMineRulesFromData}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100/70 border border-purple-300 text-purple-800 font-extrabold text-xs transition shadow-2xs cursor-pointer"
                  title="기존에 적재된 데이터의 날짜, 태그, 컬럼 패턴을 분석하여 규칙 문구를 자동으로 채워넣습니다."
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>누적 패턴 규칙 자동 완성</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <Brain className="w-4 h-4 text-slate-400 shrink-0" />
              <span>현재 시트에 데이터가 아직 없습니다. 첫 파일이 적재되면 <strong>자동 누적 학습(In-Context Learning)</strong>이 즉시 활성화됩니다.</span>
            </div>
          )}

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
