'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  Coins,
  MessageSquare,
  FileText,
  Smartphone,
  Sparkles,
  Building2,
  Cpu,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Layers,
  History,
  Check,
  X,
  Sliders,
  BellRing,
} from 'lucide-react';

type TabType =
  | 'users'
  | 'smart_rules'
  | 'sms'
  | 'dispatch_logs'
  | 'footer'
  | 'inquiries'
  | 'tax_invoices'
  | 'ai_models';

interface Stats {
  totalUsersCount: number;
  totalProjectsCount: number;
  totalExtractedRowsCount: number;
  pendingInquiriesCount: number;
  requestedTaxCount: number;
  todaySmsCount: number;
  activeRulesCount: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [liveConnected, setLiveConnected] = useState<boolean>(false);

  // SWR 캐시 복원 상태
  const [stats, setStats] = useState<Stats>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('fts_admin_stats');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      totalUsersCount: 0,
      totalProjectsCount: 0,
      totalExtractedRowsCount: 0,
      pendingInquiriesCount: 0,
      requestedTaxCount: 0,
      todaySmsCount: 0,
      activeRulesCount: 0,
    };
  });

  const [users, setUsers] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('fts_admin_users');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [rules, setRules] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [taxInvoices, setTaxInvoices] = useState<any[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [smsSettings, setSmsSettings] = useState<any>({
    dispatch_mode: 'GOOGLE_MESSAGES',
    admin_phone: '010-7216-5884',
    is_active: 1,
  });
  const [companyInfo, setCompanyInfo] = useState<any>({
    companyName: '(주)이지데스크',
    ceoName: '정인환',
    bizNumber: '123-45-67890',
    mailOrderNumber: '2026-서울강남-01234',
    address: '서울특별시 강남구 테헤란로 123, 이지빌딩 7층',
    email: 'support@filetosheet.com',
    phone: '1588-0000',
  });
  const [snsLinks, setSnsLinks] = useState<any>({
    kakaoChannel: 'https://pf.kakao.com/_example',
    youtube: 'https://www.youtube.com/@EGDesk',
    instagram: 'https://www.instagram.com/egdesk_official',
    blog: 'https://blog.naver.com/egdesk',
  });
  const [aiModelConfig, setAiModelConfig] = useState<any>({
    primaryModel: 'gemini-2.5-flash',
    fallbackModel: 'gemini-2.5-pro',
    temperature: 0.2,
    maxOutputTokens: 8192,
    systemPrompt: '비정형 문서를 정형 엑셀 표로 완벽히 구조화합니다.',
  });

  // 토큰 조정 모달 상태
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [tokenAmountInput, setTokenAmountInput] = useState<string>('10000');
  const [tokenReasonInput, setTokenReasonInput] = useState<string>('관리자 직권 보상 충전');
  const [planSelectInput, setPlanSelectInput] = useState<string>('pro');
  const [isSubmittingTokens, setIsSubmittingTokens] = useState<boolean>(false);

  // 자연어 규칙 컴파일 상태
  const [rulePromptInput, setRulePromptInput] = useState<string>('밤 11시부터 새벽 4시 사이에 50만 원 이상 결제되면 내 폰으로 즉시 문자 줘');
  const [compilingRule, setCompilingRule] = useState<boolean>(false);
  const [compiledResult, setCompiledResult] = useState<any | null>(null);

  // SMS 테스트 발송 상태
  const [testSmsRecipient, setTestSmsRecipient] = useState<string>('010-7216-5884');
  const [testSmsBody, setTestSmsBody] = useState<string>('[FileToSheet] 관리자 테스트 발송이 정상 작동합니다.');
  const [sendingTestSms, setSendingTestSms] = useState<boolean>(false);

  // 1:1 고객문의 답변 모달 상태
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [inquiryAnswerInput, setInquiryAnswerInput] = useState<string>('');
  const [generatingAiDraft, setGeneratingAiDraft] = useState<boolean>(false);
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);

  // 검색 필터
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');

  /**
   * 1. ⚡ 통합 번들 로더 (Unified Bootstrap Bundle Loader)
   * 단 1회의 HTTP 요청으로 관리자 대시보드 전체 데이터를 수집 및 캐시
   */
  const fetchAdminBootstrap = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      const res = await fetch(`/api/admin/bootstrap?refresh=${forceRefresh ? 'true' : 'false'}`);
      const json = await res.json();

      if (json.success && json.bundle) {
        const b = json.bundle;
        setStats(b.stats);
        setUsers(b.users || []);
        setRules(b.rules || []);
        setInquiries(b.inquiries || []);
        setTaxInvoices(b.taxInvoices || []);
        setDispatchLogs(b.dispatchLogs || []);
        if (b.smsSettings) setSmsSettings(b.smsSettings);
        if (b.companyInfo) setCompanyInfo(b.companyInfo);
        if (b.snsLinks) setSnsLinks(b.snsLinks);
        if (b.aiModelConfig) setAiModelConfig(b.aiModelConfig);

        // SessionStorage 캐시 갱신
        try {
          sessionStorage.setItem('fts_admin_stats', JSON.stringify(b.stats));
          sessionStorage.setItem('fts_admin_users', JSON.stringify(b.users || []));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to fetch admin bootstrap:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * 2. 👁️ 실시간 DB 왓처 (SSE Stream Hub 연동)
   */
  useEffect(() => {
    fetchAdminBootstrap();

    // SSE 실시간 스트림 연결
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/admin/realtime');

      eventSource.addEventListener('connected', () => {
        setLiveConnected(true);
      });

      eventSource.addEventListener('db_change', (e: MessageEvent) => {
        // 테이블 변경 감지 시 백그라운드에서 조용히 번들 최신화
        fetchAdminBootstrap(true);
      });

      eventSource.onerror = () => {
        setLiveConnected(false);
      };
    } catch (err) {
      console.warn('SSE stream error:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // 토큰 조정 제출
  const handleUpdateTokens = async (delta: number) => {
    if (!selectedUser) return;
    setIsSubmittingTokens(true);
    try {
      const res = await fetch('/api/admin/users/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedUser.phoneNumber,
          deltaTokens: delta,
          newPlan: planSelectInput,
          reason: tokenReasonInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${selectedUser.nickname}님의 토큰 및 플랜이 성공적으로 반영되었습니다.`);
        setSelectedUser(null);
        fetchAdminBootstrap(true);
      } else {
        alert(data.error || '처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmittingTokens(false);
    }
  };

  // 자연어 규칙 컴파일
  const handleCompileRule = async () => {
    if (!rulePromptInput.trim()) return;
    setCompilingRule(true);
    try {
      const res = await fetch('/api/sms/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: rulePromptInput }),
      });
      const data = await res.json();
      if (data.success) {
        setCompiledResult(data.compiled);
      }
    } catch (err) {
      alert('자연어 규칙 분석 중 오류가 발생했습니다.');
    } finally {
      setCompilingRule(false);
    }
  };

  // 컴파일된 규칙 저장
  const handleSaveRule = async () => {
    if (!compiledResult) return;
    try {
      const res = await fetch('/api/admin/smart-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compiledResult),
      });
      const data = await res.json();
      if (data.success) {
        alert('신규 자연어 알림 규칙이 등록되었습니다!');
        setCompiledResult(null);
        fetchAdminBootstrap(true);
      }
    } catch (err) {
      alert('규칙 저장에 실패했습니다.');
    }
  };

  // 규칙 토글
  const handleToggleRule = async (ruleId: number, currentStatus: number) => {
    try {
      await fetch('/api/admin/smart-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, is_active: currentStatus === 1 ? 0 : 1 }),
      });
      fetchAdminBootstrap(true);
    } catch (err) {
      alert('상태 변경 실패');
    }
  };

  // SMS 테스트 발송
  const handleSendTestSms = async () => {
    if (!testSmsRecipient || !testSmsBody) return;
    setSendingTestSms(true);
    try {
      const res = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testSmsRecipient, message: testSmsBody }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`테스트 문자가 성공적으로 발송되었습니다! (지연: ${data.latencyMs}ms)`);
        fetchAdminBootstrap(true);
      } else {
        alert(data.error || '발송 실패');
      }
    } catch (err: any) {
      alert(err.message || '발송 중 오류');
    } finally {
      setSendingTestSms(false);
    }
  };

  // 고객문의 AI 초안 생성
  const handleGenerateAiDraft = async () => {
    if (!selectedInquiry) return;
    setGeneratingAiDraft(true);
    try {
      const res = await fetch('/api/admin/inquiries/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedInquiry.title,
          content: selectedInquiry.content,
          userName: selectedInquiry.user_name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiryAnswerInput(data.draft);
      }
    } catch (err) {
      alert('AI 초안 생성 실패');
    } finally {
      setGeneratingAiDraft(false);
    }
  };

  // 고객문의 답변 제출
  const handleSubmitInquiryAnswer = async () => {
    if (!selectedInquiry || !inquiryAnswerInput.trim()) return;
    setSubmittingAnswer(true);
    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: selectedInquiry.id,
          answer: inquiryAnswerInput,
          sendSms: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('답변이 등록되었으며 고객 휴대폰으로 문자가 발송되었습니다.');
        setSelectedInquiry(null);
        setInquiryAnswerInput('');
        fetchAdminBootstrap(true);
      }
    } catch (err) {
      alert('답변 등록 실패');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // 세금계산서 상태 변경
  const handleUpdateTaxInvoiceStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/tax-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`세금계산서 상태가 '${newStatus}'(으)로 갱신되었습니다.`);
        fetchAdminBootstrap(true);
      }
    } catch (err) {
      alert('상태 변경 실패');
    }
  };

  // 설정 저장
  const handleSaveSetting = async (key: string, value: any, category: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category }),
      });
      const data = await res.json();
      if (data.success) {
        alert('설정이 성공적으로 저장되었습니다.');
        fetchAdminBootstrap(true);
      }
    } catch (err) {
      alert('설정 저장 실패');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearchTerm.toLowerCase();
    return (
      (u.phoneNumber && u.phoneNumber.includes(q)) ||
      (u.nickname && u.nickname.toLowerCase().includes(q)) ||
      (u.plan && u.plan.toLowerCase().includes(q))
    );
  });

  const filteredLogs = dispatchLogs.filter((log) => {
    if (logFilterStatus === 'ALL') return true;
    return log.status === logFilterStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* 헤더 & 브레드크럼 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link
                href="/"
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition flex items-center gap-1"
              >
                ← 서비스 홈
              </Link>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  ADMIN CONSOLE
                </span>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  파일투시트 종합 관리자 시스템
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* DB Watcher 실시간 상태 */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                  liveConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title="이지데스크 SQLite DB Watcher 실시간 SSE 스트림"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {liveConnected ? 'DB 왓처 실시간 동기화됨' : '단일 번들 수신 대기'}
              </div>

              {/* 새로고침 버튼 */}
              <button
                onClick={() => fetchAdminBootstrap(true)}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 text-xs font-bold"
                title="단일 통합 번들 즉시 재수신"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span className="hidden sm:inline">동기화</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI 대시보드 7대 핵심 지표 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>총 회원수</span>
              <Users className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{stats.totalUsersCount}명</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>작업 프로젝트</span>
              <Layers className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{stats.totalProjectsCount}개</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>누적 추출 행</span>
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{stats.totalExtractedRowsCount.toLocaleString()}행</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>미답변 1:1문의</span>
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-600">{stats.pendingInquiriesCount}건</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>세금계산서 대기</span>
              <FileText className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-600">{stats.requestedTaxCount}건</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>알림문자 발송</span>
              <Smartphone className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-black text-rose-600">{stats.todaySmsCount}건</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>자연어 규칙</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-black text-indigo-600">{stats.activeRulesCount}개</div>
          </div>
        </div>

        {/* 탭 네비게이션 바 */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            회원/토큰 관리
          </button>

          <button
            onClick={() => setActiveTab('smart_rules')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'smart_rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 자연어 규칙 ({rules.length})
          </button>

          <button
            onClick={() => setActiveTab('sms')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'sms'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            SMS 발송 설정
          </button>

          <button
            onClick={() => setActiveTab('dispatch_logs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dispatch_logs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            발송 감사 이력
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'inquiries'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            1:1 고객문의 {stats.pendingInquiriesCount > 0 && `(${stats.pendingInquiriesCount})`}
          </button>

          <button
            onClick={() => setActiveTab('tax_invoices')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'tax_invoices'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            세금계산서 대장
          </button>

          <button
            onClick={() => setActiveTab('footer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'footer'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            회사/푸터 & SNS
          </button>

          <button
            onClick={() => setActiveTab('ai_models')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ai_models'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            AI 모델 설정
          </button>
        </div>

        {/* ========================================================
            TAB 1: 회원 관리 및 토큰 조정
           ======================================================== */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900">가입 회원 및 잔여 토큰/크레딧 대장</h2>
                <p className="text-xs text-slate-500">
                  회원별 소유 프로젝트, 파싱 잔여 토큰을 확인하고 관리자 권한으로 충전·차감합니다.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="전화번호 / 닉네임 검색..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">회원 닉네임</th>
                    <th className="py-2.5 px-3">휴대폰 번호</th>
                    <th className="py-2.5 px-3">이용 플랜</th>
                    <th className="py-2.5 px-3 text-right">잔여 토큰</th>
                    <th className="py-2.5 px-3 text-right">소유 프로젝트</th>
                    <th className="py-2.5 px-3">최근 로그인</th>
                    <th className="py-2.5 px-3 text-center">관리 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {u.nickname}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{u.phoneNumber}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            u.plan === 'enterprise'
                              ? 'bg-purple-100 text-purple-700'
                              : u.plan === 'pro'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.plan}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-600 font-mono">
                        {u.balanceTokens.toLocaleString()} T
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">{u.projectCount}개</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setPlanSelectInput(u.plan || 'free');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                        >
                          토큰/플랜 조정
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        검색 조건에 일치하는 회원이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: AI 자연어 규칙 관리
           ======================================================== */}
        {activeTab === 'smart_rules' && (
          <div className="space-y-6">
            {/* 자연어 규칙 컴파일기 */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 text-white shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h2 className="text-base font-black tracking-tight">자연어 알림 규칙 AI 자동 컴파일기</h2>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed">
                복잡한 IF/ELSE 조건식 대신 일상 한국어로 요구사항을 적어두면, Gemini AI가 시트 데이터 필드와 연산자(이상치, 심야지출, 품절경보)를 자동 분석하여 정형 트리거를 생성합니다.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={rulePromptInput}
                  onChange={(e) => setRulePromptInput(e.target.value)}
                  placeholder="예: 밤 11시부터 새벽 4시 사이에 50만 원 이상 결제되면 내 폰으로 문자 줘"
                  className="flex-1 px-4 py-2.5 text-xs text-slate-900 bg-white rounded-xl focus:outline-none shadow-xs"
                />
                <button
                  onClick={handleCompileRule}
                  disabled={compilingRule}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                >
                  {compilingRule ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  AI 규칙 컴파일
                </button>
              </div>

              {/* 컴파일 결과 카드 */}
              {compiledResult && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-xs space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      AI 분석 및 컴파일 완료
                    </span>
                    <button
                      onClick={handleSaveRule}
                      className="px-3 py-1 bg-white text-indigo-700 font-black rounded-lg text-xs hover:bg-indigo-50 transition shadow-xs"
                    >
                      이 규칙 즉시 등록하기
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-indigo-100">
                    <div>
                      <span className="text-indigo-200">생성된 규칙명:</span>{' '}
                      <span className="font-bold text-white">{compiledResult.ruleName}</span>
                    </div>
                    <div>
                      <span className="text-indigo-200">수신 대상 번호:</span>{' '}
                      <span className="font-bold text-white font-mono">{compiledResult.recipientPhone}</span>
                    </div>
                    <div>
                      <span className="text-indigo-200">감시 대상 시트:</span>{' '}
                      <span className="font-bold text-white">{compiledResult.sheetName}</span>
                    </div>
                    <div>
                      <span className="text-indigo-200">발송 채널:</span>{' '}
                      <span className="font-bold text-amber-300">{compiledResult.recommendedChannel}</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-black/20 rounded-lg font-mono text-[11px] text-emerald-300">
                    메시지 서식: {compiledResult.messageTemplate}
                  </div>
                </div>
              )}
            </div>

            {/* 등록된 규칙 목록 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900">가동 중인 자연어 알림 규칙 목록</h3>
              <div className="grid grid-cols-1 gap-3">
                {rules.map((rule) => {
                  const isActive = Number(rule.is_active) === 1;
                  return (
                    <div
                      key={rule.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <h4 className="font-black text-sm text-slate-900">{rule.rule_name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                            {rule.sheet_name || '전체 시트'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 italic">"{rule.raw_prompt}"</p>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 pt-1">
                          <span>수신: {rule.recipient_phone}</span>
                          <span>|</span>
                          <span>메시지: {rule.message_template}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.is_active)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {isActive ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                          {isActive ? '가동 중' : '일시정지'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: SMS 발송 환경설정
           ======================================================== */}
        {activeTab === 'sms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                SMS 발송 엔진 설정
              </h3>
              <p className="text-xs text-slate-500">
                실시간 문자 발송을 수행할 채널(Google Messages / Aligo)을 선택합니다.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">발송 채널 모드</label>
                  <select
                    value={smsSettings.dispatch_mode}
                    onChange={(e) => setSmsSettings({ ...smsSettings, dispatch_mode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="GOOGLE_MESSAGES">Google Messages (내 스마트폰 블루투스/웹 연동 - 0원 발송)</option>
                    <option value="ALIGO">알리고(Aligo) 통신사 비즈니스 SMS 게이트웨이</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">관리자 알림 수신 번호</label>
                  <input
                    type="text"
                    value={smsSettings.admin_phone}
                    onChange={(e) => setSmsSettings({ ...smsSettings, admin_phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {smsSettings.dispatch_mode === 'ALIGO' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">알리고 API Key</label>
                      <input
                        type="password"
                        value={smsSettings.aligo_api_key || ''}
                        onChange={(e) => setSmsSettings({ ...smsSettings, aligo_api_key: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">발신자 지정 번호</label>
                      <input
                        type="text"
                        value={smsSettings.aligo_sender || ''}
                        onChange={(e) => setSmsSettings({ ...smsSettings, aligo_sender: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={async () => {
                    await fetch('/api/admin/sms', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(smsSettings),
                    });
                    alert('SMS 환경설정이 저장되었습니다.');
                    fetchAdminBootstrap(true);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition mt-4"
                >
                  SMS 환경설정 저장
                </button>
              </div>
            </div>

            {/* 테스트 문자 즉시 발송 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                내 휴대폰으로 테스트 문자 발송
              </h3>
              <p className="text-xs text-slate-500">
                입력한 번호로 즉시 SMS를 시험 발송하고 전수 감사 대장에 정상 적재되는지 점검합니다.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">수신 휴대폰 번호</label>
                  <input
                    type="text"
                    value={testSmsRecipient}
                    onChange={(e) => setTestSmsRecipient(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">발송 메시지 본문</label>
                  <textarea
                    rows={4}
                    value={testSmsBody}
                    onChange={(e) => setTestSmsBody(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="text-right text-[11px] text-slate-400 mt-1">
                    바이트: {new TextEncoder().encode(testSmsBody).length}B ({new TextEncoder().encode(testSmsBody).length > 90 ? 'LMS' : 'SMS'})
                  </div>
                </div>

                <button
                  onClick={handleSendTestSms}
                  disabled={sendingTestSms}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 mt-2"
                >
                  {sendingTestSms ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  테스트 문자 즉시 발송
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: 알림문자 발송 전수 감사 이력
           ======================================================== */}
        {activeTab === 'dispatch_logs' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900">알림문자(SMS/LMS) 발송 전수 감사 대장</h2>
                <p className="text-xs text-slate-500">
                  인증번호, 이상치 경보, 품절 알림, 문의 답변 등 전송된 모든 문자의 감사 이력을 추적합니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={logFilterStatus}
                  onChange={(e) => setLogFilterStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="ALL">전체 상태 보기</option>
                  <option value="SUCCESS">성공 (SUCCESS)</option>
                  <option value="FAIL">실패 (FAIL)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">발송 일시</th>
                    <th className="py-2.5 px-3">수신 번호</th>
                    <th className="py-2.5 px-3">유형</th>
                    <th className="py-2.5 px-3">트리거 사유</th>
                    <th className="py-2.5 px-3">문자 내용</th>
                    <th className="py-2.5 px-3">결과</th>
                    <th className="py-2.5 px-3 text-right">소요시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{log.recipient}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            log.message_type === 'LMS'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {log.message_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{log.trigger_name || '일반발송'}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={log.body}>
                        {log.body}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {log.latency_ms || 180}ms
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        발송 이력이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: 1:1 고객문의 관리 & Gemini AI 자동 초안
           ======================================================== */}
        {activeTab === 'inquiries' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900">1:1 고객문의 접수 대장 및 AI 자동 초안</h2>
              <p className="text-xs text-slate-500">
                접수된 문의를 확인하고, Gemini AI 원클릭 초안 작성으로 고객 휴대폰에 즉시 답변 문자를 전송합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {inquiries.map((inq) => {
                const isPending = inq.status === 'PENDING';
                return (
                  <div
                    key={inq.id}
                    className={`p-4 rounded-xl border transition ${
                      isPending ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isPending ? '답변 대기' : '답변 완료'}
                        </span>
                        <h4 className="font-black text-sm text-slate-900">{inq.title}</h4>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        작성자: {inq.user_name} ({inq.phone_number}) |{' '}
                        {inq.created_at ? new Date(inq.created_at).toLocaleString('ko-KR') : ''}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed mb-3">
                      {inq.content}
                    </p>

                    {inq.final_answer && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-900 leading-relaxed mb-3">
                        <span className="font-bold text-emerald-700 block mb-1">✓ 발송 완료된 최종 답변:</span>
                        {inq.final_answer}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedInquiry(inq);
                          setInquiryAnswerInput(inq.ai_draft_answer || '');
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        답변 작성 및 SMS 발송
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: 세금계산서 대장
           ======================================================== */}
        {activeTab === 'tax_invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900">전자세금계산서 발행 신청 대장</h2>
              <p className="text-xs text-slate-500">
                결제 회원의 사업자등록 정보와 공급가액/세액을 확인하고 홈택스 전자세금계산서 승인 처리를 진행합니다.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">신청 일시</th>
                    <th className="py-2.5 px-3">상호명</th>
                    <th className="py-2.5 px-3">사업자등록번호</th>
                    <th className="py-2.5 px-3">대표자 / 이메일</th>
                    <th className="py-2.5 px-3 text-right">공급금액(합계)</th>
                    <th className="py-2.5 px-3 text-center">발행 상태</th>
                    <th className="py-2.5 px-3 text-center">상태 변경</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {taxInvoices.map((tax) => (
                    <tr key={tax.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-400">
                        {tax.createdAt ? new Date(tax.createdAt).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{tax.companyName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{tax.bizNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold">{tax.ceoName}</span>
                        <span className="block text-[11px] text-slate-400 font-mono">{tax.email}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-600 font-mono">
                        {tax.finalAmount.toLocaleString()}원
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            tax.status === 'ISSUED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : tax.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {tax.status === 'ISSUED' ? '발행완료' : tax.status === 'REJECTED' ? '반려됨' : '신청대기'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateTaxInvoiceStatus(tax.id, 'ISSUED')}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold"
                          >
                            발행완료
                          </button>
                          <button
                            onClick={() => handleUpdateTaxInvoiceStatus(tax.id, 'REJECTED')}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold"
                          >
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {taxInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        신청된 세금계산서가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 7: 회사 정보 / 푸터 & 공식 SNS 링크 관리
           ======================================================== */}
        {activeTab === 'footer' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                회사 기본 정보 & 푸터 표기 관리
              </h3>
              <p className="text-xs text-slate-500">
                수정 즉시 사이트 전체 푸터에 무배포로 실시간 동기화됩니다.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">상호명</label>
                  <input
                    type="text"
                    value={companyInfo.companyName || ''}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">대표자명</label>
                    <input
                      type="text"
                      value={companyInfo.ceoName || ''}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, ceoName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">사업자등록번호</label>
                    <input
                      type="text"
                      value={companyInfo.bizNumber || ''}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bizNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">통신판매업신고번호</label>
                  <input
                    type="text"
                    value={companyInfo.mailOrderNumber || ''}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, mailOrderNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">사업장 주소</label>
                  <input
                    type="text"
                    value={companyInfo.address || ''}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">대표 이메일</label>
                    <input
                      type="text"
                      value={companyInfo.email || ''}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">대표 전화번호</label>
                    <input
                      type="text"
                      value={companyInfo.phone || ''}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleSaveSetting('company_info', companyInfo, 'company')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition mt-2"
                >
                  회사 정보 실시간 저장
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-indigo-600" />
                공식 SNS 채널 바로가기 링크 관리
              </h3>
              <p className="text-xs text-slate-500">
                카카오 채널, 인스타그램, 유튜브, 네이버 블로그 URL을 실시간 업데이트합니다.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">카카오톡 채널 URL</label>
                  <input
                    type="text"
                    value={snsLinks.kakaoChannel || ''}
                    onChange={(e) => setSnsLinks({ ...snsLinks, kakaoChannel: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">유튜브 채널 URL</label>
                  <input
                    type="text"
                    value={snsLinks.youtube || ''}
                    onChange={(e) => setSnsLinks({ ...snsLinks, youtube: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">인스타그램 URL</label>
                  <input
                    type="text"
                    value={snsLinks.instagram || ''}
                    onChange={(e) => setSnsLinks({ ...snsLinks, instagram: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">네이버 블로그 URL</label>
                  <input
                    type="text"
                    value={snsLinks.blog || ''}
                    onChange={(e) => setSnsLinks({ ...snsLinks, blog: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => handleSaveSetting('sns_links', snsLinks, 'sns')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition mt-2"
                >
                  SNS 링크 실시간 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 8: AI 모델 및 프롬프트 설정
           ======================================================== */}
        {activeTab === 'ai_models' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                Gemini AI 파서 엔진 및 시스템 프롬프트 제어
              </h2>
              <p className="text-xs text-slate-500">
                문서 파싱 및 규칙 컴파일에 사용할 Gemini 모델과 파라미터를 실시간 조정합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">기본 파서 모델 (Primary)</label>
                <select
                  value={aiModelConfig.primaryModel}
                  onChange={(e) => setAiModelConfig({ ...aiModelConfig, primaryModel: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-mono"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (초고속 대량 처리 추천)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (초고난도 다국어/복합 서식)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">폴백 모델 (Fallback)</label>
                <select
                  value={aiModelConfig.fallbackModel}
                  onChange={(e) => setAiModelConfig({ ...aiModelConfig, fallbackModel: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-mono"
                >
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Temperature (창의성/엄격성)</span>
                  <span className="font-mono text-indigo-600">{aiModelConfig.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={aiModelConfig.temperature}
                  onChange={(e) => setAiModelConfig({ ...aiModelConfig, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">시스템 기본 OCR/파싱 프롬프트</label>
                <textarea
                  rows={4}
                  value={aiModelConfig.systemPrompt}
                  onChange={(e) => setAiModelConfig({ ...aiModelConfig, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => handleSaveSetting('ai_model_config', aiModelConfig, 'ai')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition"
              >
                AI 모델 파라미터 실시간 저장
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL 1: 회원별 토큰/플랜 수동 조정 모달
         ======================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" />
                회원 토큰/플랜 수동 조정
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">대상 회원:</span>
                <span className="font-bold text-slate-900">{selectedUser.nickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">휴대폰 번호:</span>
                <span className="font-mono text-slate-700">{selectedUser.phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">현재 잔여 토큰:</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {selectedUser.balanceTokens.toLocaleString()} T
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">이용 플랜 등급 변경</label>
                <select
                  value={planSelectInput}
                  onChange={(e) => setPlanSelectInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="free">FREE (무료 체험)</option>
                  <option value="starter">STARTER (기본)</option>
                  <option value="pro">PRO (전문가/비즈니스)</option>
                  <option value="enterprise">ENTERPRISE (기업용)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">토큰 증감 수량</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    onClick={() => setTokenAmountInput('10000')}
                    className="py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-bold"
                  >
                    +10,000 T
                  </button>
                  <button
                    onClick={() => setTokenAmountInput('50000')}
                    className="py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-bold"
                  >
                    +50,000 T
                  </button>
                  <button
                    onClick={() => setTokenAmountInput('-10000')}
                    className="py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold"
                  >
                    -10,000 T
                  </button>
                </div>
                <input
                  type="number"
                  value={tokenAmountInput}
                  onChange={(e) => setTokenAmountInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">조정 사유 (감사 로그 보존)</label>
                <input
                  type="text"
                  value={tokenReasonInput}
                  onChange={(e) => setTokenReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                취소
              </button>
              <button
                onClick={() => handleUpdateTokens(Number(tokenAmountInput))}
                disabled={isSubmittingTokens}
                className="flex-1 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1"
              >
                {isSubmittingTokens ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                변경사항 적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: 1:1 고객문의 AI 답변 작성 모달
         ======================================================== */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                고객문의 답변 및 SMS 발송
              </h3>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="font-black text-slate-900">{selectedInquiry.title}</div>
              <div className="text-slate-600 leading-relaxed">{selectedInquiry.content}</div>
              <div className="text-[11px] text-slate-400 font-mono pt-1">
                수신번호: {selectedInquiry.phone_number} | 문의자: {selectedInquiry.user_name}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">관리자 답변 본문</label>
                <button
                  onClick={handleGenerateAiDraft}
                  disabled={generatingAiDraft}
                  className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {generatingAiDraft ? 'AI 초안 생성 중...' : '✨ AI 초안 1초 자동작성'}
                </button>
              </div>
              <textarea
                rows={5}
                value={inquiryAnswerInput}
                onChange={(e) => setInquiryAnswerInput(e.target.value)}
                placeholder="답변 내용을 작성해 주세요. (SMS로 동시 발송됩니다)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedInquiry(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                닫기
              </button>
              <button
                onClick={handleSubmitInquiryAnswer}
                disabled={submittingAnswer || !inquiryAnswerInput.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1 shadow-xs"
              >
                {submittingAnswer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                답변 등록 및 문자 발송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
