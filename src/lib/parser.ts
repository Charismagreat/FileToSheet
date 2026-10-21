import * as XLSX from 'xlsx';
import type { OriginalDocFile } from '@/types/workspace';

export interface SheetRelation {
  foreignKey: string;        // 현재 시트의 외래키 열 이름 (예: "사업자등록번호")
  targetSheetName: string;   // 참조 대상 시트명 (예: "거래처마스터")
  targetKey: string;         // 참조 대상 시트의 조인 기준 열 이름 (예: "사업자등록번호")
  displayColumns?: string[]; // 조인 시 함께 가져와 표시할 대상 시트의 열 목록 (예: ["대표자", "연락처", "여신한도"])
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Array<Record<string, any>>;
  rawRows: any[][];
  originalFiles?: OriginalDocFile[];
  customPrompt?: string; // 🌟 시트별 전용 자연어 분석/적재 규칙
  relations?: SheetRelation[]; // 🔗 다른 시트와의 외래키(FK) 조인 매핑 정보
}

export interface ParseResult {
  filename: string;
  category: string;
  sheets: ParsedSheet[];
  totalRows: number;
}

/**
 * 시트 헤더/내용 기반 자동 카테고리 감지
 */
export function detectCategory(headers: string[], firstRows: any[]): string {
  const combinedText = [
    ...headers,
    ...firstRows.flatMap((r) => Object.values(r || {})),
  ]
    .join(' ')
    .toLowerCase();

  if (
    combinedText.includes('통장') ||
    combinedText.includes('거래일시') ||
    combinedText.includes('출금액') ||
    combinedText.includes('입금액') ||
    combinedText.includes('거래후잔액') ||
    combinedText.includes('기재내용')
  ) {
    return '통장 거래내역';
  }

  if (
    combinedText.includes('승인일자') ||
    combinedText.includes('승인번호') ||
    combinedText.includes('가맹점명') ||
    combinedText.includes('카드번호') ||
    combinedText.includes('이용금액')
  ) {
    return '카드 이용내역';
  }

  if (
    combinedText.includes('거래명세서') ||
    combinedText.includes('공급가액') ||
    combinedText.includes('세액') ||
    combinedText.includes('단가') ||
    combinedText.includes('수량') ||
    combinedText.includes('품목')
  ) {
    return '거래명세서 / 계산서';
  }

  return '일반 표 데이터';
}

/**
 * 🌟 '비고' 컬럼을 항상 맨 마지막 열로 정렬하는 헬퍼 함수
 */
export function ensureRemarkAtEnd(headers: string[]): string[] {
  if (!headers || headers.length === 0) return headers;
  const withoutRemark = headers.filter((h) => h !== '비고');
  return [...withoutRemark, '비고'];
}

export function ensureDefaultColumns(
  headers: string[],
  rows: Array<Record<string, any>>
): { headers: string[]; rows: Array<Record<string, any>> } {
  const kstTime = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  const hasSeq = headers.includes('일련번호');
  const hasRegDate = headers.includes('등록일시');

  const prefixHeaders: string[] = [];
  if (!hasSeq) prefixHeaders.push('일련번호');
  if (!hasRegDate) prefixHeaders.push('등록일시');

  // '비고'를 제외한 순수 본문 컬럼들
  const middleHeaders = headers.filter((h) => !prefixHeaders.includes(h) && h !== '비고');

  // 🌟 '비고' 컬럼은 무조건 맨 마지막 열에 배치!
  const finalHeaders = [...prefixHeaders, ...middleHeaders, '비고'];

  const finalRows = rows.map((row, idx) => {
    const newRow: Record<string, any> = {};
    if (!hasSeq) newRow['일련번호'] = idx + 1;
    if (!hasRegDate) newRow['등록일시'] = kstTime;
    const merged = { ...newRow, ...row };
    if (merged['비고'] === undefined) merged['비고'] = '';
    return merged;
  });

  return { headers: finalHeaders, rows: finalRows };
}

/**
 * ArrayBuffer로부터 엑셀/CSV 파싱
 */
export async function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: ParsedSheet[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // 빈 시트 건너뛰기
    if (!worksheet || !worksheet['!ref']) continue;

    // 2차원 배열로 먼저 변환
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawData.length === 0) continue;

    // 가장 적합한 헤더 행 찾기 (비어있지 않은 첫 행)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (row.filter((cell) => cell !== null && cell !== '').length >= 2) {
        headerRowIndex = i;
        break;
      }
    }

    const rawHeaders = rawData[headerRowIndex] || [];
    const headers: string[] = rawHeaders.map((h: any, idx: number) => {
      const str = String(h ?? '').trim();
      return str || `열_${idx + 1}`;
    });

    const dataRows = rawData.slice(headerRowIndex + 1);
    const rows: Array<Record<string, any>> = [];

    for (const row of dataRows) {
      // 행 전체가 비어있는지 확인
      const hasContent = row.some((c) => c !== null && c !== '');
      if (!hasContent) continue;

      const rowObj: Record<string, any> = {};
      headers.forEach((header, idx) => {
        rowObj[header] = row[idx] ?? '';
      });
      rows.push(rowObj);
    }

    // 기본 제공 열 ('일련번호', '등록일시') 자동 포함
    const enriched = ensureDefaultColumns(headers, rows);

    sheets.push({
      name: sheetName,
      headers: enriched.headers,
      rows: enriched.rows,
      rawRows: rawData,
    });

    totalRows += rows.length;
  }

  // 대표 카테고리 감지
  const sampleHeaders = sheets[0]?.headers || [];
  const sampleRows = sheets[0]?.rows.slice(0, 5) || [];
  const category = detectCategory(sampleHeaders, sampleRows);

  return {
    filename,
    category,
    sheets,
    totalRows,
  };
}

/**
 * 시트 데이터를 .xlsx 파일로 생성 후 브라우저 다운로드
 */
export function downloadWorkbook(
  sheets: Array<{ name: string; rows: Array<Record<string, any>> }>,
  defaultFilename: string = 'FileToSheet_Export.xlsx'
) {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)); // 엑셀 시트명 최대 31자 제한
  }

  XLSX.writeFile(wb, defaultFilename);
}
