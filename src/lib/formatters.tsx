import React from 'react';

/**
 * 🌟 고유 식별자(계좌번호, 카드번호, 사업자번호, 고유코드 등) 컬럼 키워드 목록
 * - 이 컬럼들은 숫자로만 구성되어 있더라도 절대 회계 콤마(,)를 붙이지 않고 원본 문자열을 100% 무결하게 보존함
 */
const IDENTIFIER_KEYWORDS = [
  '계좌', '카드', '사업자', '주민', '법인', '승인번호', '코드', '우편', '전화', '연락처',
  '휴대폰', '핸드폰', '모바일', '팩스', '품번', '모델', '시리얼', '바코드', '아이디',
  'account', 'card', 'id', 'uuid', 'code', 'serial', 'barcode', 'tel', 'fax', 'phone', 'no', '순번', '일련번호'
];

/**
 * 🌟 숫자(금액/수량) 컬럼 여부 정밀 판별기
 */
export function isNumericColumn(header: string, val?: any): boolean {
  if (!header) return false;
  const lowerHeader = header.toLowerCase().replace(/[\s_\-]/g, '');

  // 1. 식별자 키워드가 컬럼명에 포함되어 있으면 숫자로 취급하지 않음 (식별자 우선 보호)
  if (IDENTIFIER_KEYWORDS.some((k) => lowerHeader.includes(k))) {
    return false;
  }

  // 2. 명시적 회계/수량 키워드 컬럼
  const numericKeywords = [
    '수량', '단가', '금액', '공급가액', '부가가치세', '부가세',
    '합계금액', '세액', '합계', '잔액', '입금', '출금', '수수료', '단위', '단가',
    'price', 'amount', 'qty', 'quantity', 'total', 'vat', 'tax', 'balance'
  ];
  if (numericKeywords.some((k) => lowerHeader.includes(k))) return true;

  // 3. 값 기반 검사 (날짜, 전화, 계좌, 대형 정수 식별자 배제)
  if (val !== undefined && val !== null) {
    if (typeof val === 'number') {
      return true;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return false;

      // 하이픈, 슬래시, 콜론 등 날짜/전화/시간/사업자번호 기호 포함 시 제외
      if (trimmed.includes('-') || trimmed.includes('/') || trimmed.includes(':')) return false;

      // '00'으로 시작하거나 '0'으로 시작하는 2자리 이상 정수는 식별자(코드)이므로 제외 (예: '010', '00123')
      if (trimmed.startsWith('00') || (trimmed.startsWith('0') && trimmed.length > 1 && !trimmed.startsWith('0.'))) {
        return false;
      }

      const cleanNumStr = trimmed.replace(/,/g, '');

      // 🌟 12자리를 초과하는 연속 숫자는 계좌번호, 카드번호, 바코드 등 고유 식별자이므로 제외!
      // (JavaScript 부동소수점 오차 방어 및 계좌번호 보존)
      if (cleanNumStr.length > 12) {
        return false;
      }

      if (!isNaN(Number(cleanNumStr))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 🌟 회계/금융 표준 숫자 렌더러
 * - 천 단위 콤마(,) 자동 적용
 * - 소수점이 있는 경우, 소수점 이하(.xx) 크기를 작게(text-[10.5px] opacity-80) 차별화하여 가독성 극대화
 * - 🌟 자바스크립트 64비트 부동소수점 한계(MAX_SAFE_INTEGER)로 인한 끝자리 왜곡을 막기 위해 문자열 정규식 기반 포맷팅 적용!
 */
export function renderFormattedNumber(val: any): React.ReactNode {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  const rawStr = String(val).replace(/,/g, '').trim();

  // 숫자가 아니면 원본 반환
  if (isNaN(Number(rawStr))) return String(val);

  // 12자리를 초과하거나 '0'으로 시작하는 다자리 숫자는 식별자(계좌/카드번호)이므로 콤마 없이 원본 문자열 반환
  if (rawStr.length > 12 || (rawStr.startsWith('0') && rawStr.length > 1 && !rawStr.startsWith('0.'))) {
    return String(val);
  }

  // 🌟 정밀도 손실(Floating-point precision loss)을 원천 차단하기 위해
  // Number()로 재변환하지 않고 문자열 정규식으로 천 단위 콤마 삽입
  const parts = rawStr.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (parts.length > 1) {
    const decimalPart = parts[1];
    return (
      <span className="font-mono tracking-tight font-medium inline-flex items-baseline justify-end w-full">
        <span>{integerPart}</span>
        <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold ml-0.5 opacity-85">
          .{decimalPart}
        </span>
      </span>
    );
  }

  return <span className="font-mono tracking-tight font-medium">{integerPart}</span>;
}

/**
 * 🌟 문자열의 픽셀 폭을 12px(text-xs) 폰트 기준 문자별 실제 너비로 정밀 계산
 */
function estimateTextPixelWidth(text: string): number {
  if (!text) return 0;
  let px = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    // 한글 (가-힣, 자음, 모음 등) 및 한자/CJK
    if (code > 127) {
      px += 12.0; // 한글 1글자 = 약 12px
    } else if (code >= 65 && code <= 90) {
      px += 7.8; // 영문 대문자
    } else if (code >= 48 && code <= 57) {
      px += 7.2; // 숫자
    } else if (ch === ' ' || ch === '.' || ch === ':' || ch === ',') {
      px += 3.8; // 얇은 구두점 및 공백
    } else if (ch === '-' || ch === '/' || ch === '(' || ch === ')') {
      px += 5.2; // 하이픈, 슬래시, 괄호 등
    } else {
      px += 6.2; // 일반 영문 소문자 및 기타 기호
    }
  }
  return px;
}

/**
 * 🌟 헤더 명칭과 실제 셀 데이터 길이를 동적으로 실측하여 최적의 자동 열 너비 계산
 */
export function getSmartColumnWidth(
  header: string,
  rows: Array<Record<string, any>> = []
): number {
  // 1. 헤더 글자 폭 측정 (헤더 좌우 패딩 20px + 정렬 아이콘/여백 6px = 약 26px)
  const headerTextPx = estimateTextPixelWidth(header);
  let maxPx = headerTextPx + 26;

  // 2. 실제 데이터 행들의 셀 내용 폭 측정 (최대 60개 행 표본 조사, 셀 좌우 패딩 24px + 여유 4px = 28px)
  const sampleRows = (rows || []).slice(0, 60);
  for (const r of sampleRows) {
    const val = r[header];
    if (val !== undefined && val !== null && val !== '') {
      const contentPx = estimateTextPixelWidth(String(val));
      if (contentPx + 28 > maxPx) {
        maxPx = contentPx + 28;
      }
    }
  }

  // 3. 특수 컬럼 최적 가이드 (과도한 빈 여백을 없애고 텍스트는 온전히 보이도록 컴팩트하게 밀착)
  if (['#', 'No', 'no'].includes(header)) return Math.max(48, Math.min(80, Math.round(maxPx)));
  if (['일련번호', '순번'].includes(header)) return Math.max(70, Math.min(105, Math.round(maxPx)));
  if (['등록일시'].includes(header)) return Math.max(168, Math.min(220, Math.round(maxPx)));
  if (['거래일시', '승인일시', '결제일시', '거래일자', '승인일자'].includes(header)) return Math.max(152, Math.min(210, Math.round(maxPx)));
  if (['카드번호', '상대계좌번호', '계좌번호'].includes(header)) {
    // 실제 데이터가 없거나 비어있는 경우 불필요한 빈 공간 제거
    const hasData = sampleRows.some((r) => r[header] && String(r[header]).trim().length > 3);
    const minW = hasData ? 140 : 85;
    return Math.max(minW, Math.min(210, Math.round(maxPx)));
  }
  if (['전화번호', '연락처', '휴대폰', '핸드폰', '팩스', '팩스번호'].some((k) => header.includes(k))) {
    const hasData = sampleRows.some((r) => r[header] && String(r[header]).trim().length > 3);
    const minW = hasData ? 115 : 75;
    return Math.max(minW, Math.min(170, Math.round(maxPx)));
  }
  if (['이용가맹점명', '가맹점명', '상호', '회사명', '품명', '품목명'].some((k) => header.includes(k))) {
    return Math.max(110, Math.min(280, Math.round(maxPx)));
  }
  if (['금액', '출금', '입금', '공급가액', '합계금액', '승인금액'].some((k) => header.includes(k))) {
    return Math.max(68, Math.min(160, Math.round(maxPx)));
  }
  if (header === '비고') return Math.max(120, Math.min(360, Math.round(maxPx)));

  // 일반 열: 최소 60px ~ 최대 380px
  return Math.max(60, Math.min(380, Math.round(maxPx)));
}
