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
  maxFileSizeMB: number;       // 단일 파일 최대 허용 용량 (MB)
  dailyUploadLimit: number;    // 일일 최대 업로드 횟수
  rateLimitPerMinute: number;  // 분당 최대 업로드 횟수 (스팸/매크로 방어)
  storageRetentionDays: number; // 원본 증빙 파일 보관 기간 (일, Infinity = 영구)
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
    maxFileSizeMB: 10,
    dailyUploadLimit: 30,
    rateLimitPerMinute: 15,
    storageRetentionDays: 30, // 30일 보관
  },
  pro: {
    name: '프로 회원',
    badge: 'PRO',
    monthlyPrice: 9900,
    annualMonthlyPrice: 7900,
    maxSheetsPerProject: 30,
    maxRowsPerSheet: Infinity, // 무제한 (SQLite 고속 엔진 탑재)
    maxTotalRowsPerProject: Infinity, // 무제한
    includedMonthlyDocs: 500, // 월 500장 기본 파싱 제공 (대폭 확대)
    overagePricePerDoc: 20,
    maxFileSizeMB: 50,
    dailyUploadLimit: Infinity,
    rateLimitPerMinute: 20,
    storageRetentionDays: Infinity, // 원본 영구 보관 무료
  },
};


export function getPlanLimits(plan?: string): PlanPolicy {
  const normalized = (plan || '').toLowerCase();
  return PLAN_LIMITS[normalized === 'pro' || normalized === 'enterprise' ? 'pro' : 'free'];
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
  if (!isFinite(policy.maxRowsPerSheet)) {
    return { rows: incomingRows, truncated: false, maxRows: policy.maxRowsPerSheet };
  }
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

/**
 * 파일 업로드 시 시스템 보호용 3대 안전장치(용량, 레이트 리밋, 일일 한도) 검증
 */
export function validateUploadFile(
  plan: string | undefined,
  file: File,
  recentUploadsCountInMinute = 0,
  todayUploadsCount = 0
) {
  const policy = getPlanLimits(plan);
  const fileSizeMB = file.size / (1024 * 1024);

  // 1. 단일 파일 용량 제한
  if (fileSizeMB > policy.maxFileSizeMB) {
    return {
      allowed: false,
      reason: 'file_size',
      message: `[${policy.name}] 정책상 파일은 최대 ${policy.maxFileSizeMB}MB까지만 업로드 가능합니다. (현재: ${fileSizeMB.toFixed(1)}MB)${plan !== 'pro' ? '\nPRO 플랜으로 전환 시 최대 50MB까지 지원됩니다.' : ''}`,
    };
  }

  // 2. 분당 요청 속도 제한 (매크로/스크립트 어뷰징 방지)
  if (recentUploadsCountInMinute >= policy.rateLimitPerMinute) {
    return {
      allowed: false,
      reason: 'rate_limit',
      message: `단시간 내 너무 많은 업로드 요청이 감지되었습니다. 1분 후 다시 시도해 주세요. (분당 최대 ${policy.rateLimitPerMinute}회)`,
    };
  }

  // 3. 일일 업로드 횟수 제한 (Free 회원 어뷰징 방지)
  if (isFinite(policy.dailyUploadLimit) && todayUploadsCount >= policy.dailyUploadLimit) {
    return {
      allowed: false,
      reason: 'daily_limit',
      message: `[${policy.name}] 오늘 허용된 일일 업로드 횟수(${policy.dailyUploadLimit}회)에 도달하였습니다. PRO 플랜으로 무제한 업로드해 보세요!`,
    };
  }

  return { allowed: true, policy };
}
