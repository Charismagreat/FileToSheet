'use client';

import React from 'react';
import { AlertTriangle, Sparkles, Check, X, ArrowRight } from 'lucide-react';
import { getPlanLimits } from '@/lib/plan-limits';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reason: string;
  plan?: string;
}

export function PlanLimitModal({ isOpen, onClose, title = '이용 한도 도달 안내', reason, plan = 'free' }: PlanLimitModalProps) {
  if (!isOpen) return null;
  const policy = getPlanLimits(plan);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">{reason}</p>

        {/* PRO 플랜 비교 안내 박스 (방안 A: 하이브리드 종량제) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>⭐ PRO 플랜 혜택</span>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">월 9,900원</span>
          </div>
          <ul className="text-xs text-slate-700 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-blue-600 shrink-0" />
              <span>프로젝트당 시트 <strong>최대 30개</strong> (Free: 5개)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-blue-600 shrink-0" />
              <span>시트당 데이터 <strong>무제한 지원</strong> (SQLite DB 고속 탑재)</span>
            </li>

            <li className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-blue-600 shrink-0" />
              <span>월 <strong>500장 기본 파싱</strong> + 초과 시 <strong>장당 20원</strong></span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-blue-600 shrink-0" />
              <span>원본 증빙 문서 <strong>영구 보관 무료</strong> (Free: 30일)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Google Sheets 연동 & .sqlite DB 원클릭 다운로드</span>
            </li>
          </ul>
        </div>


        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            확인
          </button>
          <button
            type="button"
            onClick={() => {
              alert('PRO 플랜 도입 및 결제 연동은 관리자에게 문의해 주세요.');
              onClose();
            }}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
          >
            <span>PRO 업그레이드</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
