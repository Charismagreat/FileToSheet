import { parseSpreadsheetBuffer, ensureDefaultColumns, ParsedSheet } from '@/lib/parser';
import { apiFetch } from '@/lib/api';

export interface ParseClientResult {
  sheets: ParsedSheet[];
  category: string;
}

export async function parseFileOnClient(
  file: File,
  onStatusChange?: (status: string) => void,
  customPrompt?: string
): Promise<ParseClientResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    onStatusChange?.('스프레드시트 2차원 표 추출 중...');
    const buffer = await file.arrayBuffer();
    const result = await parseSpreadsheetBuffer(buffer, file.name);
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
    body: JSON.stringify({ filename: file.name, fileBase64: base64Data, mimeType: file.type, customPrompt }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '문서 분석에 실패했습니다.');

  const enriched = ensureDefaultColumns(json.headers || [], json.rows || []);
  return {
    sheets: [{ name: json.sheetName || '추출데이터', headers: enriched.headers, rows: enriched.rows, rawRows: [] }],
    category: `${json.category || '비정형 문서 추출'}${json.usedModel ? ` [${json.usedModel}]` : ''}`,
  };
}
