/**
 * 📞 전화번호, 휴대폰번호, 팩스번호, 대표번호 표준화(Normalization) 엔진
 * - 대한민국 표준 하이픈(-) 포맷 자동 변환 (010-XXXX-XXXX, 02-XXX-XXXX, 1588-XXXX)
 * - 점(.), 공백, 괄호 등 제각각인 원본 기호 통일
 * - +82 국가번호 국내 표준으로 자동 전환 (+82 10-1234-5678 -> 010-1234-5678)
 * - 해외 번호(+1, +86 등)는 국제 표준 보존
 * - 사업자등록번호, 계좌번호, 날짜 등은 절대 오인식하지 않도록 안전 가드 탑재
 */

// 전화번호 관련 컬럼명 식별 키워드
const PHONE_COLUMN_KEYWORDS = [
  '전화', '연락처', '휴대폰', '핸드폰', '모바일', '팩스',
  'tel', 'fax', 'phone', 'mobile', 'contact', 'hp', 'h.p'
];

// 전화번호로 오인하면 안 되는 제외 키워드
const EXCLUDE_COLUMN_KEYWORDS = [
  '사업자', '주민', '법인', '계좌', '금액', '수량', '단가',
  '일자', '일시', '날짜', '시간', '코드', '우편', '주소', '품번', '모델'
];

/**
 * 1. 대상 컬럼이 전화번호/연락처 관련 컬럼인지 판별
 */
export function isPhoneColumn(header: string): boolean {
  if (!header) return false;
  const lower = header.toLowerCase().replace(/[\s_\-]/g, '');

  // 제외 키워드가 포함되어 있으면 전화번호 컬럼이 아님
  if (EXCLUDE_COLUMN_KEYWORDS.some((kw) => lower.includes(kw))) {
    return false;
  }

  // 전화번호 키워드가 포함되어 있으면 참
  return PHONE_COLUMN_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 2. 값이 전화번호 형태인지 정밀 판별
 */
export function looksLikePhoneNumber(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  if (str.length < 7 || str.length > 25) return false;

  // 날짜 형식(YYYY-MM-DD, YYYY.MM.DD 등) 제외
  if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(str)) return false;

  // 시간 형식 제외
  if (/^\d{1,2}:\d{2}(:\d{2})?/.test(str)) return false;

  // 사업자등록번호(10자리, 3-2-5 형태) 제외
  if (/^\d{3}-\d{2}-\d{5}$/.test(str)) return false;

  // 한국 주요 국번 패턴 확인 (010, 02, 031, 070, 1588, +82 등)
  const clean = str.replace(/[\s\-().]/g, '');
  if (/^(\+?82|01[016789]|02|0[3-6][1-5]|070|050[2-7]|1[56]\d{2})\d{4,8}$/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * 3. 전화번호 표준화 메인 함수
 */
export function normalizePhoneNumber(
  val: any,
  header?: string,
  customPrompt?: string
): string {
  if (val === undefined || val === null) return '';
  const raw = String(val).trim();
  if (!raw) return '';

  // 사용자 시트 AI 프롬프트에 '원본 유지' 또는 '포맷팅 안 함' 지시가 있는 경우 오버라이드
  if (customPrompt) {
    const pLower = customPrompt.toLowerCase();
    if (
      pLower.includes('전화번호 원본') ||
      pLower.includes('연락처 원본') ||
      pLower.includes('하이픈 넣지') ||
      pLower.includes('기호 유지')
    ) {
      return raw;
    }
  }

  // 컬럼 헤더가 명시적으로 전화번호 컬럼이 아니고 값도 전화번호 형태가 아니라면 변경하지 않음
  const isTargetCol = header ? isPhoneColumn(header) : false;
  if (!isTargetCol && !looksLikePhoneNumber(raw)) {
    return raw;
  }

  // 날짜/사업자등록번호 보호 가드
  if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(raw)) return raw;
  if (/^\d{3}-\d{2}-\d{5}$/.test(raw)) return raw;

  let cleaned = raw;

  // 1단계: +82 또는 82 국가번호 국내 표준(010, 02 등)으로 정규화
  // 예: '+82 10-1234-5678' -> '010-1234-5678'
  //     '+82-2-123-4567' -> '02-123-4567'
  //     '82-10-1234-5678' -> '010-1234-5678'
  if (/^(\+?82)[.\s\-]/.test(cleaned) || /^82[1-9]/.test(cleaned.replace(/\D/g, ''))) {
    // 순수 숫자 추출
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.startsWith('82')) {
      const rest = digitsOnly.slice(2);
      // rest가 10으로 시작하면 010, 2로 시작하면 02, 31로 시작하면 031
      cleaned = '0' + rest;
    }
  } else if (cleaned.startsWith('+') && !cleaned.startsWith('+82')) {
    // 2단계: 순수 해외 국가번호인 경우 (+1, +86 등) 국제 표준 규격 유지
    // 예: '+1 212 555 0199' -> '+1-212-555-0199'
    return cleaned.replace(/[.\s]+/g, '-').replace(/-+/g, '-');
  }

  // 3단계: 국내 번호 숫자만 추출 후 대한민국 표준 분절
  const digits = cleaned.replace(/\D/g, '');

  // A. 전국 대표번호 (1588, 1544, 1577, 1566, 1600, 1670, 1688, 1661 등 8자리)
  if (digits.length === 8 && /^(15|16|18)\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // B. 서울 지역번호 02 (9자리 또는 10자리)
  if (digits.startsWith('02')) {
    if (digits.length === 9) {
      // 02-123-4567
      return `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    if (digits.length === 10) {
      // 02-1234-5678
      return `02-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
  }

  // C. 3자리 국번 (010, 011, 016, 017, 018, 019, 070, 031, 032, 033, 041, 042, 043, 044, 051, 052, 053, 054, 055, 061, 062, 063, 064 등)
  if (/^0[1-9]\d/.test(digits)) {
    // 10자리: 031-123-4567, 011-123-4567
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // 11자리: 010-1234-5678, 031-1234-5678, 070-1234-5678
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
  }

  // D. 안심번호 050x (11~12자리)
  if (digits.startsWith('050')) {
    if (digits.length === 11) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 12) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
  }

  // 변환 기준에 정확히 들어맞지 않는 특수 번호는 원본 유지
  return raw;
}

/**
 * 4. 시트 전체 행 데이터 내의 전화번호 컬럼 일괄 정규화 헬퍼
 */
export function normalizePhoneNumbersInRows(
  rows: Array<Record<string, any>>,
  headers: string[],
  customPrompt?: string
): Array<Record<string, any>> {
  if (!rows || rows.length === 0) return rows;

  // 헤더 중 전화번호 컬럼 인덱싱
  const phoneCols = headers.filter((h) => isPhoneColumn(h));

  return rows.map((row) => {
    let hasChange = false;
    const newRow = { ...row };

    // 1) 전화번호 명시 컬럼 변환
    for (const col of phoneCols) {
      if (newRow[col] !== undefined && newRow[col] !== null) {
        const normalized = normalizePhoneNumber(newRow[col], col, customPrompt);
        if (normalized !== newRow[col]) {
          newRow[col] = normalized;
          hasChange = true;
        }
      }
    }

    // 2) 일반 컬럼이지만 값이 명백히 전화번호인 경우 변환 (단, 날짜/계좌/사업자번호 컬럼 제외)
    for (const [key, val] of Object.entries(newRow)) {
      if (!key.startsWith('_') && !phoneCols.includes(key) && !EXCLUDE_COLUMN_KEYWORDS.some((kw) => key.toLowerCase().includes(kw))) {
        if (typeof val === 'string' && looksLikePhoneNumber(val)) {
          const normalized = normalizePhoneNumber(val, key, customPrompt);
          if (normalized !== val) {
            newRow[key] = normalized;
            hasChange = true;
          }
        }
      }
    }

    return hasChange ? newRow : row;
  });
}
