'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  Layers,
  FileSpreadsheet,
  FolderOpen,
  HelpCircle,
} from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';
import { apiFetch } from '@/lib/api';

export type ChatScope = 'current_sheet' | 'current_project' | 'all_projects';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectWorkspace[];
  activeProjectIndex: number;
}

const QUICK_CHIPS = [
  '📊 현재 시트의 데이터 요약과 총 건수 알려줘',
  '💰 금액/수량 컬럼의 합계와 평균 구해줘',
  '🔝 가장 큰 수치 상위 5건 목록 뽑아줘',
  '⚠️ 누락되거나 비어있는 필드가 있는지 점검해줘',
];

export function AiChatDrawer({
  isOpen,
  onClose,
  projects,
  activeProjectIndex,
}: AiChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [scope, setScope] = useState<ChatScope>('current_sheet');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  // 컨텍스트 데이터 압축 추출 (LLM 전송용)
  const buildContextData = () => {
    if (scope === 'current_sheet' && currentSheet) {
      return {
        projectName: currentProject?.name,
        sheetName: currentSheet.name,
        headers: currentSheet.headers,
        totalRows: currentSheet.rows.length,
        // 상위 최대 100개 행 데이터 전달 (토큰 효율화)
        rows: currentSheet.rows.slice(0, 100),
      };
    } else if (scope === 'current_project' && currentProject) {
      return {
        projectName: currentProject.name,
        category: currentProject.category,
        sheets: currentProject.sheets.map((s) => ({
          name: s.name,
          headers: s.headers,
          totalRows: s.rows.length,
          sampleRows: s.rows.slice(0, 30),
        })),
      };
    } else {
      // all_projects
      return {
        totalProjects: projects.length,
        projects: projects.map((p) => ({
          name: p.name,
          category: p.category,
          sheets: p.sheets.map((s) => ({
            name: s.name,
            headers: s.headers,
            totalRows: s.rows.length,
            sampleRows: s.rows.slice(0, 15),
          })),
        })),
      };
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const contextData = buildContextData();
      const res = await apiFetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          scope,
          contextData,
          chatHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || '응답을 받지 못했습니다.');

      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: json.answer,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: `⚠️ 오류가 발생했습니다: ${err?.message || '네트워크 연결 상태를 확인해 주세요.'}`,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    if (confirm('대화 내용을 모두 지우고 새 대화를 시작할까요?')) {
      setMessages([]);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex max-w-full">
      {/* 백드롭 (모바일 대응) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs transition-opacity sm:hidden"
      />

      {/* Drawer 패널 */}
      <div className="relative w-screen sm:w-[480px] bg-white shadow-2xl flex flex-col border-l border-slate-200 z-10 animate-in slide-in-from-right duration-200">
        {/* 헤더 */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">AI 데이터 비서</h3>
                <span className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold px-1.5 py-0.2 rounded-full shadow-2xs">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500">모든 시트와 프로젝트를 자연어로 즉시 분석</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition"
                title="새 대화 시작"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 질의 범위 선택 탭 */}
        <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-1 text-[11px] font-bold">
          <span className="text-slate-400 shrink-0">질문 대상:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScope('current_sheet')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                scope === 'current_sheet'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>현재 시트</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('current_project')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                scope === 'current_project'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>현재 프로젝트 전체</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('all_projects')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                scope === 'all_projects'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FolderOpen className="w-3 h-3" />
              <span>전체 프로젝트</span>
            </button>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 mb-1">
                데이터에 대해 무엇이든 물어보세요!
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mb-5 leading-relaxed">
                복잡한 엑셀 수식이나 피벗 테이블 없이, 원하는 통계나 데이터를 말하듯이 질문해 보세요.
              </p>

              {/* 퀵 프롬프트 칩 */}
              <div className="w-full space-y-1.5 text-left">
                <div className="text-[11px] font-bold text-slate-400 mb-1">💡 추천 질문</div>
                {QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/70 hover:border-blue-200 text-slate-700 hover:text-blue-800 text-xs font-medium transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed font-sans">
                      {msg.content}
                    </div>

                    <div
                      className={`flex items-center justify-between mt-2 pt-1 border-t text-[10px] ${
                        msg.role === 'user'
                          ? 'border-blue-500/60 text-blue-200'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.role === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-slate-700 transition"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">복사됨</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>복사</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>시트 데이터를 분석하고 통계를 집계하는 중입니다...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 입력창 영역 */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-blue-500 rounded-2xl p-2 transition focus-within:bg-white"
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="예: '10월 법인카드 총 지출액 얼마야?', '거래처별 건수 보여줘'..."
              className="flex-1 bg-transparent border-0 focus:outline-none text-xs text-slate-800 resize-none p-1 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs shrink-0"
              title="질문 전송 (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-slate-400 mt-1.5 text-center">
            Enter 키를 눌러 전송 (Shift+Enter로 줄바꿈)
          </div>
        </div>
      </div>
    </div>
  );
}
