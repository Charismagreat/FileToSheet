import {
  insertRows,
  queryTable,
  updateRows,
  uploadFileChunked,
  deleteRows,
} from '@/egdesk-helpers';

export interface UploadedFileRecord {
  id?: number;
  filename: string;
  file_type: string;
  file_size: number;
  file_data?: string | null;
  status: 'uploaded' | 'parsing' | 'completed' | 'failed';
  category?: string;
  sheet_names?: string;
  row_count?: number;
  error_message?: string;
  created_at: string;
}

export interface SheetRowRecord {
  id?: number;
  file_id: number;
  sheet_name: string;
  row_index: number;
  row_data: string; // JSON 문자열
  category?: string;
  created_at: string;
}

/**
 * 1. 이지데스크 DB에 새 파일 업로드 기록 생성
 */
export async function createUploadedFileRecord(
  file: File,
  category: string = 'general',
  fileData?: string
): Promise<number | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const now = new Date().toISOString();

  const result = await insertRows('uploaded_files', [
    {
      filename: file.name,
      file_type: ext,
      file_size: file.size,
      status: 'uploaded',
      category,
      created_at: now,
      ...(fileData ? { file_data: fileData } : {}),
    },
  ]);

  return result?.ids?.[0] ?? null;
}

/**
 * 2. 이지데스크 파일 스토리지로 원본 파일 업로드 (청크 방식)
 */
export async function uploadToEgdeskStorage(
  fileId: number,
  file: File,
  onProgress?: (progress: { sentBytes: number; totalBytes: number }) => void
) {
  return uploadFileChunked('uploaded_files', fileId, 'file_data', file, {
    maxChunkSize: 1024 * 1024,
    onProgress,
  });
}

/**
 * 3. 파싱 완료 후 파일 레코드 업데이트
 */
export async function updateFileParseResult(
  fileId: number,
  sheetNames: string[],
  rowCount: number,
  category?: string
) {
  return updateRows(
    'uploaded_files',
    {
      status: 'completed',
      sheet_names: JSON.stringify(sheetNames),
      row_count: rowCount,
      ...(category ? { category } : {}),
    },
    { id: String(fileId) }
  );
}

/**
 * 4. 시트별 행 데이터를 sheet_rows 테이블에 배치 적재
 */
export async function saveParsedSheetRows(
  fileId: number,
  sheetName: string,
  rows: Record<string, any>[],
  category?: string
) {
  if (!rows || rows.length === 0) return;
  const now = new Date().toISOString();
  const chunkSize = 200;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const records = chunk.map((row, idx) => ({
      file_id: fileId,
      sheet_name: sheetName,
      row_index: i + idx,
      row_data: JSON.stringify(row),
      category: category || 'general',
      created_at: now,
    }));

    await insertRows('sheet_rows', records);
  }
}

/**
 * 5. 최근 업로드된 파일 목록 조회
 */
export async function getRecentFiles(limitCount: number = 10) {
  const res = await queryTable('uploaded_files', {
    limit: limitCount,
    orderBy: 'created_at',
    orderDirection: 'DESC',
  });
  return res?.rows || [];
}

/**
 * 6. 특정 파일의 시트 행 데이터 조회
 */
export async function getFileSheetRows(fileId: number, sheetName?: string) {
  const filters: Record<string, string> = { file_id: String(fileId) };
  if (sheetName) filters.sheet_name = sheetName;

  const res = await queryTable('sheet_rows', {
    filters,
    limit: 1000,
    orderBy: 'row_index',
    orderDirection: 'ASC',
  });

  return (res?.rows || []).map((row: any) => {
    let parsedData = {};
    try {
      parsedData = JSON.parse(row.row_data);
    } catch {
      parsedData = { data: row.row_data };
    }
    return { ...row, parsedData };
  });
}

/**
 * 7. 내보내기 이력 기록
 */
export async function recordExport(
  fileId: number | null,
  exportType: 'google_sheets' | 'xlsx_download',
  targetTitle: string,
  targetUrl: string = '',
  status: string = 'success'
) {
  return insertRows('export_history', [
    {
      file_id: fileId,
      export_type: exportType,
      target_title: targetTitle,
      target_url: targetUrl,
      status,
      created_at: new Date().toISOString(),
    },
  ]);
}

/**
 * 8. 보관함 파일 및 시트 데이터 영구 삭제
 */
export async function deleteUploadedFile(fileId: number) {
  try {
    await deleteRows('sheet_rows', { filters: { file_id: String(fileId) } });
  } catch (e) {
    console.warn('sheet_rows 삭제 경고:', e);
  }
  return deleteRows('uploaded_files', { ids: [fileId] });
}
