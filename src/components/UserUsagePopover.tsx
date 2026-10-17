'use client';

import React from 'react';
import { Sparkles, Check, Database, Zap, ArrowRight, ShieldCheck, X, Smartphone } from 'lucide-react';
import { UserSession, ProjectWorkspace } from '@/types/workspace';
import { getPlanLimits } from '@/lib/plan-limits';

interface UserUsagePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  currentProject: ProjectWorkspace | null;
  onOpenPlanModal: () => void;
  onOpenPricingModal?: () => void;
  onOpenTransferModal?: () => void;
}

export function UserUsagePopover({
  isOpen,
  onClose,
  currentUser,
  currentProject,
  onOpenPlanModal,
  onOpenPricingModal,
  onOpenTransferModal,
}: UserUsagePopoverProps) {

  if (!isOpen) return null;

  const plan = currentUser?.plan === 'pro' ? 'pro' : 'free';
  const isPro = plan === 'pro';
  const policy = getPlanLimits(plan);

  // 현재 프로젝트 통계
  const currentSheet = currentProject?.sheets[currentProject.activeSheetIndex];
  const sheetCount = currentProject?.sheets.length || 0;
  const currentRowsCount = currentSheet?.rows.length || 0;

  // 파싱 사용량 추정치 (프로젝트 내 원본 파일 총 개수 또는 데모 수치)
  const totalParsedDocs = currentProject?.originalFiles?.length || 1;
  const monthlyMaxDocs = policy.includedMonthlyDocs;
  const parsedPercent = Math.min(100, Math.round((totalParsedDocs / monthlyMaxDocs) * 100));

  const overageDocs = isPro && totalParsedDocs > monthlyMaxDocs ? totalParsedDocs - monthlyMaxDocs : 0;
  const overageCost = overageDocs * policy.overagePricePerDoc;

  const sheetsPercent = Math.min(100, Math.round((sheetCount / policy.maxSheetsPerProject) * 100));
  const rowsPercent = isPro ? 15 : Math.min(100, Math.round((currentRowsCount / policy.maxRowsPerSheet) * 100));

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-92 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-slate-900">
              {currentUser?.phoneNumber ? currentUser.phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3') : '게스트 사용자'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {policy.badge} 플랜
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">매월 1일 파싱 기본량 자동 갱신</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 핵심 지표 3종 */}
      <div className="py-3.5 space-y-3.5">
        {/* 1. 월간 AI 파싱량 */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              월간 AI 문서 파싱
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-800">
              {totalParsedDocs} / {monthlyMaxDocs}장
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                parsedPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${parsedPercent}%` }}
            />
          </div>
          {isPro && overageDocs > 0 && (
            <p className="text-[10px] text-indigo-600 font-medium mt-1">
              기본 제공 소진 완료 · 초과 {overageDocs}장 누적 (+{overageCost.toLocaleString()}원 종량 과금)
            </p>
          )}
        </div>

        {/* 2. 프로젝트 시트 생성 수 */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <span>📑 프로젝트 시트</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-800">
              {sheetCount} / {policy.maxSheetsPerProject}개
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                sheetsPercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${sheetsPercent}%` }}
            />
          </div>
        </div>

        {/* 3. 현재 시트 데이터 행 수 */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              현재 시트 데이터 행 수
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-800">
              {isPro ? (
                <span className="text-indigo-600 font-bold">{currentRowsCount.toLocaleString()}행 (무제한)</span>
              ) : (
                `${currentRowsCount} / ${policy.maxRowsPerSheet}행`
              )}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isPro ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : (rowsPercent > 80 ? 'bg-rose-500' : 'bg-blue-500')
              }`}
              style={{ width: `${rowsPercent}%` }}
            />
          </div>
          {isPro && (
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              SQLite 고속 DB 실시간 동기화 지원
            </p>
          )}
        </div>
      </div>

      {/* 하단 플랜 액션 */}
      {!isPro ? (
        <div className="pt-3 border-t border-slate-100">
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 mb-3 text-left">
            <div className="flex items-center gap-1 text-xs font-bold text-blue-900 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>PRO 플랜으로 무제한 경험</span>
            </div>
            <p className="text-[10px] text-blue-700/80 leading-relaxed">
              시트 30개, <strong>행 수 무제한</strong>, 월 500장 파싱 + 영구 보관을 월 9,900원에 누려보세요.
            </p>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenPlanModal();
            }}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-98"
          >
            <span>⭐ PRO로 업그레이드하기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>다음 결제 예정일: 매월 1일</span>
          <span className="text-indigo-600 font-semibold">월 9,900원 / 정상 이용 중</span>
        </div>
      )}

      {onOpenPricingModal && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 text-center">
          <button
            onClick={() => {
              onClose();
              onOpenPricingModal();
            }}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            전체 요금제 및 기능 상세 비교 ➔
          </button>
        </div>
      )}

      {onOpenTransferModal && currentUser && (
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onOpenTransferModal();
            }}
            className="w-full py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-between border border-slate-200 transition active:scale-98"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>담당자 인수인계 (휴대폰 승계)</span>
            </div>
            <span className="text-[10px] text-slate-400">데이터 이전 ➔</span>
          </button>
        </div>
      )}
    </div>
  );
}

