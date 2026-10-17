'use client';

import React, { useState } from 'react';
import { Check, Sparkles, X, ArrowRight, Zap, Shield, Database } from 'lucide-react';
import { UserSession } from '@/types/workspace';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onUpgrade?: () => void;
}

const COMPARISON_FEATURES = [
  { name: '월간 AI 문서 파싱', free: '월 30장 무료', pro: '월 500장 기본 + 초과 장당 20원' },
  { name: '시트당 데이터 행 수', free: '최대 500행', pro: '무제한 (Unlimited · SQLite)' },
  { name: '프로젝트당 시트 수', free: '최대 5개', pro: '최대 30개' },
  { name: '엑셀 / CSV 파싱', free: '무료 무제한', pro: '무료 무제한' },
  { name: '단일 파일 허용 크기', free: '최대 10MB', pro: '최대 50MB' },
  { name: '원본 증빙 파일 보관', free: '최근 30일간 보관', pro: '영구 보관 무료 (평생 아카이빙)' },
  { name: '데이터베이스 내보내기', free: '.xlsx 엑셀 다운로드', pro: '.xlsx + .sqlite DB 동기화/다운로드' },
  { name: '보안 링크 공유', free: '일반 링크 공유', pro: '비밀번호 보호 & 탭별 선택적 공유' },
];

export function PricingModal({ isOpen, onClose, currentUser, onUpgrade }: PricingModalProps) {
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  if (!isOpen) return null;

  const isPro = currentUser?.plan === 'pro';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 text-slate-800 relative">
        <button onClick={onClose} className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        {/* 타이틀 및 연간 토글 */}
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Pricing Plans
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">합리적이고 투명한 요금제</h2>
          <p className="text-xs text-slate-500 mt-1">업무 규모에 맞춰 필요한 만큼 유연하게 이용하세요.</p>

          {/* 결제 주기 토글 */}
          <div className="inline-flex items-center gap-2 mt-4 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-3 py-1.5 rounded-lg transition ${!isAnnual ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isAnnual ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <span>연간 결제</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full font-bold">20% 할인</span>
            </button>
          </div>
        </div>

        {/* 2열 카드: Free vs PRO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Free 카드 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-sm text-slate-800">기본 플랜</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">Free</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mb-1">0원</div>
              <p className="text-[11px] text-slate-500 mb-4">가벼운 문서와 일상 영수증 표 변환</p>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400" /> 월 30장 무료 파싱</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400" /> 시트당 최대 500행</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400" /> 프로젝트당 시트 5개</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400" /> 최근 30일 문서 보관</li>
              </ul>
            </div>
            <div className="mt-5">
              <button disabled className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs font-bold">
                {!isPro ? '현재 이용 중인 플랜' : '기본 플랜'}
              </button>
            </div>
          </div>

          {/* PRO 카드 */}
          <div className="rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-50/30 to-white p-5 flex flex-col justify-between shadow-lg shadow-blue-500/10 relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[10px] shadow-xs">
              🔥 가장 인기
            </span>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-sm text-blue-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  PRO 플랜
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">추천</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-slate-900">
                  {isAnnual ? '7,900' : '9,900'}원
                </span>
                <span className="text-xs text-slate-500 font-normal">/ 월 {isAnnual && '(연 94,800원)'}</span>
              </div>
              <p className="text-[11px] text-blue-700/80 mb-4">대용량 처리와 실시간 SQLite 데이터베이스</p>
              <ul className="text-xs space-y-2 text-slate-800">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600" /> <strong>월 500장 기본 파싱</strong> + 초과 장당 20원</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600" /> <strong>데이터 행 수 무제한 (SQLite 탑재)</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600" /> 프로젝트당 시트 <strong>최대 30개</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600" /> 증빙 원본 <strong>영구 보관 무료</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600" /> <strong>.sqlite DB 실시간 동기화 & 다운로드</strong></li>
              </ul>
            </div>
            <div className="mt-5">
              <button
                onClick={() => {
                  onClose();
                  if (!isPro && onUpgrade) onUpgrade();
                }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                  isPro ? 'bg-slate-100 text-slate-600 cursor-default' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
                }`}
              >
                <span>{isPro ? '현재 이용 중인 플랜' : '⭐ 지금 PRO 시작하기'}</span>
                {!isPro && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 상세 비교 테이블 */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
          <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200">
            기능별 상세 비교표
          </div>
          <div className="divide-y divide-slate-100">
            {COMPARISON_FEATURES.map((feat, idx) => (
              <div key={idx} className="grid grid-cols-3 px-4 py-2 hover:bg-slate-50/60 transition">
                <span className="font-medium text-slate-700">{feat.name}</span>
                <span className="text-slate-500 text-center">{feat.free}</span>
                <span className="font-semibold text-blue-700 text-center">{feat.pro}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
