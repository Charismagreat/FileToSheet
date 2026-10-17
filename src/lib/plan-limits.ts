/**
 * FileToSheet 회원 등급별(Free vs Pro) 이용 한도 및 요금 정책 (방안 A: 하이브리드 종량제)
 */

export interface PlanPolicy {
  name: string;
  badge: string;
  monthlyPrice: number;        // 월 구독료 (원)
  annualMonthlyPrice: number;  // 연간 결제 시 월 환산 요금 (원)
  maxSheetsPerProject: number; // 프로젝트당 최대 시트 수
  maxRowsPerSheet: number;     // 시트당 최대 데이터 행 수
  maxTotalRowsPerProject: number; // 프로젝트당 총 데이터 행 수
  includedMonthlyDocs: number; // 월간 기본 포함 AI 파싱 건수
  overagePricePerDoc: number;  // 기본 제공량 초과 시 장당 종량제 요금 (원)
}

export const PLAN_LIMITS: Record<string, PlanPolicy> = {
  free: {
    name: '기본 회원',
    badge: 'Free',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    maxSheetsPerProject: 5,
    maxRowsPerSheet: 500,
    maxTotalRowsPerProject: 2500,
    includedMonthlyDocs: 30,
    overagePricePerDoc: 0,
  },
  pro: {
    name: '프로 회원',
    badge: 'PRO',
    monthlyPrice: 9900,
    annualMonthlyPrice: 7900,
    maxSheetsPerProject: 30,
    maxRowsPerSheet: 10000,
    maxTotalRowsPerProject: 100000,
    includedMonthlyDocs: 300,
    overagePricePerDoc: 20,
  },
};

export function getPlanLimits(plan?: string): PlanPolicy {
  return PLAN_LIMITS[plan === 'pro' ? 'pro' : 'free'];
}

/**
 * 신규 시트 추가 가능 여부 검사
 */
export function checkSheetLimit(plan: string | undefined, currentCount: number) {
  const policy = getPlanLimits(plan);
  const allowed = currentCount < policy.maxSheetsPerProject;
  return {
    allowed,
    max: policy.maxSheetsPerProject,
    current: currentCount,
    policy,
    message: allowed
      ? ''
      : `[${policy.name}] 정책상 프로젝트당 최대 ${policy.maxSheetsPerProject}개 시트까지만 생성 가능합니다. (PRO 플랜은 최대 30개 지원)`,
  };
}

/**
 * 시트당 데이터 행 수 한도 초과 시 안전하게 상위 N건으로 자르고 알림 정보 반환
 */
export function truncateRowsToLimit(plan: string | undefined, currentRowsCount: number, incomingRows: any[]) {
  const policy = getPlanLimits(plan);
  const remainingSpace = Math.max(0, policy.maxRowsPerSheet - currentRowsCount);
  
  if (incomingRows.length <= remainingSpace) {
    return { rows: incomingRows, truncated: false, maxRows: policy.maxRowsPerSheet };
  }

  return {
    rows: incomingRows.slice(0, remainingSpace),
    truncated: true,
    maxRows: policy.maxRowsPerSheet,
    totalIncoming: incomingRows.length,
    loadedCount: remainingSpace,
  };
}
