import React, { useState } from 'react';
import { Check, Sparkles, X, ArrowRight, Zap, Shield, Database, Ticket, Tag, Clock } from 'lucide-react';
import { UserSession } from '@/types/workspace';
import { validateCoupon, markCouponUsed, CouponDefinition, addBonusCredits } from '@/lib/coupon-helpers';
import { addBillingRecord } from '@/lib/billing-history';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onUpgrade?: () => void;
  onOpenEnterpriseInquiry?: () => void;
  onOpenBillingHistory?: () => void;
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
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDefinition | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;
  const isPro = currentUser?.plan === 'pro';

  // 쿠폰 코드 검증 및 적용
  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError(null);
    setCouponSuccessMsg(null);

    const result = validateCoupon(couponInput);
    if (!result.success || !result.coupon) {
      setCouponError(result.error || '유효하지 않은 쿠폰입니다.');
      return;
    }

    setAppliedCoupon(result.coupon);
    setCouponSuccessMsg(`✓ [${result.coupon.code}] ${result.coupon.name}이 적용되었습니다!`);
  };

  // 쿠폰 취소
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    setCouponSuccessMsg(null);
  };

  // 충전 실행 핸들러
  const handleExecuteTopup = (packName: string, originalAmount: number, finalAmount: number, benefitsDesc: string) => {
    if (appliedCoupon) {
      markCouponUsed(appliedCoupon.code);
    }

    const tokens = originalAmount === 2000 ? 250000 : originalAmount === 5000 ? 750000 : 1250000;
    const docs = originalAmount === 2000 ? 50 : originalAmount === 5000 ? 135 : 225;

    // 보너스 크레딧 (토큰 및 파싱 장수) 영구 적립
    addBonusCredits(tokens, docs);

    // 결제 / 충전 거래 내역 영구 보관 (영수증 및 세금계산서 연동)
    addBillingRecord({
      type: appliedCoupon && finalAmount === 0 ? 'coupon' : 'charge',
      title: packName,
      originalAmount,
      finalAmount,
      paymentMethod: finalAmount === 0 ? `프로모션 바우처 100% 무료 (${appliedCoupon?.code})` : '신용카드/간편결제',
      couponCode: appliedCoupon?.code,
      benefitsDesc,
      benefits: { tokens, docs },
    });

    const costText = finalAmount === 0 ? '무료 (0원 쿠폰 적용)' : `${finalAmount.toLocaleString()}원`;
    alert(`[${packName}] ${costText} 충전이 완료되었습니다!\n혜택: ${benefitsDesc}\n(결제 및 충전 내역 메뉴에서 영수증 인쇄와 세금계산서 신청이 가능합니다)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 text-slate-800 relative">
        <button onClick={onClose} className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        {/* 타이틀 및 상단 바로가기 */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
              Pricing & Deployment
            </span>
            {onOpenBillingHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBillingHistory();
                }}
                className="text-[11px] font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-3 py-1 rounded-full transition flex items-center gap-1 active:scale-95"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>나의 결제 / 충전 / 영수증 내역 ➔</span>
              </button>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">개인부터 사내 폐쇄망 구축까지</h2>
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
                {appliedCoupon?.type === 'pro_trial' ? (
                  <>
                    <span className="text-sm line-through text-slate-400">{isAnnual ? '7,900' : '9,900'}원</span>
                    <span className="text-2xl font-black text-blue-600">0원</span>
                    <span className="text-xs text-blue-600 font-bold ml-1">(1개월 무료 체험)</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-slate-900">{isAnnual ? '7,900' : '9,900'}원</span>
                    <span className="text-xs text-slate-500 font-normal">/ 월 {isAnnual && '(연 94,800원)'}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-blue-700/80 mb-4">대용량 처리와 실시간 SQLite 데이터베이스</p>
              <ul className="text-xs space-y-2 text-slate-800">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <strong>월 500장 기본 파싱</strong> (+장당 20원)</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <strong>데이터 행 수 무제한 (SQLite)</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> 증빙 원본 <strong>영구 보관 무료</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <strong>.sqlite DB 실시간 동기화</strong></li>
              </ul>
            </div>
            <button
              onClick={() => {
                if (appliedCoupon?.type === 'pro_trial') {
                  markCouponUsed(appliedCoupon.code);
                  addBillingRecord({
                    type: 'pro_trial',
                    title: 'PRO 플랜 1개월 무료 체험 (프로모션)',
                    originalAmount: isAnnual ? 7900 : 9900,
                    finalAmount: 0,
                    paymentMethod: `프로모션 바우처 (${appliedCoupon.code})`,
                    couponCode: appliedCoupon.code,
                    benefitsDesc: 'PRO 플랜 1개월 무료 개방 (행 수 무제한, 월 500장 파싱, SQLite DB)',
                    benefits: { durationMonths: 1, docs: 500 },
                  });
                  alert('PRO 1개월 무료 체험 쿠폰이 등록되었습니다! 즉시 PRO 플랜 혜택이 적용됩니다.');
                } else if (!isPro) {
                  addBillingRecord({
                    type: 'subscription',
                    title: `PRO 플랜 ${isAnnual ? '연간 구독' : '월간 구독'}`,
                    originalAmount: isAnnual ? 94800 : 9900,
                    finalAmount: isAnnual ? 94800 : 9900,
                    paymentMethod: '신용카드/정기결제',
                    benefitsDesc: '행 수 무제한, 월 500장 기본 파싱, 영구 보관, SQLite 실시간 동기화',
                    benefits: { durationMonths: isAnnual ? 12 : 1, docs: 500 },
                  });
                }
                onClose();
                if (!isPro && onUpgrade) onUpgrade();
              }}
              className={`w-full mt-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                isPro
                  ? 'bg-slate-100 text-slate-600 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
              }`}
            >
              <span>
                {isPro
                  ? '현재 이용 중인 플랜'
                  : appliedCoupon?.type === 'pro_trial'
                  ? '🎟️ 1개월 무료로 PRO 시작'
                  : '⭐ 지금 PRO 시작하기'}
              </span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
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

          {/* 🎟️ 프로모션 및 쿠폰 코드 등록 바 */}
          <div className="bg-white/90 border border-blue-200 rounded-xl p-3 mb-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Ticket className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-800">쿠폰 / 프로모션 코드 등록</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                      WELCOME2026 등
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">웰컴 바우처나 제휴 할인 코드를 입력해 추가 혜택을 받으세요</p>
                </div>
              </div>

              <form onSubmit={handleApplyCoupon} className="flex items-center gap-1.5 shrink-0">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="예: WELCOME2026, PROMO50"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono uppercase focus:outline-none focus:border-blue-600 bg-white placeholder:normal-case placeholder:font-sans w-44"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-2xs active:scale-95"
                >
                  적용
                </button>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-slate-500 hover:text-rose-600 text-xs transition"
                    title="쿠폰 적용 취소"
                  >
                    취소
                  </button>
                )}
              </form>
            </div>

            {/* 쿠폰 적용 메시지 피드백 */}
            {couponSuccessMsg && (
              <div className="mt-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{couponSuccessMsg}</span>
              </div>
            )}
            {couponError && (
              <div className="mt-2.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}
          </div>

          {/* 3단 충전 팩 카드 */}
          {(() => {
            // 라이트(2,000원) 할인 계산
            const isFreeLite = appliedCoupon?.code === 'WELCOME2026';
            const liteDiscount = appliedCoupon?.discountPercent ? (2000 * appliedCoupon.discountPercent) / 100 : 0;
            const liteFinalCost = isFreeLite ? 0 : Math.max(0, 2000 - liteDiscount);

            // 비즈니스(5,000원) 할인 계산
            const bizDiscount = appliedCoupon?.discountPercent ? (5000 * appliedCoupon.discountPercent) / 100 : 0;
            const bizFinalCost = Math.max(0, 5000 - bizDiscount);

            // 파워(8,000원) 할인 계산
            const powerDiscount = appliedCoupon?.discountPercent ? (8000 * appliedCoupon.discountPercent) / 100 : 0;
            const powerFinalCost = Math.max(0, 8000 - powerDiscount);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 라이트 2,000원 */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-blue-400 hover:shadow-xs transition">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-800">라이트 (Lite)</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">가성비</span>
                    </div>

                    <div className="mb-2.5">
                      {isFreeLite ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs line-through text-slate-400">2,000원</span>
                          <span className="text-xl font-black text-blue-600">0원</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1 rounded">100% 무료</span>
                        </div>
                      ) : liteFinalCost < 2000 ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs line-through text-slate-400">2,000원</span>
                          <span className="text-xl font-black text-blue-600">{liteFinalCost.toLocaleString()}원</span>
                        </div>
                      ) : (
                        <div className="text-xl font-black text-slate-900">2,000원</div>
                      )}
                    </div>

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
                    onClick={() => handleExecuteTopup('라이트 팩', 2000, liteFinalCost, '문서 파싱 50장 또는 AI 대화 100회')}
                    className={`w-full py-2 font-bold text-xs rounded-lg transition active:scale-95 shadow-2xs ${
                      liteFinalCost === 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                    }`}
                  >
                    {liteFinalCost === 0 ? '✨ 0원에 무료 충전' : `${liteFinalCost.toLocaleString()}원 충전`}
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

                    <div className="mb-2.5">
                      {bizFinalCost < 5000 ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs line-through text-slate-400">5,000원</span>
                          <span className="text-xl font-black text-blue-600">{bizFinalCost.toLocaleString()}원</span>
                        </div>
                      ) : (
                        <div className="text-xl font-black text-blue-900">5,000원</div>
                      )}
                    </div>

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
                    onClick={() => handleExecuteTopup('비즈니스 팩', 5000, bizFinalCost, '문서 파싱 135장 또는 AI 대화 300회')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs active:scale-95"
                  >
                    {bizFinalCost.toLocaleString()}원 충전
                  </button>
                </div>

                {/* 파워 8,000원 */}
                <div className="bg-white rounded-xl border border-indigo-200 p-4 flex flex-col justify-between hover:border-indigo-400 hover:shadow-xs transition">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-800">파워 (Power)</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">+25장 덤</span>
                    </div>

                    <div className="mb-2.5">
                      {powerFinalCost < 8000 ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs line-through text-slate-400">8,000원</span>
                          <span className="text-xl font-black text-indigo-600">{powerFinalCost.toLocaleString()}원</span>
                        </div>
                      ) : (
                        <div className="text-xl font-black text-slate-900">8,000원</div>
                      )}
                    </div>

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
                    onClick={() => handleExecuteTopup('파워 팩', 8000, powerFinalCost, '문서 파싱 225장 또는 AI 대화 500회')}
                    className="w-full py-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition active:scale-95 shadow-2xs"
                  >
                    {powerFinalCost.toLocaleString()}원 충전
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
