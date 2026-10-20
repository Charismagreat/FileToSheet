import { NextRequest, NextResponse } from 'next/server';
import { queryTable, downloadFile } from '@/egdesk-helpers';

/**
 * GET /api/files/[id]
 * 이지데스크 영구 DB(uploaded_files) 및 파일 스토리지에서 원본 증빙 파일을 조회하여 스트리밍 서빙
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || id === 'null' || id === 'undefined') {
      return NextResponse.json({ success: false, error: '유효한 파일 ID가 필요합니다.' }, { status: 400 });
    }

    const numId = Number(id);
    const filter: Record<string, string> =
      !isNaN(numId) && numId > 0 ? { id: String(id) } : { filename: id };

    // 1. uploaded_files 메타데이터 및 행 데이터 조회
    const res = await queryTable('uploaded_files', {
      filters: filter,
      limit: 1,
    });

    const fileRecord = res?.rows?.[0] || null;

    let base64Data: string | null = null;
    let filename = fileRecord?.filename || `file-${id}`;
    let fileType = fileRecord?.file_type || filename.split('.').pop() || 'bin';

    // 2. 행의 file_data 컬럼에 직접 저장되어 있는 경우 (Base64 data URL 또는 raw Base64)
    if (fileRecord?.file_data && typeof fileRecord.file_data === 'string' && fileRecord.file_data.trim().length > 0) {
      base64Data = fileRecord.file_data.trim();
    }

    // 3. 컬럼에 데이터가 없으면 이지데스크 청크 스토리지(downloadFile) 조회
    if (!base64Data && !isNaN(numId) && numId > 0) {
      try {
        const dlRes = await downloadFile({
          tableName: 'uploaded_files',
          rowId: numId,
          columnName: 'file_data',
        });
        if (dlRes?.content) {
          base64Data = dlRes.content;
        } else if (typeof dlRes === 'string') {
          base64Data = dlRes;
        }
      } catch (dlErr) {
        console.warn(`[FileAPI] 청크 스토리지 파일(id: ${id}) 조회 실패:`, dlErr);
      }
    }

    if (!base64Data) {
      return NextResponse.json(
        { success: false, error: `파일 ID ${id}에 해당하는 원본 데이터를 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    // 4. Content-Type 및 바이너리 파싱
    const ext = fileType.toLowerCase().replace(/^\./, '');
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      csv: 'text/csv',
    };

    let mimeType = mimeMap[ext] || 'application/octet-stream';
    let pureBase64 = base64Data;

    if (base64Data.startsWith('data:')) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        pureBase64 = match[2];
      }
    }

    // 5. JSON 형식 요청인 경우 JSON 응답
    if (request.nextUrl.searchParams.get('format') === 'json') {
      return NextResponse.json({
        success: true,
        id,
        filename,
        mimeType,
        base64: pureBase64,
      });
    }

    // 6. 브라우저 <img> 태그 및 다운로드 요청에 대응하는 바이너리 응답
    const buffer = Buffer.from(pureBase64, 'base64');
    const isDownload = request.nextUrl.searchParams.get('download') === '1';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `${dispositionType}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('[FileAPI] 파일 서빙 중 예외 발생:', err);
    return NextResponse.json(
      { success: false, error: err?.message || '파일 서빙 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
