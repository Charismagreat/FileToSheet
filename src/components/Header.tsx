'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet, Download, Share2, RefreshCw, Smartphone, LogOut,
  User, Database, Crown, UploadCloud, Zap, ChevronDown, Building2, BarChart3,
  Send, Inbox, Globe, Sparkles, Link as LinkIcon, ShieldCheck, Lightbulb, Clock
} from 'lucide-react';
import { UserSession, ProjectWorkspace } from '@/types/workspace';
import { UserUsagePopover } from './UserUsagePopover';
import { getPlanLimits } from '@/lib/plan-limits';
import { getBonusCredits } from '@/lib/coupon-helpers';
import { isPhoneNumberAdmin } from '@/lib/admin-auth';

interface HeaderProps {
  currentUser: UserSession | null;
  currentProject?: ProjectWorkspace | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onDownloadXlsx: () => void;
  onDownloadSqlite?: () => void;
  onOpenPlanModal?: () => void;
  onOpenPricingModal?: () => void;
  onOpenTransferModal?: () => void;
  onOpenBillingHistory?: () => void;
  onOpenRemoteDbModal?: () => void;
  onOpenScheduleModal?: () => void;
  onOpenMobileIngestModal?: () => void;
  onOpenShareToManagerModal?: () => void;
  onOpenConsolidatedModal?: () => void;
  onOpenShareManagementModal?: () => void;
  onOpenDailyAuditModal?: () => void;
  onOpenAppBuilderModal?: () => void;
  onOpenAiChat?: () => void;
  onExportGoogleSheets: () => void;
  onOpenOriginalModal: () => void;
  onOpenShareModal: () => void;
  onUploadFile?: (file: File) => void;
  hasOriginalFile: boolean;
  hasSheetData: boolean;
  exportLoading: boolean;
}

export function Header({
  currentUser,
  currentProject = null,
  onOpenLoginModal,
  onLogout,
  onDownloadXlsx,
  onDownloadSqlite,
  onOpenPlanModal,
  onOpenPricingModal,
  onOpenTransferModal,
  onOpenBillingHistory,
  onOpenRemoteDbModal,
  onOpenScheduleModal,
  onOpenMobileIngestModal,
  onOpenShareToManagerModal,
  onOpenConsolidatedModal,
  onOpenShareManagementModal,
  onOpenDailyAuditModal,
  onOpenAppBuilderModal,
  onOpenAiChat,
  onExportGoogleSheets,
  onOpenShareModal,
  onUploadFile,
  hasSheetData,
  exportLoading,
}: HeaderProps) {
  const [isUsageOpen, setIsUsageOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [bonusCredits, setBonusCredits] = useState<{ bonusTokens: number; bonusDocs: number }>({ bonusTokens: 0, bonusDocs: 0 });

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // 크레딧 동기화
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setBonusCredits(getBonusCredits());
    sync();
    window.addEventListener('filetosheet_credit_updated', sync);
    return () => window.removeEventListener('filetosheet_credit_updated', sync);
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const planPolicy = getPlanLimits(currentUser?.plan);
  const parsedDocsCount = currentProject?.originalFiles?.length || 1;
  const maxDocs = planPolicy.includedMonthlyDocs + bonusCredits.bonusDocs;
  const isAdmin = isPhoneNumberAdmin(currentUser?.phoneNumber);

  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
      {/* 1. 좌측 로고 & 타이틀 & 활용사례 메뉴 영역 */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/15">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-tight block">FileToSheet</span>
            <p className="text-[11px] text-slate-400 font-normal leading-tight hidden sm:block">어떤 파일이든 업로드 즉시 엑셀 표로, FileToSheet</p>
          </div>
        </div>

        {/* 💡 활용사례 바로가기 메뉴 (현재 작업물 유지를 위해 새 탭으로 오픈) */}
        <Link
          href="/use-cases"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border border-amber-200/90 transition transform hover:scale-105 active:scale-95 shadow-2xs group cursor-pointer"
          title="File to Sheet의 가치와 직무별/업종별 6대 핵심 활용사례 보기 (새 창)"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-12 transition" />
          <span>활용사례</span>
          <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded-full leading-none hidden sm:inline-block">
            HOT
          </span>
        </Link>

        {/* 🏢 회사소개 바로가기 메뉴 */}
        <Link
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition transform hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
          title="File to Sheet 비전, 3대 독자 기술, 보안 헌장 및 공식 회사정보 (새 창)"
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>회사소개</span>
        </Link>

        {/* 👑 관리자 콘솔 바로가기 (관리자 권한 보유 사용자에게만 표시) */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition transform hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
            title="종합 관리자 대시보드 (회원, 토큰, SMS, 세금계산서, AI모델 설정)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">관리자</span>
          </Link>
        )}
      </div>

      {/* 2. 우측 정돈된 액션 바 (그룹화) */}
      <div className="flex items-center gap-2">
        {/* 🌟 그룹 A: 원격 My DB 연동 및 정기 스케줄 */}
        {onOpenRemoteDbModal && (
          <button
            onClick={onOpenRemoteDbModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 transition active:scale-95"
            title="원격지 이지데스크 터널링 My DB 연동 및 조회"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>원격 My DB</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        )}

        {onOpenScheduleModal && (
          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-800 transition active:scale-95"
            title="정기 스케줄 무인 자동화 파이프라인 설정 및 관리"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>스케줄</span>
          </button>
        )}

        {onOpenMobileIngestModal && (
          <button
            onClick={onOpenMobileIngestModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-900 transition active:scale-95 shadow-2xs"
            title="시트봇 모바일앱 QR코드 및 수신 토큰 페어링"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>모바일 연동</span>
            <span className="text-[9px] font-bold bg-indigo-600 text-white px-1 py-0.2 rounded-full leading-none hidden xl:inline-block">
              App
            </span>
          </button>
        )}

        {onOpenDailyAuditModal && (
          <button
            onClick={onOpenDailyAuditModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-900 transition active:scale-95 shadow-2xs"
            title="백엔드 AI가 전사 시트의 이중 전표, 계산 오차, 부가세 누락을 전수 감사한 일일 리포트를 확인합니다"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI 데이터 감사</span>
            <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded-full leading-none hidden xl:inline-block">
              Daily
            </span>
          </button>
        )}

        {onOpenAppBuilderModal && (
          <button
            onClick={onOpenAppBuilderModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs transition active:scale-95"
            title="자연어로 원하는 사내 관리 포털/웹앱을 1초 만에 자동 생성합니다"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>CRUD 웹앱 빌더</span>
            <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.2 rounded-full leading-none hidden xl:inline-block">
              No-Code
            </span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 mx-0.5 hidden md:block" />

        {/* 🌟 그룹 B: 내보내기 통합 드롭다운 (Excel / SQLite / Google Sheets) */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setIsExportOpen((prev) => !prev)}
            disabled={!hasSheetData}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition border active:scale-95 ${
              isExportOpen
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:hover:bg-white'
            }`}
            title="엑셀, SQLite DB, 구글 스프레드시트로 내보내기"
          >
            {exportLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>내보내기</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 font-medium text-slate-700">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                다운로드 및 내보내기
              </div>

              {/* 1. Excel (.xlsx) 다운로드 */}
              <button
                type="button"
                onClick={() => {
                  setIsExportOpen(false);
                  onDownloadXlsx();
                }}
                className="w-full px-3 py-2 text-left hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Excel (.xlsx) 다운로드</div>
                  <div className="text-[10px] text-slate-400">서식과 수식이 보존된 스프레드시트</div>
                </div>
              </button>

              {/* 2. SQLite DB (.sqlite) 다운로드 */}
              <button
                type="button"
                onClick={() => {
                  setIsExportOpen(false);
                  if (currentUser?.plan === 'pro') onDownloadSqlite?.();
                  else onOpenPlanModal ? onOpenPlanModal() : onDownloadSqlite?.();
                }}
                className="w-full px-3 py-2 text-left hover:bg-indigo-50 hover:text-indigo-800 flex items-center gap-2 transition"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <span>SQLite DB 다운로드</span>
                    {currentUser?.plan !== 'pro' && <Crown className="w-3 h-3 text-amber-500" />}
                  </div>
                  <div className="text-[10px] text-slate-400">데이터베이스 파일로 추출 (PRO)</div>
                </div>
              </button>

              {/* 3. Google 스프레드시트 내보내기 */}
              <button
                type="button"
                onClick={() => {
                  setIsExportOpen(false);
                  onExportGoogleSheets();
                }}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2 transition"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Google 시트로 내보내기</div>
                  <div className="text-[10px] text-slate-400">구글 드라이브 스프레드시트와 실시간 연동</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 🌟 그룹 C: 공유 및 협업 통합 드롭다운 (링크 공유 / 시트 보내기 / 받은 시트함 / 공유 관리) */}
        <div className="relative" ref={shareMenuRef}>
          <button
            onClick={() => setIsShareOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition border active:scale-95 ${
              isShareOpen
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="링크 공유, 시트 전송, 받은 시트함 및 공유 관리"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-600" />
            <span>공유/협업</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isShareOpen ? 'rotate-180' : ''}`} />
          </button>

          {isShareOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 font-medium text-slate-700">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                공유 및 협업 센터
              </div>

              {/* 1. 읽기 전용 링크 공유 */}
              <button
                type="button"
                onClick={() => {
                  setIsShareOpen(false);
                  onOpenShareModal();
                }}
                disabled={!hasSheetData}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-800 disabled:opacity-40 flex items-center gap-2 transition"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <LinkIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">웹 링크 공유</div>
                  <div className="text-[10px] text-slate-400">읽기 전용 보안 웹 링크 생성</div>
                </div>
              </button>

              {/* 2. 보낸 시트함 */}
              {onOpenShareToManagerModal && currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    onOpenShareToManagerModal();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-indigo-50 hover:text-indigo-800 flex items-center gap-2 transition"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">보낸 시트함</div>
                    <div className="text-[10px] text-slate-400">보낸 시트 내역 조회, 회수 및 새 시트 전송</div>
                  </div>
                </button>
              )}

              {/* 3. 받은 시트함 */}
              {onOpenConsolidatedModal && currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    onOpenConsolidatedModal();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-purple-50 hover:text-purple-800 flex items-center gap-2 transition"
                >
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Inbox className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">받은 시트함</div>
                    <div className="text-[10px] text-slate-400">공유받은 시트 모아보기 및 통합 통계</div>
                  </div>
                </button>
              )}

              {/* 4. 웹 링크 공유 관리 센터 */}
              {onOpenShareManagementModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    onOpenShareManagementModal();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 hover:text-slate-900 border-t border-slate-100 flex items-center gap-2 transition mt-1"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">웹 링크 공유 관리</div>
                    <div className="text-[10px] text-slate-400">공유 링크 회수 및 만료 설정 관리</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* 🌟 그룹 E: 요금제 & 사용자 프로필 / 사용량 통합 뱃지 */}
        {onOpenPricingModal && (
          <button
            onClick={onOpenPricingModal}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition active:scale-95"
            title="요금제 및 기능 비교"
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden lg:inline">요금제</span>
          </button>
        )}

        {currentUser ? (
          <>
            <div className="relative">
              <button
                onClick={() => setIsUsageOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-800 transition active:scale-98"
                title="계정 정보 및 이번 달 사용량 확인"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3 h-3" />
                </div>
                <span className="font-bold text-[11px] text-slate-700">
                  {currentUser.phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {parsedDocsCount}/{maxDocs}장
                </span>
                {bonusCredits.bonusDocs > 0 && (
                  <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100 border border-blue-200 px-1 py-0.1 rounded-full">
                    +{bonusCredits.bonusDocs}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* 사용자 상세 정보 및 사용량 팝오버 */}
              <UserUsagePopover
                isOpen={isUsageOpen}
                onClose={() => setIsUsageOpen(false)}
                currentUser={currentUser}
                currentProject={currentProject}
                onOpenPlanModal={onOpenPlanModal || (() => {})}
                onOpenPricingModal={onOpenPricingModal}
                onOpenTransferModal={onOpenTransferModal}
                onOpenBillingHistory={onOpenBillingHistory}
                onLogout={onLogout}
              />
            </div>

            {/* 빠른 원클릭 로그아웃 버튼 */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition active:scale-95 cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
        )}
      </div>
    </header>
  );
}
