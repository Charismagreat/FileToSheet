'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Check,
  HelpCircle,
  Calculator,
  Percent,
  Calendar,
  Layers,
  CopyCheck,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ValidationRule,
  parseNaturalLanguageRule,
  generateDefaultRules,
} from '@/lib/validation-engine';

interface ValidationRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  rules: ValidationRule[];
  onUpdateRules: (newRules: ValidationRule[]) => void;
}

export const ValidationRuleModal: React.FC<ValidationRuleModalProps> = ({
  isOpen,
  onClose,
  headers,
  rules,
  onUpdateRules,
}) => {
  const [activeTab, setActiveTab] = useState<'natural' | 'uniqueness'>('natural');

  // 자연어 규칙 상태
  const [naturalPrompt, setNaturalPrompt] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // 고유값/중복 방지 규칙 직접 만들기 상태
  const availableHeaders = headers.filter((h) => !h.startsWith('_'));
  const [uniqueMode, setUniqueMode] = useState<'single' | 'composite'>('single');
  const [targetCol, setTargetCol] = useState<string>(availableHeaders[0] || '');
  const [compositeCols, setCompositeCols] = useState<string[]>(availableHeaders.slice(0, 2));
  const [customRuleName, setCustomRuleName] = useState('');
  const [customErrorMsg, setCustomErrorMsg] = useState('');
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);

  if (!isOpen) return null;

  // 자연어 규칙 추가 핸들러
  const handleAddNaturalRule = (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    if (!naturalPrompt.trim()) return;

    const parsedRule = parseNaturalLanguageRule(naturalPrompt, headers);
    if (!parsedRule) {
      setParseError(
        '자연어 명령을 규칙으로 변환하지 못했습니다. 테이블의 정확한 열 이름(예: ' +
          availableHeaders.slice(0, 3).join(', ') +
          ' 등)을 포함하여 다시 입력해 주세요.'
      );
      return;
    }

    onUpdateRules([...rules, parsedRule]);
    setNaturalPrompt('');
  };

  // 고유값/중복 직접 추가 핸들러
  const handleAddUniquenessRule = (e: React.FormEvent) => {
    e.preventDefault();

    if (uniqueMode === 'single') {
      if (!targetCol) return;
      const newRule: ValidationRule = {
        id: `user_unique_${Date.now()}`,
        name: customRuleName.trim() || `${targetCol} 고유값(중복 금지) 검증`,
        targetCol,
        type: 'UNIQUE_COLUMN',
        errorMessage: customErrorMsg.trim() || `'${targetCol}' 열에는 중복된 값이 존재하지 않아야 합니다.`,
        enabled: true,
        trimWhitespace,
        caseSensitive,
      };
      onUpdateRules([...rules, newRule]);
    } else {
      if (compositeCols.length < 2) {
        alert('복합 열 조합 검증은 최소 2개 이상의 열을 선택해야 합니다.');
        return;
      }
      const newRule: ValidationRule = {
        id: `user_comp_${Date.now()}`,
        name: customRuleName.trim() || `${compositeCols.join(' + ')} 조합 중복 방지`,
        targetCol: compositeCols[0],
        compositeCols,
        type: 'COMPOSITE_UNIQUE',
        errorMessage: customErrorMsg.trim() || `${compositeCols.join(', ')} 조합이 일치하는 중복 데이터가 감지되었습니다.`,
        enabled: true,
        trimWhitespace,
        caseSensitive,
      };
      onUpdateRules([...rules, newRule]);
    }

    // Reset inputs
    setCustomRuleName('');
    setCustomErrorMsg('');
  };

  const toggleCompositeCol = (col: string) => {
    setCompositeCols((prev) => {
      if (prev.includes(col)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== col);
      } else {
        return [...prev, col];
      }
    });
  };

  // 규칙 토글 (활성/비활성)
  const handleToggleRule = (id: string) => {
    onUpdateRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // 규칙 삭제
  const handleDeleteRule = (id: string) => {
    onUpdateRules(rules.filter((r) => r.id !== id));
  };

  // 추천 기본 규칙 자동 추가
  const handleAutoDetect = () => {
    const defaultRules = generateDefaultRules(headers);
    const existingIds = new Set(rules.map((r) => r.id));
    const newRulesToAdd = defaultRules.filter((r) => !existingIds.has(r.id));

    if (newRulesToAdd.length === 0) {
      alert('현재 테이블 열에 추가할 수 있는 새로운 추천 규칙이 없습니다.');
      return;
    }

    onUpdateRules([...rules, ...newRulesToAdd]);
  };

  // 규칙 타입별 아이콘
  const getRuleIcon = (type: ValidationRule['type']) => {
    switch (type) {
      case 'ARITHMETIC_MULTIPLY':
        return <Calculator className="w-4 h-4 text-indigo-500" />;
      case 'ARITHMETIC_SUM':
        return <Layers className="w-4 h-4 text-emerald-500" />;
      case 'PERCENTAGE':
        return <Percent className="w-4 h-4 text-amber-500" />;
      case 'REGEX':
        return <Calendar className="w-4 h-4 text-sky-500" />;
      case 'UNIQUE_COLUMN':
      case 'COMPOSITE_UNIQUE':
      case 'DUPLICATE_ENTRY':
        return <CopyCheck className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              데이터 유효성 검증 규칙 관리
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              사용자가 정의한 고유값(중복 방지) 및 계산 불일치를 실시간 검출합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('natural')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'natural'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            자연어로 규칙 추가
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('uniqueness')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'uniqueness'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CopyCheck className="w-3.5 h-3.5" />
            고유값 / 중복 방지 규칙 직접 만들기
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. 탭 컨텐츠 */}
          {activeTab === 'natural' ? (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
              <label className="block text-xs font-semibold text-indigo-950 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  자연어로 규칙 추가하기
                </span>
                <span className="text-[11px] font-normal text-indigo-600">
                  예: "주문번호는 고유값이어야 해", "금액은 수량 곱하기 단가"
                </span>
              </label>
              <form onSubmit={handleAddNaturalRule} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={naturalPrompt}
                  onChange={(e) => setNaturalPrompt(e.target.value)}
                  placeholder="예: 주문번호는 중복되면 안 돼 또는 공급가액 + 세액 = 합계금액"
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </form>

              {parseError && (
                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1 bg-rose-50 p-2 rounded-md border border-rose-200">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  {parseError}
                </p>
              )}

              {/* 자연어 빠른 예시 태그 */}
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-indigo-100/80">
                <span className="text-[11px] text-slate-500 self-center">예시:</span>
                {[
                  '주문번호 고유값 검증',
                  '금액은 수량 곱하기 단가',
                  '합계는 공급가액 더하기 세액',
                  '동일일자 동일거래처 중복 전표 감지',
                  '작성일자는 YYYY-MM-DD 날짜',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNaturalPrompt(sample)}
                    className="text-[11px] px-2 py-0.5 bg-white text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100/50 transition-colors cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 직접 고유값 / 중복 방지 빌더 */
            <form onSubmit={handleAddUniquenessRule} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  중복 방지 / 고유값 검증 유형 선택
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setUniqueMode('single')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      uniqueMode === 'single'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    단일 열 고유값 (Unique)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniqueMode('composite')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      uniqueMode === 'composite'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    복합 열 조합 고유 (Composite Key)
                  </button>
                </div>
              </div>

              {uniqueMode === 'single' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    중복을 금지할 대상 열 선택:
                  </label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {availableHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    함께 묶여 고유해야 하는 복합 열들을 선택하세요:
                  </label>
                  <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                    {availableHeaders.map((col) => {
                      const isSelected = compositeCols.includes(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => toggleCompositeCol(col)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
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
                </div>
              )}

              {/* 추가 옵션 */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trimWhitespace}
                    onChange={(e) => setTrimWhitespace(e.target.checked)}
                    className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300"
                  />
                  <span>앞뒤 공백 무시</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300"
                  />
                  <span>대소문자 엄격 구분</span>
                </label>
              </div>

              {/* 커스텀 메시지 및 추가 버튼 */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customErrorMsg}
                  onChange={(e) => setCustomErrorMsg(e.target.value)}
                  placeholder="오류 발생 시 표시할 메시지 (비워두면 자동 생성)"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  고유값 규칙 생성
                </button>
              </div>
            </form>
          )}

          {/* 2. 등록된 검증 규칙 리스트 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                현재 등록된 검증 규칙 ({rules.length}개)
              </h4>
              <button
                type="button"
                onClick={handleAutoDetect}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                테이블 열 기반 기본 규칙 자동 감지
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">등록된 검증 규칙이 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">
                  위 탭에서 자연어로 입력하거나 고유값 규칙을 직접 추가해 보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => {
                  const targetLabel = rule.compositeCols && rule.compositeCols.length > 0
                    ? `조합: ${rule.compositeCols.join(' + ')}`
                    : `대상: ${rule.targetCol}`;

                  return (
                    <div
                      key={rule.id}
                      className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                        rule.enabled
                          ? 'bg-white border-slate-200 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors border cursor-pointer ${
                            rule.enabled
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-md bg-slate-100">
                              {getRuleIcon(rule.type)}
                            </span>
                            <span className="text-sm font-semibold text-slate-800">
                              {rule.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                              {targetLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {rule.errorMessage || '데이터 일치 및 고유 여부를 검사합니다.'}
                          </p>
                          {rule.naturalPrompt && (
                            <p className="text-[11px] text-indigo-500 italic">
                              명령: "{rule.naturalPrompt}"
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="규칙 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 truncate max-w-sm">
            현재 테이블 열: {availableHeaders.join(', ')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};
