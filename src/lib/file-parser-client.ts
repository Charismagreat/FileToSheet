import { parseSpreadsheetBuffer, ensureDefaultColumns, ParsedSheet } from '@/lib/parser';
import { apiFetch } from '@/lib/api';

export interface ParseClientResult {
  sheets: ParsedSheet[];
  category: string;
}

export async function parseFileOnClient(
  file: File,
  onStatusChange?: (status: string) => void,
  customPrompt?: string,
  targetHeaders?: string[],
  sampleRows?: Record<string, any>[]
): Promise<ParseClientResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const hasTargetHeaders = Array.isArray(targetHeaders) && targetHeaders.length > 0;

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    onStatusChange?.('스프레드시트 2차원 표 추출 중...');
    const buffer = await file.arrayBuffer();
    const result = await parseSpreadsheetBuffer(buffer, file.name);

    // 기존 시트에 적재 시: 기존 컬럼 스키마 엄격 유지 및 행 데이터 매핑
    if (hasTargetHeaders) {
      result.sheets = result.sheets.map((sh) => {
        const mappedRows = sh.rows.map((r) => {
          const rowObj: Record<string, any> = {};
          for (const h of targetHeaders) {
            rowObj[h] = r[h] !== undefined && r[h] !== null ? r[h] : '';
          }
          // 기존 컬럼 외의 추가 정보는 비고에 보존
          const extraInfo = Object.entries(r)
            .filter(([k]) => !targetHeaders.includes(k) && !k.startsWith('_'))
            .map(([k, v]) => `[${k}] ${v}`)
            .join(' | ');
          if (extraInfo && targetHeaders.includes('비고')) {
            rowObj['비고'] = rowObj['비고'] ? `${rowObj['비고']} | ${extraInfo}` : extraInfo;
          }
          return rowObj;
        });
        return { ...sh, headers: targetHeaders, rows: mappedRows };
      });
      return result;
    }

    // 자연어 규칙으로 필수 컬럼이 지정된 경우 해당 컬럼 보장
    if (customPrompt?.trim()) {
      const promptMatches = customPrompt.match(/['"]([^'"]+)['"]|([가-힣a-zA-Z0-9_]+)(?=\s*컬럼|\s*열)/g);
      if (promptMatches) {
        const extraCols = promptMatches.map((s) => s.replace(/['"]/g, '').trim()).filter((s) => s && !s.includes(' ') && s.length < 15);
        result.sheets.forEach((sh) => {
          extraCols.forEach((col) => {
            if (!sh.headers.includes(col)) {
              sh.headers.push(col);
              sh.rows.forEach((r) => { if (r[col] === undefined) r[col] = ''; });
            }
          });
        });
      }
    }
    return result;
  }

  onStatusChange?.('이지데스크 AI 최신 모델이 표 구조를 분석 중입니다...');
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await apiFetch('/api/parse-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      fileBase64: base64Data,
      mimeType: file.type,
      customPrompt,
      targetHeaders: hasTargetHeaders ? targetHeaders : undefined,
      sampleRows: Array.isArray(sampleRows) && sampleRows.length > 0 ? sampleRows : undefined,
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '문서 분석에 실패했습니다.');

  const headers = hasTargetHeaders ? targetHeaders : (json.headers || []);
  const enriched = ensureDefaultColumns(headers, json.rows || []);
  const finalHeaders = hasTargetHeaders ? targetHeaders : enriched.headers;

  return {
    sheets: [{ name: json.sheetName || '추출데이터', headers: finalHeaders, rows: enriched.rows, rawRows: [] }],
    category: `${json.category || '비정형 문서 추출'}${json.usedModel ? ` [${json.usedModel}]` : ''}`,
  };
}
