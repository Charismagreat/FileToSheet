'use client';

import { apiFetch } from '@/lib/api';
import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  ShieldCheck, 
  Cpu, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  FileSpreadsheet, 
  Eye, 
  EyeOff, 
  Clock, 
  Layers, 
  Code2, 
  Video, 
  Zap, 
  ArrowRight, 
  Copy, 
  Check, 
  Wrench,
  ExternalLink
} from 'lucide-react';
import { Project } from '@/types/project';
import { maskRowData } from '@/lib/maskingUtils';

interface FdeSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId?: string;
  onApplyPatch: (patch: {
    targetSheetName: string;
    newColumns: string[];
    sampleRows: Record<string, any>[];
    appsScriptSnippet?: string;
    title: string;
  }) => void;
}

const QUICK_TAGS = [
  '🧮 복잡한 계산 및 정산 수식 오류',
  '🔗 국세청 / 카카오톡 외부 API 연동',
  '🔄 시트 간 외래키 매핑 및 다중 조인',
  '🧹 비정형/지저분한 엑셀 데이터 정제',
  '📱 CRUD 웹앱 포털 커스텀 기능 개발',
  '🚨 대량 데이터 성능 저하 및 최적화',
];

export default function FdeSupportModal({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onApplyPatch,
}: FdeSupportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<'formula' | 'integration' | 'join' | 'performance' | 'other'>('formula');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [supportType, setSupportType] = useState<'async_patch' | 'live_pairing'>('async_patch');
  const [showMaskingPreview, setShowMaskingPreview] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 결과 상태
  const [ticketId, setTicketId] = useState<string>('');
  const [techSpec, setTechSpec] = useState<any>(null);
  const [proposedPatch, setProposedPatch] = useState<any>(null);
  const [fdeComment, setFdeComment] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  if (!isOpen) return null;

  // 현재 활성 프로젝트 정보 추출
  const activeProj = projects.find(p => p.id === activeProjectId) || projects[0];
  const originalRows = activeProj?.tableData?.rows?.slice(0, 3) || [];
  const maskedRows = originalRows.map(row => maskRowData(row));

  // 1단계 -> 2단계: AI 진단 & FDE 명세서 생성
  const handleDiagnose = async () => {
    if (!issueDescription.trim()) {
      setErrorMsg('해결하고 싶은 문제나 요청 사항을 간략히 적어주세요.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 마스킹된 시트 컨텍스트 구성
      const sheetsPayload = projects.map(p => ({
        name: p.name,
        headers: p.tableData?.headers || [],
        rowCount: p.tableData?.rows?.length || 0,
        sampleRows: (p.tableData?.rows?.slice(0, 3) || []).map(r => maskRowData(r))
      }));

      const res = await apiFetch('/api/fde/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueDescription,
          category,
          sheets: sheetsPayload,
          supportType
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'FDE 사전 진단 중 오류가 발생했습니다.');
      }

      setTicketId(data.ticketId);
      setTechSpec(data.techSpec);
      setProposedPatch(data.proposedPatch);
      setFdeComment(data.fdeComment || '');
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2단계 -> 3단계: 티켓 접수 승인 및 솔루션 패치 수신 확인
  const handleSubmitTicket = () => {
    setStep(3);
  };

  // 3단계: 솔루션 패치 원클릭 병합
  const handleApply = () => {
    if (!proposedPatch) return;
    onApplyPatch({
      targetSheetName: proposedPatch.targetSheetName || `${activeProj?.name || '시트'}_솔루션`,
      newColumns: proposedPatch.newColumns || [],
      sampleRows: proposedPatch.sampleRows || [],
      appsScriptSnippet: proposedPatch.appsScriptSnippet,
      title: proposedPatch.title,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* 상단 헤더 */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-inner">
              <Wrench className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">전문개발자(FDE) SOS 협업 지원</h3>
                <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Forward Deployed Engineer
                </span>
              </div>
              <p className="text-xs text-amber-100/90 font-normal">
                스스로 만들기 어려운 복잡한 수식, 외부 API 연동, 데이터 정제를 전문 엔지니어가 직접 해결해 드립니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 진행 단계 인디케이터 (Stepper) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500 shrink-0">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-orange-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            <span>어려움 접수 & 마스킹</span>
          </div>
          <div className="w-8 h-px bg-slate-300" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-orange-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            <span>AI 진단 & FDE 기술 명세</span>
          </div>
          <div className="w-8 h-px bg-slate-300" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-green-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            <span>솔루션 패치 & 원클릭 병합</span>
          </div>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: 어려움 접수 및 개인정보 마스킹 안심 실드 */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* 빠른 질문 태그 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  자주 발생하는 문제 유형 (클릭하여 자동 입력)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIssueDescription(prev => prev ? `${prev}, ${tag.slice(2)}` : tag.slice(2));
                        if (tag.includes('수식')) setCategory('formula');
                        else if (tag.includes('API')) setCategory('integration');
                        else if (tag.includes('조인')) setCategory('join');
                        else if (tag.includes('정제')) setCategory('other');
                        else if (tag.includes('포털')) setCategory('other');
                      }}
                      className="text-xs bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border border-slate-200 px-2.5 py-1.5 rounded-xl transition text-slate-700 font-medium"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 문제 상세 기술창 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>어려움을 겪고 계신 내용을 편하게 설명해 주세요 *</span>
                  <span className="text-[11px] font-normal text-slate-400">비전문가 언어로 편하게 적으셔도 됩니다</span>
                </label>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="예: 고객사별로 공급가액의 3% 또는 5% 마진을 차등 적용해서 정산하고 싶은데, 수식이 자꾸 #VALUE 오류가 나요. 그리고 국세청 세금계산서와 대조할 수 있는 시트도 필요합니다."
                  className="w-full text-xs p-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-800 placeholder-slate-400 bg-slate-50/50"
                />
              </div>

              {/* 지원 방식 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  지원 방식 선택
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    onClick={() => setSupportType('async_patch')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      supportType === 'async_patch' 
                        ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-200' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">비동기 솔루션 패치 (추천)</span>
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.2 rounded-full">무료</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        FDE가 맞춤형 수식/스크립트/시트를 제작하여 원클릭 적용 패치로 보내드립니다.
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSupportType('live_pairing')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      supportType === 'live_pairing' 
                        ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-200' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">15분 긴급 실시간 페어링</span>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full">Google Meet</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        FDE와 화면을 공유하며 1:1로 문제를 즉시 진단하고 해결합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🔒 개인정보 마스킹 안심 실드 미리보기 */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      개인정보 보호 마스킹 실드 (안심 전송)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMaskingPreview(prev => !prev)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                  >
                    {showMaskingPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showMaskingPreview ? '마스킹 미리보기 접기' : '마스킹 미리보기 펼치기'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  엔지니어에게 전달되는 데이터는 전화번호, 이메일, 주민/사업자번호, 계좌번호 등이 100% 자동 마스킹되어 안심하고 의뢰하실 수 있습니다.
                </p>

                {showMaskingPreview && originalRows.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* 원본 샘플 */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <span>내 원본 데이터 샘플</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-600 space-y-1 overflow-x-auto max-h-24">
                        {originalRows.slice(0, 2).map((r, i) => (
                          <div key={i} className="truncate">
                            {JSON.stringify(r)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 마스킹 샘플 */}
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                      <div className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>FDE에게 전달되는 마스킹 데이터 (완전 보호)</span>
                      </div>
                      <div className="font-mono text-[11px] text-emerald-900 space-y-1 overflow-x-auto max-h-24">
                        {maskedRows.slice(0, 2).map((r, i) => (
                          <div key={i} className="truncate">
                            {JSON.stringify(r)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: AI 사전 진단 & FDE 기술 명세서 변환 */}
          {step === 2 && techSpec && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* 티켓 발행 배너 */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider block">
                    FDE 지원 티켓 발급 완료
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                    티켓 번호: <span className="font-mono text-orange-700">{ticketId}</span>
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500">예상 소요 시간</span>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>{techSpec.estimatedTime || '15분 이내'}</span>
                  </div>
                </div>
              </div>

              {/* FDE 기술 명세서 카드 */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-slate-300">AI가 FDE 전담 엔지니어용으로 변환한 기술 명세 (Tech Spec)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    techSpec.difficulty === 'Easy' ? 'bg-green-600/30 text-green-300 border border-green-500/50' :
                    techSpec.difficulty === 'Medium' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50' :
                    'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  }`}>
                    난이도: {techSpec.difficulty}
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-extrabold text-white">{techSpec.title}</h5>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{techSpec.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-800/60 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">근본 원인 (Root Cause)</span>
                    <p className="text-slate-200 text-[11px] leading-relaxed">{techSpec.rootCause}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">FDE 3단계 조치 계획 (Action Plan)</span>
                    <ul className="list-disc list-inside text-slate-200 text-[11px] space-y-0.5">
                      {techSpec.actionPlan?.map((plan: string, i: number) => (
                        <li key={i}>{plan}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {fdeComment && (
                  <div className="text-xs text-amber-200 bg-amber-950/40 border border-amber-800/40 p-3 rounded-xl flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-amber-300 block mb-0.5">FDE 엔지니어 메시지:</span>
                      {fdeComment}
                    </div>
                  </div>
                )}
              </div>

              {/* 솔루션 패치 미리보기 */}
              {proposedPatch && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>준비된 솔루션 패치: <span className="text-indigo-600 font-extrabold">{proposedPatch.title}</span></span>
                  </div>
                  <p className="text-xs text-slate-600">{proposedPatch.description}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: 솔루션 패치 수신 및 원클릭 병합 */}
          {step === 3 && proposedPatch && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-emerald-950">
                    FDE 맞춤형 솔루션 패치가 도착했습니다!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    전문 엔지니어가 작성한 시트 스키마, 수식 및 Apps Script 코드를 검토 후 즉시 내 프로젝트에 병합할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 패치 상세 내역 카드 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Patch Details</span>
                    <h5 className="text-sm font-extrabold text-slate-900">{proposedPatch.title}</h5>
                  </div>
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                    신규 시트 추가: {proposedPatch.targetSheetName}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {proposedPatch.description}
                </p>

                {/* 생성될 컬럼 목록 */}
                {proposedPatch.newColumns && proposedPatch.newColumns.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">생성 및 연결될 컬럼 헤더</span>
                    <div className="flex flex-wrap gap-1.5">
                      {proposedPatch.newColumns.map((col: string, idx: number) => (
                        <span key={idx} className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 샘플 행 데이터 미리보기 */}
                {proposedPatch.sampleRows && proposedPatch.sampleRows.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">패치에 포함된 실무 샘플 데이터 (3행)</span>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                        <thead className="bg-slate-50 font-bold text-slate-700">
                          <tr>
                            {proposedPatch.newColumns.map((col: string, idx: number) => (
                              <th key={idx} className="px-3 py-2 whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-mono text-[11px]">
                          {proposedPatch.sampleRows.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-50/80">
                              {proposedPatch.newColumns.map((col: string, cIdx: number) => (
                                <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                                  {String(row[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 필요 시 Apps Script 코드 스니펫 */}
                {proposedPatch.appsScriptSnippet && (
                  <div className="bg-slate-900 rounded-xl p-3.5 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" /> Google Apps Script / JavaScript 커스텀 함수
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(proposedPatch.appsScriptSnippet);
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2000);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedScript ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedScript ? '복사됨' : '코드 복사'}</span>
                      </button>
                    </div>
                    <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-950/80 rounded-lg max-h-28">
                      {proposedPatch.appsScriptSnippet}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* 하단 액션 버튼 바 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl transition"
              >
                이전 단계로
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl transition"
            >
              닫기
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={handleDiagnose}
                disabled={isLoading}
                className="text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin text-amber-200" />
                    <span>AI 사전 진단 & FDE 명세 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>FDE 기술 명세서 작성 및 진단 요청</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleSubmitTicket}
                className="text-xs font-bold bg-gradient-to-r from-orange-600 to-indigo-600 hover:from-orange-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>티켓 최종 접수 & 솔루션 패치 확인</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleApply}
                className="text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 ring-2 ring-emerald-400/50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>내 프로젝트에 패치 적용하기 (1-Click Merge)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
