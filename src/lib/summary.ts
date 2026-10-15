import { ParsedSheet } from '@/lib/parser';
import { SheetSummaryData, ColumnStat } from '@/types/workspace';

/**
 * 시트 내 숫자 컬럼의 통계(합계, 평균, 최대, 최소, 건수)를 자동 계산
 */
export function calculateSheetSummary(sheet: ParsedSheet | null): SheetSummaryData | null {
  if (!sheet || !sheet.rows || sheet.rows.length === 0) return null;

  const numericStats: Record<string, ColumnStat> = {};

  sheet.headers.forEach((header) => {
    if (header === '일련번호') return; // 일련번호는 통계에서 제외

    let sum = 0;
    let count = 0;
    let max = -Infinity;
    let min = Infinity;

    sheet.rows.forEach((row) => {
      const val = row[header];
      if (typeof val === 'number') {
        sum += val;
        count++;
        max = Math.max(max, val);
        min = Math.min(min, val);
      } else if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').trim();
        if (cleaned && !isNaN(Number(cleaned)) && cleaned !== '') {
          const num = Number(cleaned);
          sum += num;
          count++;
          max = Math.max(max, num);
          min = Math.min(min, num);
        }
      }
    });

    if (count > 0) {
      numericStats[header] = {
        sum,
        avg: Math.round(sum / count),
        count,
        max,
        min,
      };
    }
  });

  return {
    totalRows: sheet.rows.length,
    totalCols: sheet.headers.length,
    numericStats,
  };
}
