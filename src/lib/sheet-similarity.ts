import { ParsedSheet } from '@/lib/parser';

// 유사도 계산 시 제외할 기본 공통 메타 컬럼
const META_COLUMNS = ['#', '일련번호', '순번', 'no', '등록일시', '비고'];

// 의미적으로 유사한 컬럼 동의어 그룹
const SYNONYM_GROUPS: string[][] = [
  ['거래일시', '승인일시', '거래일자', '승인일자', '일자', '일시', 'date'],
  ['공급가액', '공급가', '금액', '승인금액', '이용금액', '결제금액', '출금', '출금액', 'amount', 'price'],
  ['세액', '부가가치세', '부가세', 'vat', 'tax'],
  ['품목', '품명', '거래내용', '이용가맹점명', '가맹점명', '적요', '내용', 'item'],
  ['수량', 'qty', 'quantity', 'ea'],
  ['단가', '단위가격', 'unit_price'],
  ['합계금액', '합계', '총액', '총합계', 'total'],
  ['상대계좌번호', '계좌번호', '카드번호', 'account', 'card'],
  ['상대은행', '은행명', '금융기관', 'bank'],
  ['상호', '회사명', '공급자', '공급받는자', '거래처', 'vendor', 'client'],
];

/**
 * 두 컬럼 헤더가 동일하거나 동의어 관계인지 판별
 */
function isHeaderSimilar(h1: string, h2: string): boolean {
  const clean1 = h1.toLowerCase().replace(/[\s_\-]/g, '');
  const clean2 = h2.toLowerCase().replace(/[\s_\-]/g, '');

  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

  for (const group of SYNONYM_GROUPS) {
    const has1 = group.some((syn) => clean1.includes(syn) || syn.includes(clean1));
    const has2 = group.some((syn) => clean2.includes(syn) || syn.includes(clean2));
    if (has1 && has2) return true;
  }

  return false;
}

export interface SheetMatchResult {
  sheetIndex: number;
  sheetName: string;
  matchRatio: number; // 0 ~ 100
  matchedColumns: string[];
  totalSheetCols: number;
}

export interface RoutingRecommendation {
  bestMatch: SheetMatchResult | null;
  hasGoodMatch: boolean; // 일치율 40% 이상인 시트 존재 여부
  recommendedMode: 'append_rows' | 'new_sheet';
  recommendedSheetIndex: number;
  recommendedSheetName: string;
  suggestedNewSheetName: string;
  allMatches: SheetMatchResult[];
  reason: string;
}

/**
 * 업로드된 파일의 컬럼들과 기존 시트들 간의 유사도를 분석하여 최적의 라우팅 추천
 */
export function computeSheetRecommendation(
  incomingHeaders: string[],
  existingSheets: ParsedSheet[],
  incomingFileName?: string,
  incomingCategory?: string
): RoutingRecommendation {
  // 메타 컬럼 제외한 순수 유효 컬럼
  const cleanIncoming = incomingHeaders.filter(
    (h) => !META_COLUMNS.includes(h.toLowerCase().trim()) && !h.startsWith('_')
  );

  const allMatches: SheetMatchResult[] = [];

  for (let idx = 0; idx < existingSheets.length; idx++) {
    const sheet = existingSheets[idx];
    const cleanSheetHeaders = (sheet.headers || []).filter(
      (h) => !META_COLUMNS.includes(h.toLowerCase().trim()) && !h.startsWith('_')
    );

    if (cleanSheetHeaders.length === 0 || cleanIncoming.length === 0) {
      allMatches.push({
        sheetIndex: idx,
        sheetName: sheet.name,
        matchRatio: 0,
        matchedColumns: [],
        totalSheetCols: cleanSheetHeaders.length,
      });
      continue;
    }

    const matchedCols: string[] = [];

    for (const inCol of cleanIncoming) {
      const isMatched = cleanSheetHeaders.some((shCol) => isHeaderSimilar(inCol, shCol));
      if (isMatched) {
        matchedCols.push(inCol);
      }
    }

    // Jaccard 유사도 기반 일치율 계산 (0 ~ 100%)
    const unionSize = new Set([...cleanIncoming, ...cleanSheetHeaders]).size;
    const ratio = Math.round((matchedCols.length / Math.max(cleanIncoming.length, 1)) * 100);

    allMatches.push({
      sheetIndex: idx,
      sheetName: sheet.name,
      matchRatio: ratio,
      matchedColumns: matchedCols,
      totalSheetCols: cleanSheetHeaders.length,
    });
  }

  // 매칭률 내림차순 정렬
  allMatches.sort((a, b) => b.matchRatio - a.matchRatio);

  const bestMatch = allMatches[0] || null;
  // 일치율 40% 이상이고 매칭된 컬럼이 2개 이상일 때 적합한 시트로 판정
  const hasGoodMatch = Boolean(
    bestMatch && bestMatch.matchRatio >= 40 && bestMatch.matchedColumns.length >= 2
  );

  // 새 시트명 후보 생성
  let suggestedNewSheetName = incomingCategory || '새 시트';
  if (incomingFileName) {
    const baseName = incomingFileName.replace(/\.[^/.]+$/, '').trim();
    if (baseName.length > 0) {
      suggestedNewSheetName = baseName.slice(0, 20);
    }
  }

  if (hasGoodMatch && bestMatch) {
    return {
      bestMatch,
      hasGoodMatch: true,
      recommendedMode: 'append_rows',
      recommendedSheetIndex: bestMatch.sheetIndex,
      recommendedSheetName: bestMatch.sheetName,
      suggestedNewSheetName,
      allMatches,
      reason: `업로드하신 파일은 기존 [${bestMatch.sheetName}] 시트와 컬럼이 ${bestMatch.matchRatio}% 일치합니다.`,
    };
  }

  return {
    bestMatch,
    hasGoodMatch: false,
    recommendedMode: 'new_sheet',
    recommendedSheetIndex: -1,
    recommendedSheetName: '',
    suggestedNewSheetName,
    allMatches,
    reason: `업로드하신 파일은 기존 시트들과 양식이 다른 새로운 문서입니다. 데이터 유실을 막기 위해 새 시트로 생성하는 것을 추천합니다.`,
  };
}


import * as XLSX from 'xlsx';

/**
 * 엑셀/CSV 파일에서 0.05초 만에 상단 헤더 목록만 고속 추출하는 헬퍼
 */
export async function quickExtractSpreadsheetHeaders(file: File): Promise<string[]> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) return [];

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', sheetRows: 10 });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) return [];
    const ws = wb.Sheets[firstSheetName];
    if (!ws) return [];

    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (Array.isArray(row) && row.filter((c) => c !== null && c !== '').length >= 2) {
        return row.map((c, idx) => {
          const str = String(c ?? '').trim();
          if (!str) return idx === 0 ? 'No' : `열_${idx + 1}`;
          return str;
        });
      }
    }
  } catch (err) {
    console.warn('[quickExtractSpreadsheetHeaders] 실패:', err);
  }
  return [];
}
