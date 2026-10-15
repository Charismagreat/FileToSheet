'use client';

import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Share2,
  RefreshCw,
  FolderOpen,
  Smartphone,
  LogOut,
  User,
} from 'lucide-react';
import { UserSession } from '@/types/workspace';

interface HeaderProps {
  currentUser: UserSession | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onDownloadXlsx: () => void;
  onExportGoogleSheets: () => void;
  onOpenOriginalModal: () => void;
  hasOriginalFile: boolean;
  hasSheetData: boolean;
  exportLoading: boolean;
  recentFilesCount: number;
  onOpenRecentFilesModal: () => void;
}

export function Header({
  currentUser,
  onOpenLoginModal,
  onLogout,
  onDownloadXlsx,
  onExportGoogleSheets,
  hasSheetData,
  exportLoading,
  recentFilesCount,
  onOpenRecentFilesModal,
}: HeaderProps) {
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
        {/* 보관함 파일 목록 콤팩트 버튼 */}
        <button
          onClick={onOpenRecentFilesModal}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition shadow-2xs active:scale-98"
          title="이전에 작업한 보관 파일 목록 열기"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>보관함</span>
          {recentFilesCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold">
              {recentFilesCount}
            </span>
          )}
        </button>

        {/* 회원 로그인 상태 뱃지 또는 가입 버튼 */}
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
            휴대폰 간편 로그인
          </button>
        )}

        {/* 엑셀 다운로드 */}
        <button
          onClick={onDownloadXlsx}
          disabled={!hasSheetData}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-xs transition active:scale-98"
        >
          <Download className="w-3.5 h-3.5" />
          .xlsx 다운로드
        </button>

        {/* Google 시트 내보내기 */}
        <button
          onClick={onExportGoogleSheets}
          disabled={!hasSheetData || exportLoading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-xs transition active:scale-98"
        >
          {exportLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          Google 시트로 내보내기
        </button>
      </div>
    </header>
  );
}
