// c:\dev\FileToSheet\src\components\AntigravitySkillModal.tsx
'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Download,
  CheckCircle,
  Copy,
  Terminal,
  FolderCheck,
  ChevronRight,
  Database,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

interface AntigravitySkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone?: string;
  projectId?: string | number;
  projectName?: string;
}

export const AntigravitySkillModal: React.FC<AntigravitySkillModalProps> = ({
  isOpen,
  onClose,
  userPhone,
  projectId,
  projectName,
}) => {
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [installedPaths, setInstalledPaths] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleOneClickInstall = async () => {
    setInstalling(true);
    setInstallSuccess(null);
    try {
      const res = await fetch('/api/antigravity/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: userPhone,
          projectId: projectId ? String(projectId) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstallSuccess('안티그라비티 스킬이 성공적으로 등록되었습니다!');
        setInstalledPaths(data.installedPaths || []);
      } else {
        alert(data.error || '스킬 설치 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      alert(err?.message || '스킬 설치 요청 실패');
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyPrompt = (promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(promptText);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const examplePrompts = [
    '이번 달 영수증대장에서 식대 총액이랑 가장 많이 쓴 거래처 TOP 5 뽑아줘',
    '화물배송대장에서 현재 배송 상태가 "배송완료"가 아닌 건만 표로 정리해줘',
    '결제입금내역 시트에서 이번 주 일자별 출금액 합계를 꺾은선 차트로 그려줘',
    '통화녹음대장에서 통화시간 3분 이상이고 핵심키워드가 "견적"인 건 찾아줘',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 상단 헤더 */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">안티그라비티(Antigravity) AI 스킬 연결</h3>
                <span className="text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Text-to-SQL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                대화창에서 자연어로 파일투시트 장부 데이터를 초고속 조회·집계·시각화하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs">
          {/* 장부 바인딩 상태 안내 */}
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="font-bold text-indigo-950 text-xs">현재 연결 장부: </span>
                <span className="font-extrabold text-indigo-700">{projectName || '내 장부'}</span>
                {projectId && <span className="text-[11px] text-slate-400 ml-1.5">(ID: {projectId})</span>}
              </div>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-xl shadow-2xs border border-indigo-100">
              {userPhone ? `${userPhone} 계정 바인딩` : '자동 계정 매핑'}
            </span>
          </div>

          {/* 방법 1: 원클릭 자동 설치 */}
          <div className="p-4 bg-white border-2 border-indigo-600/20 rounded-2xl hover:border-indigo-600/40 transition shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-slate-900 text-sm">내 안티그라비티에 원클릭 자동 설치 (권장)</h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                원클릭 완성
              </span>
            </div>
            <p className="text-slate-500 mb-3 text-[11px] leading-relaxed">
              현재 PC의 안티그라비티 글로벌 스킬 폴더(<code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">~/.gemini/antigravity/skills/filetosheet/</code>)에 전용 쿼리 엔진과 가이드를 즉시 설치합니다.
            </p>

            <button
              onClick={handleOneClickInstall}
              disabled={installing}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
            >
              {installing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>스킬 자동 설치 중...</span>
                </>
              ) : installSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>스킬 설치 완료! 다시 설치하기</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>⚡ 내 안티그라비티에 스킬 즉시 설치 및 동기화</span>
                </>
              )}
            </button>

            {installSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{installSuccess}</span>
                </div>
                <div className="text-[10px] text-emerald-700 space-y-0.5">
                  <div>설치된 경로:</div>
                  {installedPaths.map((p, idx) => (
                    <div key={idx} className="font-mono bg-white/70 px-2 py-0.5 rounded border border-emerald-100 truncate">
                      • {p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 방법 2: 패키지 ZIP 다운로드 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-extrabold text-[11px] flex items-center justify-center">
                  2
                </span>
                <h4 className="font-bold text-slate-900 text-sm">스킬 패키지 파일 다운로드 (.zip)</h4>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                수동 설치용
              </span>
            </div>
            <p className="text-slate-500 mb-3 text-[11px] leading-relaxed">
              다른 환경이나 팀원의 PC에 수동으로 설치하고자 할 때 압축 파일을 내려받아 <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">.agents/skills/</code> 폴더에 풀어주세요.
            </p>

            <a
              href={`/api/antigravity/skill?download=zip&projectId=${projectId || ''}`}
              download="filetosheet-skill.zip"
              className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 rounded-xl transition shadow-2xs text-xs"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>📦 filetosheet-skill.zip 내려받기</span>
            </a>
          </div>

          {/* 대화창 추천 질문 가이드 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Terminal className="w-4 h-4 text-purple-600" />
              <span>안티그라비티 채팅창에서 이렇게 질문해 보세요!</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {examplePrompts.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopyPrompt(p)}
                  className="group flex items-center justify-between p-2.5 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-200 rounded-xl cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 group-hover:text-purple-950">
                    <ChevronRight className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>"{p}"</span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 group-hover:text-purple-600 hover:bg-purple-100 transition"
                    title="프롬프트 복사"
                  >
                    {copiedPrompt === p ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            설치 후 안티그라비티가 자동으로 스킬을 감지하여 바로 실행합니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition text-xs shadow-2xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
