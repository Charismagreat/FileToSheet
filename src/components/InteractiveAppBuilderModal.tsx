import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Check,
  Plus,
  Layers,
  Database,
  Smartphone,
  BarChart3,
  FileSpreadsheet,
  Table,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';
import { MissingSheetSuggestion, UseCaseOption, UseCaseModule } from '@/app/api/portal/generate-ideas/route';

interface InteractiveAppBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: ParsedSheet[];
  onLaunchPortal: (config: {
    portalName: string;
    useCase: UseCaseOption;
    selectedModuleIds: string[];
    addedSheets?: ParsedSheet[];
  }) => void;
  onAddSheetsToWorkspace?: (newSheets: ParsedSheet[]) => void;
}

export const InteractiveAppBuilderModal: React.FC<InteractiveAppBuilderModalProps> = ({
  isOpen,
  onClose,
  sheets,
  onLaunchPortal,
  onAddSheetsToWorkspace,
}) => {
  const [step, setStep] = useState<'PROMPT' | 'PROPOSAL'>('PROMPT');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // AI 분석 결과
  const [missingSheets, setMissingSheets] = useState<MissingSheetSuggestion[]>([]);
  const [useCases, setUseCases] = useState<UseCaseOption[]>([]);
  const [selectedMissingSheets, setSelectedMissingSheets] = useState<Record<string, boolean>>({});

  // 사용자의 선택
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case_operations');
  const [selectedModuleIds, setSelectedModuleIds] = useState<Record<string, boolean>>({});
  const [portalName, setPortalName] = useState('사내 맞춤형 통합 관리 포털');

  if (!isOpen) return null;

  // 1. AI 분석 및 유스케이스 제안 요청
  const handleAnalyzePrompt = async (promptText = prompt) => {
    if (!promptText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/portal/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          sheets: sheets.map((s) => ({
            name: s.name,
            headers: s.headers,
            rows: (s.rows || []).slice(0, 5),
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMissingSheets(data.missingSheets || []);
        setUseCases(data.useCases || []);

        // 기본적으로 부족한 시트 모두 체크
        const initMissing: Record<string, boolean> = {};
        (data.missingSheets || []).forEach((ms: MissingSheetSuggestion) => {
          initMissing[ms.id] = true;
        });
        setSelectedMissingSheets(initMissing);

        // 첫 번째 유스케이스 모듈들 기본 체크
        if (data.useCases && data.useCases.length > 0) {
          const firstCase = data.useCases[0];
          setSelectedCaseId(firstCase.id);
          const initMods: Record<string, boolean> = {};
          firstCase.modules.forEach((m: UseCaseModule) => {
            initMods[m.id] = true;
          });
          setSelectedModuleIds(initMods);
        }

        setStep('PROPOSAL');
      } else {
        alert(data.error || '분석 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      alert('서버 통신 실패: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 유스케이스 선택 변경
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    const targetCase = useCases.find((c) => c.id === caseId);
    if (targetCase) {
      const nextMods: Record<string, boolean> = {};
      targetCase.modules.forEach((m) => {
        nextMods[m.id] = true;
      });
      setSelectedModuleIds(nextMods);
    }
  };

  // 모듈 체크 토글
  const handleToggleModule = (modId: string) => {
    setSelectedModuleIds((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  // 최종 웹앱 론칭
  const handleCompleteLaunch = () => {
    const activeCase = useCases.find((c) => c.id === selectedCaseId) || useCases[0];
    const chosenModIds = Object.keys(selectedModuleIds).filter((id) => selectedModuleIds[id]);

    // 승인된 보조 시트들을 ParsedSheet 형태로 변환
    const newSheetsToAdd: ParsedSheet[] = missingSheets
      .filter((ms) => selectedMissingSheets[ms.id])
      .map((ms) => ({
        name: ms.name,
        headers: ms.headers,
        rows: ms.sampleRows,
        rawRows: [],
        relations: ms.foreignKeys.map((fk) => ({
          foreignKey: fk.foreignKey,
          targetSheetName: fk.targetSheetName,
          targetKey: fk.targetKey,
          displayColumns: [fk.targetKey],
        })),
      }));

    // 워크스페이스에 보조 시트 추가 반영
    if (newSheetsToAdd.length > 0 && onAddSheetsToWorkspace) {
      onAddSheetsToWorkspace(newSheetsToAdd);
    }

    onLaunchPortal({
      portalName,
      useCase: activeCase,
      selectedModuleIds: chosenModIds,
      addedSheets: newSheetsToAdd,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-purple-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  AI 인터랙티브 웹앱 빌더 (No-Code App Generator)
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Co-Creation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                자연어로 원하는 앱을 설명하면, AI가 최적의 사용 사례와 부족한 시트/샘플 데이터를 제안합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: 프롬프트 입력 단계 */}
          {step === 'PROMPT' && (
            <div className="space-y-6 max-w-2xl mx-auto py-6">
              <div className="text-center space-y-2">
                <h4 className="text-xl font-bold text-slate-800">
                  어떤 업무용 웹앱을 만들고 싶으신가요?
                </h4>
                <p className="text-xs text-slate-500">
                  현재 보유하신 <strong className="text-indigo-600 font-bold">{sheets.length}개 시트</strong>의 구조를 분석하여 최적의 모듈과 부족한 보조 시트를 역제안해 드립니다.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="예: 고객사별로 주문을 접수받고, 출고 배송까지 한눈에 추적할 수 있는 직원용 관리 프로그램을 만들어줘"
                    className="w-full px-4 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 resize-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyzePrompt()}
                    disabled={isLoading || !prompt.trim()}
                    className="absolute right-3 bottom-3.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isLoading ? '데이터 분석 및 사례 설계 중...' : '맞춤 사례 제안 받기'}
                  </button>
                </div>

                {/* 추천 예시 프롬프트 칩 */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-semibold text-slate-500">추천 업무 템플릿:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '고객사 발주 받고 출고까지 관리하는 웹앱',
                      '거래처별 미수금 현황과 세금계산서 정산 포털',
                      '자재 입출고 및 안전재고 부족 알림 현장 앱',
                      '직원별 근태 기록 및 월별 급여 관리 프로그램',
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrompt(sample);
                          handleAnalyzePrompt(sample);
                        }}
                        className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl transition border border-slate-200 text-left"
                      >
                        "{sample}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: 제안 검토 및 모듈 조합 단계 */}
          {step === 'PROPOSAL' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* 상단: 프롬프트 요약 & 포털 명칭 설정 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    요청 분석 결과
                  </span>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>"{prompt}"</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium">웹앱 이름:</label>
                  <input
                    type="text"
                    value={portalName}
                    onChange={(e) => setPortalName(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setStep('PROMPT')}
                    className="text-xs text-indigo-600 hover:underline px-2 py-1"
                  >
                    프롬프트 다시 작성
                  </button>
                </div>
              </div>

              {/* 🌟 1. 부족한 보조 시트 및 생생한 샘플 데이터 자동 증강 제안 영역 */}
              {missingSheets.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600" />
                        💡 완성도 높은 웹앱 가동을 위해 {missingSheets.length}개의 보조 시트 생성을 추천합니다!
                      </h4>
                      <p className="text-xs text-amber-800/80 mt-0.5">
                        실제 업무에 필요한 표준 컬럼과 <strong>현실적인 샘플 데이터(3건)</strong>를 함께 채워 넣어 드립니다.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {missingSheets.map((ms) => {
                      const isChecked = Boolean(selectedMissingSheets[ms.id]);
                      return (
                        <div
                          key={ms.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isChecked
                              ? 'bg-white border-amber-300 shadow-sm'
                              : 'bg-white/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  setSelectedMissingSheets((prev) => ({
                                    ...prev,
                                    [ms.id]: !prev[ms.id],
                                  }))
                                }
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              />
                              <span className="font-bold text-xs text-slate-800">
                                ➕ [{ms.name}] 시트 신규 생성
                              </span>
                            </label>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                              샘플 3행 포함
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mb-2">{ms.description}</p>
                          <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg font-mono border border-slate-200/80 truncate">
                            컬럼: {ms.headers.join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 🌟 2. 3대 다각도 맞춤형 유스케이스 선택 & 조합 영역 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-600" />
                    AI 맞춤 제안 3대 사용 사례 (하나를 선택하거나 모듈을 조합하세요)
                  </h4>
                  <span className="text-xs text-slate-500">
                    선택된 모듈: {Object.values(selectedModuleIds).filter(Boolean).length}개
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {useCases.map((opt) => {
                    const isSelected = selectedCaseId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectCase(opt.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {opt.badge}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <h5 className="font-bold text-sm text-slate-800">{opt.title}</h5>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-semibold text-slate-400">
                            포함 모듈:
                          </span>
                          {opt.modules.map((m) => (
                            <div
                              key={m.id}
                              className="text-[11px] text-slate-600 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{m.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 🌟 3. 선택된 모듈 세부 체크박스 (레고식 조합) */}
              {selectedCaseId && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      선택된 사용 사례의 모듈 구성 (자유롭게 켜고 끌 수 있습니다)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {useCases
                      .find((c) => c.id === selectedCaseId)
                      ?.modules.map((m) => {
                        const isChecked = Boolean(selectedModuleIds[m.id]);
                        return (
                          <label
                            key={m.id}
                            className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                              isChecked
                                ? 'bg-white border-indigo-200 shadow-2xs'
                                : 'bg-slate-100/60 border-slate-200 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleModule(m.id)}
                              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-slate-800">{m.name}</div>
                              <p className="text-[10px] text-slate-500">{m.description}</p>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {step === 'PROMPT'
              ? 'AI가 기존 시트의 외래키와 수식을 분석하여 맞춤 템플릿을 생성합니다.'
              : '선택하신 모듈들이 조립된 반응형 웹앱이 즉시 생성됩니다.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              취소
            </button>
            {step === 'PROPOSAL' && (
              <button
                type="button"
                onClick={handleCompleteLaunch}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <span>🚀 선택된 구성으로 웹앱 즉시 론칭</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
