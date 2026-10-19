/**
 * FileToSheet FDE 협업용 민감정보 자동 마스킹 유틸리티
 */

// 전화번호 마스킹 (예: 010-1234-5678 -> 010-****-5678)
export function maskPhoneNumber(val: string): string {
  return val.replace(/(\d{2,3})[-.]?(\d{3,4})[-.]?(\d{4})/g, '$1-****-$3');
}

// 이메일 마스킹 (예: test1234@domain.com -> te****@domain.com)
export function maskEmail(val: string): string {
  return val.replace(/([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1****$2');
}

// 주민등록번호 / 외국인등록번호 마스킹 (예: 900101-1234567 -> 900101-*******)
export function maskResidentNumber(val: string): string {
  return val.replace(/(\d{6})[-.]?([1-8]\d{6})/g, '$1-*******');
}

// 사업자등록번호 마스킹 (예: 123-45-67890 -> 123-**-67890)
export function maskBusinessNumber(val: string): string {
  return val.replace(/(\d{3})[-.]?(\d{2})[-.]?(\d{5})/g, '$1-**-$3');
}

// 계좌번호 / 카드번호 마스킹 (숫자 연속 8자리 이상)
export function maskAccountOrCard(val: string): string {
  return val.replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{2,6})[- ]?(\d{1,6})\b/g, '$1-****-****-$4');
}

// 이름 마스킹 (2~4글자 한글 이름: 홍길동 -> 홍*동, 이산 -> 이*)
export function maskName(val: string): string {
  if (val.length === 2) return val[0] + '*';
  if (val.length === 3) return val[0] + '*' + val[2];
  if (val.length >= 4) return val[0] + '**' + val.slice(3);
  return val;
}

/**
 * 단일 문자열 값에 대해 종합적인 패턴을 감지하여 자동 마스킹
 */
export function autoMaskValue(key: string, val: any): any {
  if (val === null || val === undefined) return val;
  const str = String(val).trim();
  const lowerKey = key.toLowerCase();

  // 1. 헤더 컬럼명 기준 사전 차단
  if (lowerKey.includes('주민') || lowerKey.includes('ssn')) {
    return maskResidentNumber(str);
  }
  if (lowerKey.includes('전화') || lowerKey.includes('연락처') || lowerKey.includes('핸드폰') || lowerKey.includes('휴대폰') || lowerKey.includes('phone') || lowerKey.includes('tel')) {
    return maskPhoneNumber(str);
  }
  if (lowerKey.includes('이메일') || lowerKey.includes('email') || lowerKey.includes('mail')) {
    return maskEmail(str);
  }
  if (lowerKey.includes('사업자') || lowerKey.includes('사업자번호')) {
    return maskBusinessNumber(str);
  }
  if (lowerKey.includes('계좌') || lowerKey.includes('카드') || lowerKey.includes('account') || lowerKey.includes('card')) {
    return maskAccountOrCard(str);
  }
  if (lowerKey.includes('이름') || lowerKey.includes('성명') || lowerKey.includes('대표자') || lowerKey.includes('고객명')) {
    if (str.length >= 2 && str.length <= 4 && /^[가-힣]+$/.test(str)) {
      return maskName(str);
    }
  }

  // 2. 값 자체 정규식 기반 마스킹
  let masked = str;
  masked = maskResidentNumber(masked);
  masked = maskPhoneNumber(masked);
  masked = maskEmail(masked);
  masked = maskBusinessNumber(masked);
  masked = maskAccountOrCard(masked);

  return masked;
}

/**
 * 객체 행(Row) 전체를 안전하게 마스킹
 */
export function maskRowData(row: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    result[k] = autoMaskValue(k, v);
  }
  return result;
}
