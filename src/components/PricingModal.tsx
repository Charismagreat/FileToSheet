'use client';

import React, { useState } from 'react';
import { Check, Sparkles, X, ArrowRight, Zap, Shield, Database } from 'lucide-react';
import { UserSession } from '@/types/workspace';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onUpgrade?: () => void;
  onOpenEnterpriseInquiry?: () => void;
}

const COMPARISON_FEATURES = [
  { name: '월 AI 파싱 기본 제공', free: '월 30장 무료', pro: '월 500장 + 초과 20원', ent: '사내 인프라 무제한' },
  { name: '월 AI 비서 자연어 대화', free: '월 3만 토큰 (약 15회)', pro: '월 30만 토큰 (약 150회)', ent: '무제한 (자체 API/폐쇄망)' },
  { name: '시트당 데이터 행 수', free: '최대 500행', pro: '무제한 (SQLite)', ent: '무제한 (사내 DB 연동)' },
  { name: '배포 및 운영 환경', free: '퍼블릭 클라우드', pro: '퍼블릭 클라우드', ent: '사내 폐쇄망 / On-Premise' },
  { name: '데이터 반출 및 보안', free: '최근 30일 보관', pro: '영구 보관 무료', ent: '외부 반출 0% (완전 격리)' },
  { name: '사내 계정 및 인증', free: '개인 휴대폰 인증', pro: '개인 휴대폰 인증', ent: '사내 SSO / LDAP 연동' },
  { name: '데이터베이스 내보내기', free: '.xlsx 엑셀', pro: '.xlsx + .sqlite DB', ent: '전사 DB 실시간 파이프라인' },
  { name: '기술 지원 및 SLA', free: '커뮤니티 지원', pro: '영업일 우선 답변', ent: '전담 엔지니어 & SLA 보장' },
];

export function PricingModal({ isOpen, onClose, currentUser, onUpgrade, onOpenEnterpriseInquiry }: PricingModalProps) {
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  if (!isOpen) return null;
  const isPro = currentUser?.plan === 'pro';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 text-slate-800 relative">
        <button onClick={onClose} className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        {/* 타이틀 및 연간 토글 */}
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Pricing & Deployment
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">개인부터 사내 폐쇄망 구축까지</h2>
          <p className="text-xs text-slate-500 mt-1">업무 환경과 보안 정책에 최적화된 플랜을 선택하세요.</p>

          <div className="inline-flex items-center gap-2 mt-4 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button onClick={() => setIsAnnual(false)} className={`px-3 py-1.5 rounded-lg transition ${!isAnnual ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>월간 결제</button>
            <button onClick={() => setIsAnnual(true)} className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isAnnual ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
              <span>연간 결제</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full font-bold">20% 할인</span>
            </button>
          </div>
        </div>

        {/* 3열 카드: Free vs PRO vs Enterprise */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Free 카드 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-sm text-slate-800">기본 플랜</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">Free</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mb-1">0원</div>
              <p className="text-[11px] text-slate-500 mb-4">가벼운 문서 변환 및 일상 영수증 처리</p>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 월 30장 무료 파싱</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 시트당 최대 500행</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 프로젝트당 시트 5개</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 30일간 원본 보관</li>
              </ul>
            </div>
            <button disabled className="w-full mt-5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs font-bold">
              {!isPro ? '현재 이용 중인 플랜' : '기본 플랜'}
            </button>
          </div>

          {/* PRO 카드 */}
          <div className="rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-50/30 to-white p-5 flex flex-col justify-between shadow-lg shadow-blue-500/10 relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[10px] shadow-xs">🔥 가장 인기</span>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-sm text-blue-900 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-blue-600" /> PRO 플랜</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">추천</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-slate-900">{isAnnual ? '7,900' : '9,900'}원</span>
                <span className="text-xs text-slate-500 font-normal">/ 월 {isAnnual && '(연 94,800원)'}</span>
              </div>
              <p className="text-[11px] text-blue-700/80 mb-4">대용량 처리와 실시간 SQLite 데이터베이스</p>
              <ul className="text-xs space-y-2 text-slate-800">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <strong>월 500장 기본 파싱</strong> (+장당 20원)</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <strong>데이터 행 수 무제한 (SQLite)</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> 증빙 원본 <strong>영구 보관 무료</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <strong>.sqlite DB 실시간 동기화</strong></li>
              </ul>
            </div>
            <button onClick={() => { onClose(); if (!isPro && onUpgrade) onUpgrade(); }} className={`w-full mt-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${isPro ? 'bg-slate-100 text-slate-600 cursor-default' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'}`}>
              <span>{isPro ? '현재 이용 중인 플랜' : '⭐ 지금 PRO 시작하기'}</span>
              {!isPro && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Enterprise 사내 구축형 카드 */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-sm text-indigo-950 flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-indigo-600" /> 사내 구축형</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">Enterprise</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mb-1">도입 문의</div>
              <p className="text-[11px] text-indigo-700/80 mb-4">사내 폐쇄망 서버 배포 및 대외비 문서 격리</p>
              <ul className="text-xs space-y-2 text-slate-800">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> <strong>사내 폐쇄망 On-Premise 단독 배포</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> <strong>외부 데이터 반출 0% (완전 보안)</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> <strong>사내 임직원 무제한 / SSO 연동</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> 전담 엔지니어 기술 지원 & 커스텀</li>
              </ul>
            </div>
            <button onClick={() => { onClose(); onOpenEnterpriseInquiry?.(); }} className="w-full mt-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 active:scale-98">
              <span>🏢 도입 및 견적 상담</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 상세 비교 테이블 (4열) */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs mb-6">
          <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200 grid grid-cols-4">
            <span>기능 및 지원 범위</span>
            <span className="text-center text-slate-600">Free</span>
            <span className="text-center text-blue-700">PRO</span>
            <span className="text-center text-indigo-700">사내 구축형</span>
          </div>
          <div className="divide-y divide-slate-100">
            {COMPARISON_FEATURES.map((feat, idx) => (
              <div key={idx} className="grid grid-cols-4 px-4 py-2 hover:bg-slate-50/60 transition items-center">
                <span className="font-medium text-slate-700">{feat.name}</span>
                <span className="text-slate-500 text-center">{feat.free}</span>
                <span className="font-semibold text-blue-700 text-center">{feat.pro}</span>
                <span className="font-semibold text-indigo-700 text-center">{feat.ent}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 🌟 2,000원 / 5,000원 / 8,000원 초과 종량 크레딧 충전 팩 섹션 */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/40 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-900">초과 종량 크레딧 충전 (Pay-As-You-Go)</h3>
                <span className="text-[10px] bg-blue-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                  충전형
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                기본 한도 소진 시 원하는 만큼 소액 충전하여 즉시 사용하세요 (Gemini 3.8 Flash 초저비용 원가 반영)
              </p>
            </div>
            <span className="text-[11px] text-blue-700 font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs shrink-0">
              유효기간 없이 영구 적립
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 라이트 2,000원 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-blue-400 hover:shadow-xs transition">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-slate-800">라이트 (Lite)</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">가성비</span>
                </div>
                <div className="text-xl font-black text-slate-900 mb-2.5">2,000원</div>
                <ul className="text-[11px] text-slate-600 space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>문서 파싱 <strong>50장</strong></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>AI 질문 <strong>100회</strong> (25만 토큰)</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert('2,000원 라이트 크레딧(문서 50장 또는 AI 대화 100회)이 계정에 충전되었습니다!');
                  onClose();
                }}
                className="w-full py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition active:scale-95 shadow-2xs"
              >
                2,000원 충전
              </button>
            </div>

            {/* 비즈니스 5,000원 */}
            <div className="bg-white rounded-xl border-2 border-blue-600 p-4 flex flex-col justify-between shadow-xs relative">
              <span className="absolute -top-2.5 right-3 px-2 py-0.2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[9px] rounded-full shadow-2xs">
                🔥 추천
              </span>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-blue-950">비즈니스 (Biz)</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">+10장 덤</span>
                </div>
                <div className="text-xl font-black text-blue-900 mb-2.5">5,000원</div>
                <ul className="text-[11px] text-slate-700 space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>문서 파싱 <strong>135장</strong> (보너스 10장)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>AI 질문 <strong>300회</strong> (75만 토큰)</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert('5,000원 비즈니스 크레딧(문서 135장 또는 AI 대화 300회)이 계정에 충전되었습니다!');
                  onClose();
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs active:scale-95"
              >
                5,000원 충전
              </button>
            </div>

            {/* 파워 8,000원 */}
            <div className="bg-white rounded-xl border border-indigo-200 p-4 flex flex-col justify-between hover:border-indigo-400 hover:shadow-xs transition">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-slate-800">파워 (Power)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">+25장 덤</span>
                </div>
                <div className="text-xl font-black text-slate-900 mb-2.5">8,000원</div>
                <ul className="text-[11px] text-slate-600 space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>문서 파싱 <strong>225장</strong> (보너스 25장)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>AI 질문 <strong>500회</strong> (125만 토큰)</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert('8,000원 파워 크레딧(문서 225장 또는 AI 대화 500회)이 계정에 충전되었습니다!');
                  onClose();
                }}
                className="w-full py-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition active:scale-95 shadow-2xs"
              >
                8,000원 충전
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
