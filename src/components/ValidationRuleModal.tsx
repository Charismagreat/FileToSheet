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
  const [naturalPrompt, setNaturalPrompt] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

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
          headers.slice(0, 3).join(', ') +
          ' 등)을 포함하여 다시 입력해 주세요.'
      );
      return;
    }

    onUpdateRules([...rules, parsedRule]);
    setNaturalPrompt('');
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
    // 기존 규칙과 중복되지 않는 것만 추가
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
              자연어나 자동 감지를 통해 행별 계산 불일치 및 데이터 오류를 실시간 검출합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. 자연어 규칙 입력창 */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
            <label className="block text-xs font-semibold text-indigo-950 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                자연어로 규칙 추가하기
              </span>
              <span className="text-[11px] font-normal text-indigo-600">
                예: "금액은 수량 곱하기 단가여야 해"
              </span>
            </label>
            <form onSubmit={handleAddNaturalRule} className="flex gap-2 mt-2">
              <input
                type="text"
                value={naturalPrompt}
                onChange={(e) => setNaturalPrompt(e.target.value)}
                placeholder="예: 공급가액과 세액을 더한 값이 합계금액이어야 해"
                className="flex-1 px-3.5 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
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
                '금액은 수량 곱하기 단가',
                '합계는 공급가액 더하기 세액',
                '세액은 공급가액의 10%',
                '작성일자는 YYYY-MM-DD 날짜',
              ].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNaturalPrompt(sample)}
                  className="text-[11px] px-2 py-0.5 bg-white text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100/50 transition-colors"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>

          {/* 2. 등록된 검증 규칙 리스트 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                현재 등록된 검증 규칙 ({rules.length}개)
              </h4>
              <button
                type="button"
                onClick={handleAutoDetect}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
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
                  위 입력창에 자연어로 입력하거나 [기본 규칙 자동 감지]를 눌러보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                      rule.enabled
                        ? 'bg-white border-slate-200 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id)}
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors border ${
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
                            대상: {rule.targetCol}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {rule.errorMessage || '계산 및 포맷 일치 여부를 검사합니다.'}
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="규칙 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            현재 테이블 열: {headers.join(', ')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
