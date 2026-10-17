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
  Plus,
  Maximize2,
  Minimize2,
  Clock,
  History,
  Trash2,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';
import { apiFetch } from '@/lib/api';

export type ChatScope = 'current_sheet' | 'current_project' | 'all_projects';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  scope: ChatScope;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectWorkspace[];
  activeProjectIndex: number;
  onAddNewSheetFromAi?: (sheet: { name: string; headers: string[]; rows: Record<string, any>[] }) => void;
}

const QUICK_CHIPS = [
  '📊 현재 시트의 데이터 요약과 총 건수 알려줘',
  '💰 금액/수량 컬럼의 합계와 평균 구해줘',
  '🔝 가장 큰 수치 상위 5건 목록 뽑아줘',
  '⚠️ 누락되거나 비어있는 필드가 있는지 점검해줘',
];

/**
 * 마크다운 텍스트에서 표 구조를 파싱하여 시트 데이터 객체로 추출
 */
function extractMarkdownTable(content: string): { headers: string[]; rows: Record<string, any>[] } | null {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length < 3) return null;

  const parseRow = (line: string) =>
    line.slice(1, -1).split('|').map((c) => c.trim());

  const headers = parseRow(tableLines[0]);
  if (!tableLines[1].includes('---')) return null;

  const dataLines = tableLines.slice(2);
  const rows: Record<string, any>[] = [];

  for (const line of dataLines) {
    if (!line.includes('|')) continue;
    const cells = parseRow(line);
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] ?? '';
    });
    rows.push(rowObj);
  }

  if (headers.length === 0 || rows.length === 0) return null;
  return { headers, rows };
}

export function AiChatDrawer({
  isOpen,
  onClose,
  projects,
  activeProjectIndex,
  onAddNewSheetFromAi,
}: AiChatDrawerProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [scope, setScope] = useState<ChatScope>('current_sheet');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdSheetMsgId, setCreatedSheetMsgId] = useState<string | null>(null);

  // 🌟 1. 대화창 가로폭 조절 상태 (기본 480px, 최소 380px, 로컬 저장)
  const [drawerWidth, setDrawerWidth] = useState<number>(480);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentProject = projects[activeProjectIndex] || null;
  const currentSheet = currentProject ? currentProject.sheets[currentProject.activeSheetIndex] : null;

  // 프로젝트별 대화 세션 스토리지 키
  const sessionsStorageKey = `filetosheet_ai_sessions_${currentProject?.id || 'default'}`;
  const activeSessionKey = `filetosheet_ai_active_session_${currentProject?.id || 'default'}`;
  const legacyStorageKey = `filetosheet_ai_chat_${currentProject?.id || 'default'}`;

  // 너비 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedWidth = localStorage.getItem('filetosheet_ai_drawer_width');
    if (savedWidth) {
      setDrawerWidth(Math.max(380, Math.min(Number(savedWidth), window.innerWidth - 60)));
    }
  }, []);

  // 🌟 세션 목록 및 구버전 데이터 마이그레이션 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawSessions = localStorage.getItem(sessionsStorageKey);
      let loadedSessions: ChatSession[] = rawSessions ? JSON.parse(rawSessions) : [];

      // 구버전 단일 세션 데이터가 있으면 마이그레이션
      if (loadedSessions.length === 0) {
        const legacyData = localStorage.getItem(legacyStorageKey);
        if (legacyData) {
          const oldMessages: ChatMessage[] = JSON.parse(legacyData);
          if (Array.isArray(oldMessages) && oldMessages.length > 0) {
            const firstUserMsg = oldMessages.find((m) => m.role === 'user');
            const title = firstUserMsg
              ? firstUserMsg.content.slice(0, 24) + (firstUserMsg.content.length > 24 ? '...' : '')
              : '이전 대화 기록';

            loadedSessions = [
              {
                id: `session_migrated_${Date.now()}`,
                title,
                scope: 'current_sheet',
                messages: oldMessages,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
          }
        }
      }

      // 여전히 없으면 기본 새 세션 생성
      if (loadedSessions.length === 0) {
        const defaultSession: ChatSession = {
          id: `session_${Date.now()}`,
          title: '새 대화',
          scope: 'current_sheet',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        loadedSessions = [defaultSession];
      }

      setSessions(loadedSessions);

      const savedActiveId = localStorage.getItem(activeSessionKey);
      if (savedActiveId && loadedSessions.some((s) => s.id === savedActiveId)) {
        setActiveSessionId(savedActiveId);
      } else {
        setActiveSessionId(loadedSessions[0].id);
      }
    } catch {
      const fallback: ChatSession = {
        id: `session_${Date.now()}`,
        title: '새 대화',
        scope: 'current_sheet',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSessions([fallback]);
      setActiveSessionId(fallback.id);
    }
  }, [sessionsStorageKey, activeSessionKey, legacyStorageKey]);

  // 세션 목록 저장
  useEffect(() => {
    if (typeof window === 'undefined' || sessions.length === 0) return;
    localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions));
    if (activeSessionId) {
      localStorage.setItem(activeSessionKey, activeSessionId);
    }
  }, [sessions, activeSessionId, sessionsStorageKey, activeSessionKey]);

  // 현재 활성 세션
  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  const currentMessages = currentSession ? currentSession.messages : [];

  // 🌟 마우스 드래그 가로폭 조절 시작 핸들러
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // 마우스 드래그 가로폭 조절 이벤트
  useEffect(() => {
    if (!isResizing) return;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.max(380, Math.min(newWidth, window.innerWidth - 40));
      setDrawerWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('filetosheet_ai_drawer_width', String(drawerWidth));
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, drawerWidth]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, loading]);

  if (!isOpen) return null;

  // 새 대화 세션 생성
  const handleCreateNewSession = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: '새 대화',
      scope,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setShowHistoryPanel(false);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // 과거 세션 선택
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowHistoryPanel(false);
  };

  // 세션 개별 삭제
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 대화 기록을 삭제할까요?')) return;

    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh: ChatSession = {
          id: `session_${Date.now()}`,
          title: '새 대화',
          scope: 'current_sheet',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (sessionId === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  // 모든 세션 일괄 비우기
  const handleClearAllSessions = () => {
    if (!confirm('현재 프로젝트의 모든 과거 대화 기록을 영구 삭제할까요?')) return;
    const fresh: ChatSession = {
      id: `session_${Date.now()}`,
      title: '새 대화',
      scope: 'current_sheet',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setShowHistoryPanel(false);
    localStorage.removeItem(legacyStorageKey);
  };

  // 컨텍스트 데이터 압축 추출 (LLM 전송용)
  const buildContextData = () => {
    if (scope === 'current_sheet' && currentSheet) {
      return {
        projectName: currentProject?.name,
        sheetName: currentSheet.name,
        headers: currentSheet.headers,
        totalRows: currentSheet.rows.length,
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
    if (!query || loading || !currentSession) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    // 첫 질문이면 세션 제목을 질문 내용으로 자동 갱신
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSession.id) return s;
        const isDefaultTitle = s.title === '새 대화' || !s.title;
        const newTitle = isDefaultTitle ? query.slice(0, 24) + (query.length > 24 ? '...' : '') : s.title;
        return {
          ...s,
          title: newTitle,
          updatedAt: new Date().toISOString(),
          messages: [...s.messages, userMsg],
        };
      })
    );

    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
          chatHistory: currentSession.messages.map((m) => ({ role: m.role, content: m.content })),
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

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== currentSession.id) return s;
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, aiMsg],
          };
        })
      );
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: `⚠️ 오류가 발생했습니다: ${err?.message || '네트워크 연결 상태를 확인해 주세요.'}`,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== currentSession.id) return s;
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, errMsg],
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // 🌟 2. 텍스트 입력창 높이 자동 조절
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  // 🌟 4. AI 답변 표를 새 시트로 추가
  const handleAddTableToSheet = (msgId: string, content: string) => {
    const tableData = extractMarkdownTable(content);
    if (!tableData) {
      alert('표 형식의 데이터를 찾을 수 없습니다.');
      return;
    }
    if (!onAddNewSheetFromAi) {
      alert('시트 추가 핸들러가 연결되지 않았습니다.');
      return;
    }

    const timeStr = new Date().toISOString().slice(11, 16).replace(':', '');
    const sheetName = `AI분석_${timeStr}`;

    onAddNewSheetFromAi({
      name: sheetName,
      headers: tableData.headers,
      rows: tableData.rows,
    });

    setCreatedSheetMsgId(msgId);
    setTimeout(() => setCreatedSheetMsgId(null), 3000);
    alert(`AI 분석 결과가 새로운 시트 ['${sheetName}'](${tableData.rows.length}행)로 생성되었습니다!`);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 세션 날짜 포맷팅
  const formatSessionTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${m}/${day} ${h}:${min}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex max-w-full">
      {/* 백드롭 (모바일 대응) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs transition-opacity sm:hidden"
      />

      {/* Drawer 패널 (폭 동적 조절) */}
      <div
        style={{ width: `${drawerWidth}px` }}
        className="relative bg-white shadow-2xl flex flex-col border-l border-slate-200 z-10 animate-in slide-in-from-right duration-200 max-w-[95vw]"
      >
        {/* 🌟 좌측 드래그 너비 조절 핸들 바 */}
        <div
          onMouseDown={startResizing}
          className="absolute left-0 inset-y-0 w-2.5 -translate-x-1.5 cursor-ew-resize group hover:bg-blue-500/20 active:bg-blue-600/40 z-30 transition-colors flex items-center justify-center"
          title="좌우로 드래그하여 대화창 폭을 조절하세요"
        >
          <div className="w-1 h-10 rounded-full bg-slate-300 group-hover:bg-blue-500 group-active:bg-blue-600 transition-colors" />
        </div>

        {/* 헤더 */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border-b border-slate-200 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
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
              <p className="text-[11px] text-slate-500 truncate max-w-[160px] sm:max-w-[220px]">
                {currentSession?.title || '자연어 시트 데이터 분석'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* 새 대화 버튼 */}
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs active:scale-95"
              title="새 대화 세션 시작"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새 대화</span>
            </button>

            {/* 🌟 과거 대화 기록 목록 토글 버튼 */}
            <button
              type="button"
              onClick={() => setShowHistoryPanel((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition ${
                showHistoryPanel
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="과거 대화 기록 보기"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">기록</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                {sessions.length}
              </span>
            </button>

            {/* 너비 프리셋 버튼 */}
            <button
              type="button"
              onClick={() => {
                const target = drawerWidth >= 700 ? 480 : 760;
                setDrawerWidth(target);
                localStorage.setItem('filetosheet_ai_drawer_width', String(target));
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-lg transition"
              title={drawerWidth >= 700 ? '기본 너비(480px)로 축소' : '넓은 화면(760px)으로 확장'}
            >
              {drawerWidth >= 700 ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 🌟 과거 대화 기록 패널 (History View) */}
        {showHistoryPanel ? (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-150">
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistoryPanel(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                  title="대화로 돌아가기"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>과거 대화 기록 목록</span>
                  <span className="text-slate-400 font-normal">({sessions.length}개)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearAllSessions}
                className="text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition flex items-center gap-1"
                title="모든 대화 기록 초기화"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>전체 삭제</span>
              </button>
            </div>

            {/* 세션 카드 목록 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const msgCount = sess.messages.length;

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={`group relative p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:text-blue-600'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate block">
                            {sess.title}
                          </span>
                          {isActive && (
                            <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full shrink-0">
                              선택됨
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatSessionTime(sess.updatedAt || sess.createdAt)}
                          </span>
                          <span>•</span>
                          <span>{msgCount}개 메시지</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-60 group-hover:opacity-100"
                        title="이 대화 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
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
                  <span>현재 프로젝트</span>
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
              {currentMessages.length === 0 ? (
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
                  {currentMessages.map((msg) => {
                    const hasTable = msg.role === 'assistant' && extractMarkdownTable(msg.content) !== null;

                    return (
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
                          className={`max-w-[90%] rounded-2xl p-3.5 shadow-xs ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-xs'
                              : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
                          }`}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed font-sans overflow-x-auto">
                            {msg.content}
                          </div>

                          {/* 🌟 마크다운 표가 있을 때: [📥 새 시트로 추가] 버튼 */}
                          {hasTable && onAddNewSheetFromAi && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleAddTableToSheet(msg.id, msg.content)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition active:scale-95"
                                title="이 표 분석 결과를 프로젝트의 새로운 시트 탭으로 추가합니다"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>
                                  {createdSheetMsgId === msg.id ? '✓ 시트 추가 완료!' : '📥 이 표를 새 시트로 추가'}
                                </span>
                              </button>
                              <span className="text-[10px] text-slate-400">표 데이터 자동 파싱</span>
                            </div>
                          )}

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
                    );
                  })}

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

            {/* 입력창 영역 (자동 높이 조절) */}
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
                  rows={1}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="예: '10월 법인카드 총 지출액 얼마야?', '거래처별 건수 보여줘'..."
                  className="flex-1 bg-transparent border-0 focus:outline-none text-xs text-slate-800 resize-none p-1 placeholder:text-slate-400 max-h-44 leading-relaxed"
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
              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between px-1">
                <span>Enter 전송 / Shift+Enter 줄바꿈</span>
                <span>좌측 경계선을 당겨 폭 조절 가능</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
