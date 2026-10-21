import React from 'react';

/**
 * 🌟 숫자 컬럼 여부 판별기
 */
export function isNumericColumn(header: string, val?: any): boolean {
  const numericKeywords = [
    '수량', '단가', '금액', '공급가액', '부가가치세', '부가세',
    '합계금액', '세액', '합계', '잔액', '입금', '출금', '수수료', '단위', '단가'
  ];
  if (numericKeywords.some((k) => header.includes(k))) return true;
  if (typeof val === 'number') return true;
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val.replace(/,/g, '').trim()))) {
    // 전화번호나 사업자번호, 날짜 등 하이픈(-) 포함은 제외
    if (val.includes('-') || val.includes('/') || val.includes(':')) return false;
    return true;
  }
  return false;
}

/**
 * 🌟 회계/금융 표준 숫자 렌더러
 * - 천 단위 콤마(,) 자동 적용
 * - 소수점이 있는 경우, 소수점 이하(.xx) 크기를 작게(text-[10.5px] opacity-80) 차별화하여 가독성 극대화
 */
export function renderFormattedNumber(val: any): React.ReactNode {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  const rawStr = String(val).replace(/,/g, '').trim();
  const num = Number(rawStr);
  if (isNaN(num)) return String(val);

  const parts = rawStr.split('.');
  const integerPart = Number(parts[0]).toLocaleString('ko-KR');

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
 * 🌟 화면 밀도와 가독성을 최적화한 스마트 열 너비 기본값 (불필요하게 넓은 컬럼 타이트하게 슬림화)
 */
export function getSmartColumnWidth(header: string): number {
  if (['#', '일련번호', '순번', 'No', 'no'].includes(header)) return 52;
  if (header === '수량') return 75;
  if (header === '단가') return 95;
  if (['금액', '공급가액', '부가가치세', '부가세', '합계금액', '세액', '합계'].some((k) => header.includes(k))) return 105;
  if (['거래일자', '일자'].includes(header)) return 100;
  if (['등록일시'].includes(header)) return 120;
  if (['발주번호'].includes(header)) return 130;
  if (['공급자등록번호', '사업자등록번호', '등록번호'].includes(header)) return 115;
  if (['공급자', '공급받는자', '상호', '회사명'].includes(header)) return 125;
  if (header === '품번') return 110;
  if (header === '품명') return 130;
  if (header === '규격') return 115;
  if (header === '비고') return 180;
  return 120;
}
