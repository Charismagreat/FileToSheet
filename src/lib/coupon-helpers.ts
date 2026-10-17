/**
 * FileToSheet 프로모션 쿠폰 및 바우처 헬퍼
 */

export interface CouponDefinition {
  code: string;
  name: string;
  description: string;
  type: 'free_pack' | 'discount_percent' | 'discount_fixed' | 'pro_trial';
  targetPackAmount?: number; // 2000, 5000, 8000
  discountPercent?: number; // e.g. 50
  discountAmount?: number; // e.g. 2000
  freeBenefits?: {
    docs: number;
    aiQueries: number;
  };
}

// 서비스 기본 프로모션 쿠폰 목록
export const PROMO_COUPONS: CouponDefinition[] = [
  {
    code: 'WELCOME2026',
    name: '신규 가입 웰컴 바우처',
    description: '라이트 팩(2,000원) 100% 무료 지급 (문서 50장 또는 AI 100회)',
    type: 'free_pack',
    targetPackAmount: 2000,
    freeBenefits: {
      docs: 50,
      aiQueries: 100,
    },
  },
  {
    code: 'PROMO50',
    name: '첫 충전 50% 반값 할인 쿠폰',
    description: '모든 충전 팩 결제 시 50% 즉시 할인',
    type: 'discount_percent',
    discountPercent: 50,
  },
  {
    code: 'PRO1MONTH',
    name: 'PRO 플랜 1개월 무료 체험권',
    description: 'PRO 플랜 1개월 무료 승급 및 전 기능 무제한 개방',
    type: 'pro_trial',
  },
  {
    code: 'FILETOSHEET',
    name: '얼리버드 감사 쿠폰',
    description: '보너스 크레딧 1,000원 상당 즉시 지급 (문서 25장 또는 AI 50회)',
    type: 'free_pack',
    freeBenefits: {
      docs: 25,
      aiQueries: 50,
    },
  },
];

const USED_COUPONS_KEY = 'filetosheet_used_coupons';

/**
 * 로컬에 등록된 사용 쿠폰 목록 조회
 */
export function getUsedCoupons(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USED_COUPONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 쿠폰 사용 기록 저장
 */
export function markCouponUsed(code: string) {
  if (typeof window === 'undefined') return;
  const used = getUsedCoupons();
  const normalized = code.trim().toUpperCase();
  if (!used.includes(normalized)) {
    used.push(normalized);
    localStorage.setItem(USED_COUPONS_KEY, JSON.stringify(used));
  }
}

/**
 * 쿠폰 코드 유효성 검증
 */
export function validateCoupon(code: string): {
  success: boolean;
  coupon?: CouponDefinition;
  error?: string;
} {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { success: false, error: '쿠폰 코드를 입력해 주세요.' };
  }

  const used = getUsedCoupons();
  if (used.includes(normalized)) {
    return { success: false, error: '이미 사용된 쿠폰 코드입니다. (계정당 1회만 사용 가능)' };
  }

  const found = PROMO_COUPONS.find((c) => c.code === normalized);
  if (!found) {
    return { success: false, error: '유효하지 않거나 존재하지 않는 쿠폰 코드입니다.' };
  }

  return { success: true, coupon: found };
}

const BONUS_TOKENS_KEY = 'filetosheet_bonus_tokens';
const BONUS_DOCS_KEY = 'filetosheet_bonus_docs';

/**
 * 누적 보너스 크레딧 (토큰 및 파싱 장수) 조회
 */
export function getBonusCredits(): { bonusTokens: number; bonusDocs: number } {
  if (typeof window === 'undefined') return { bonusTokens: 0, bonusDocs: 0 };
  try {
    syncWelcomeBonusIfNeeded();
    const tokens = Number(localStorage.getItem(BONUS_TOKENS_KEY) || '0');
    const docs = Number(localStorage.getItem(BONUS_DOCS_KEY) || '0');
    return {
      bonusTokens: isNaN(tokens) ? 0 : tokens,
      bonusDocs: isNaN(docs) ? 0 : docs,
    };
  } catch {
    return { bonusTokens: 0, bonusDocs: 0 };
  }
}

/**
 * 보너스 크레딧 적립
 */
export function addBonusCredits(tokens: number, docs: number) {
  if (typeof window === 'undefined') return;
  const currentTokens = Number(localStorage.getItem(BONUS_TOKENS_KEY) || '0');
  const currentDocs = Number(localStorage.getItem(BONUS_DOCS_KEY) || '0');
  const nextTokens = (isNaN(currentTokens) ? 0 : currentTokens) + tokens;
  const nextDocs = (isNaN(currentDocs) ? 0 : currentDocs) + docs;

  localStorage.setItem(BONUS_TOKENS_KEY, String(nextTokens));
  localStorage.setItem(BONUS_DOCS_KEY, String(nextDocs));
  window.dispatchEvent(new Event('filetosheet_credit_updated'));
}

/**
 * 이미 WELCOME2026을 사용한 사용자에게 25만 토큰 / 50장 자동 보정 연동
 */
export function syncWelcomeBonusIfNeeded() {
  if (typeof window === 'undefined') return;
  try {
    const used = getUsedCoupons();
    if (used.includes('WELCOME2026')) {
      const currentTokens = Number(localStorage.getItem(BONUS_TOKENS_KEY) || '0');
      if (!currentTokens || currentTokens < 250000) {
        localStorage.setItem(BONUS_TOKENS_KEY, '250000');
        const currentDocs = Number(localStorage.getItem(BONUS_DOCS_KEY) || '0');
        if (!currentDocs || currentDocs < 50) {
          localStorage.setItem(BONUS_DOCS_KEY, '50');
        }
      }
    }
  } catch {
    // ignore
  }
}

