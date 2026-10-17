'use client';

import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet, Download, Share2, RefreshCw, Smartphone, LogOut,
  User, Database, Crown, UploadCloud, Zap, ChevronDown,
} from 'lucide-react';
import { UserSession, ProjectWorkspace } from '@/types/workspace';
import { UserUsagePopover } from './UserUsagePopover';
import { getPlanLimits } from '@/lib/plan-limits';

interface HeaderProps {
  currentUser: UserSession | null;
  currentProject?: ProjectWorkspace | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onDownloadXlsx: () => void;
  onDownloadSqlite?: () => void;
  onOpenPlanModal?: () => void;
  onOpenPricingModal?: () => void;
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
  onExportGoogleSheets,
  onOpenShareModal,
  onUploadFile,
  hasSheetData,
  exportLoading,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUsageOpen, setIsUsageOpen] = useState<boolean>(false);
  const planPolicy = getPlanLimits(currentUser?.plan);
  const parsedDocsCount = currentProject?.originalFiles?.length || 1;

  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/15">
          <FileSpreadsheet className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">FileToSheet</span>
          <p className="text-xs text-slate-500 font-normal">어떤 파일이든 드롭 즉시 엑셀 표로, FileToSheet</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0] && onUploadFile) {
              onUploadFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
          accept=".xlsx,.xls,.csv,.pdf,image/*"
          className="hidden"
        />

        {/* 요금제 비교 모달 버튼 */}
        <button
          onClick={onOpenPricingModal}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 hover:border-amber-300 text-slate-800 shadow-2xs transition active:scale-98"
          title="FileToSheet 플랜 및 기능 비교"
        >
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>요금제</span>
        </button>

        {currentUser ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 leading-tight">
                {currentUser.phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')}
              </span>
              <span className="text-[10px] text-blue-600 font-medium leading-tight">
                {currentUser.plan === 'pro' ? '⭐ PRO 플랜' : '기본 회원 (Free)'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="ml-1 p-1 hover:bg-blue-100 rounded-md text-slate-400 hover:text-slate-700 transition"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-98"
          >
            <Smartphone className="w-3.5 h-3.5" />
            로그인
          </button>
        )}

        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setIsUsageOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition"
              title="이번 달 사용량 및 잔여량 확인"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{parsedDocsCount}/{planPolicy.includedMonthlyDocs}장</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <UserUsagePopover
              isOpen={isUsageOpen}
              onClose={() => setIsUsageOpen(false)}
              currentUser={currentUser}
              currentProject={currentProject}
              onOpenPlanModal={onOpenPlanModal || (() => {})}
              onOpenPricingModal={onOpenPricingModal}
            />
          </div>
        )}

        {onUploadFile && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition active:scale-98"
            title="새 파일 업로드 및 AI 자연어 추출 요청"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>파일 추가</span>
          </button>
        )}

        <button
          onClick={onDownloadXlsx}
          disabled={!hasSheetData}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-xs transition active:scale-98"
        >
          <Download className="w-3.5 h-3.5" />
          .xlsx
        </button>

        <button
          onClick={() => {
            if (currentUser?.plan === 'pro') onDownloadSqlite?.();
            else onOpenPlanModal ? onOpenPlanModal() : onDownloadSqlite?.();
          }}
          disabled={!hasSheetData || exportLoading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-xs transition active:scale-98"
          title={currentUser?.plan === 'pro' ? '프로젝트를 SQLite 데이터베이스 파일로 다운로드' : 'PRO 전용: SQLite DB 다운로드'}
        >
          <Database className="w-3.5 h-3.5 text-indigo-200" />
          <span>.sqlite DB</span>
          {currentUser?.plan !== 'pro' && <Crown className="w-3 h-3 text-amber-300 ml-0.5" />}
        </button>

        <button
          onClick={onExportGoogleSheets}
          disabled={!hasSheetData || exportLoading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-xs transition active:scale-98"
        >
          {exportLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
          Google 시트로 내보내기
        </button>

        <button
          onClick={onOpenShareModal}
          disabled={!hasSheetData}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:hover:bg-indigo-50 shadow-xs transition active:scale-98"
          title="시트 및 탭을 선택하여 읽기 전용 링크로 공유"
        >
          <Share2 className="w-3.5 h-3.5" />
          공유
        </button>
      </div>
    </header>
  );
}
