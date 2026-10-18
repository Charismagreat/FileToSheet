// c:\dev\FileToSheet\src\app\api\inbox\[token]\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/egdesk-helpers';

/**
 * GET /api/inbox/[token]
 * 시트봇 모바일앱에서 QR코드나 토큰을 스캔했을 때 페어링 유효성 검증 및 시트 메타데이터 반환
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ success: false, error: '토큰이 필요합니다.' }, { status: 400 });
    }

    const res = await queryTable('share_links', {
      filter: { token, status: 'active' },
      limit: 1,
    });

    if (!res || !Array.isArray(res.rows) || res.rows.length === 0) {
      return NextResponse.json(
        { success: false, valid: false, error: '유효하지 않거나 만료된 토큰입니다.' },
        { status: 404 }
      );
    }

    const link = res.rows[0];
    let payload: any = {};
    try {
      payload = typeof link.payload_data === 'string' ? JSON.parse(link.payload_data) : link.payload_data;
    } catch {
      payload = {};
    }

    return NextResponse.json({
      success: true,
      valid: true,
      service: 'FileToSheet',
      token,
      projectId: link.project_id,
      projectName: link.project_name || '파일투시트 프로젝트',
      sheetName: payload?.sheetName || '기본 시트',
      createdAt: link.created_at,
      message: `[${payload?.sheetName || '지정 시트'}]와 모바일 페어링이 준비되었습니다.`,
    });
  } catch (error: any) {
    console.error('GET /api/inbox/[token] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/inbox/[token]
 * 시트봇 모바일앱에서 사진/문서/데이터를 수신하여 파일투시트 해당 시트에 즉시 행 적재
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 1. 토큰 유효성 검사
    const res = await queryTable('share_links', {
      filter: { token, status: 'active' },
      limit: 1,
    });

    if (!res || !Array.isArray(res.rows) || res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '유효하지 않거나 비활성화된 모바일 수신 토큰입니다.' },
        { status: 401 }
      );
    }

    const link = res.rows[0];
    let payload: any = {};
    try {
      payload = typeof link.payload_data === 'string' ? JSON.parse(link.payload_data) : link.payload_data;
    } catch {
      payload = {};
    }

    const targetSheetName = payload?.sheetName || '모바일_수신대장';
    const projectId = link.project_id || 'default';
    const nowIso = new Date().toISOString();

    const contentType = request.headers.get('content-type') || '';
    let insertedRowData: Record<string, any> = {};
    let memo = '';
    let fileName = 'mobile_upload.jpg';

    // 2. 요청 본문 파싱 (Multipart Form 또는 JSON 지원)
    if (contentType.includes('application/json')) {
      const json = await request.json();
      memo = json.memo || '';
      fileName = json.fileName || fileName;

      if (json.rowData && typeof json.rowData === 'object') {
        insertedRowData = { ...json.rowData };
      } else {
        // AI OCR이 이미 완료된 경우 또는 간이 데이터
        insertedRowData = {
          '접수일시': new Date().toLocaleString('ko-KR'),
          '출처': '📱 시트봇 모바일앱',
          '문서명': fileName,
          '내용': memo || json.content || '모바일 전송 데이터',
          '금액': json.amount || json.totalAmount || 0,
          '비고': json.note || '자동 적재 완료',
        };
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      memo = (formData.get('memo') as string) || '';
      const file = formData.get('file') as File | null;
      if (file) {
        fileName = file.name;
      }

      // 모바일 사진 수신 시 기본 행 데이터 구성
      insertedRowData = {
        '접수일시': new Date().toLocaleString('ko-KR'),
        '출처': '📱 시트봇 모바일앱',
        '문서명': fileName,
        '내용': memo || '모바일 카메라 촬영 문서',
        '상태': 'AI 분석 완료',
        '비고': `토큰: ${token.slice(0, 10)}...`,
      };
    } else {
      return NextResponse.json(
        { success: false, error: '지원하지 않는 Content-Type입니다. (JSON 또는 Multipart-FormData)' },
        { status: 400 }
      );
    }

    // 3. 감사 로그 테이블(data_change_logs)에 수신 이력 적재
    try {
      await insertRows('data_change_logs', [
        {
          project_id: projectId,
          sheet_name: targetSheetName,
          change_type: 'MOBILE_INGEST',
          target_row: 1,
          column_name: 'ALL',
          before_value: null,
          after_value: JSON.stringify(insertedRowData),
          operator: 'SheetBot_Mobile_Agent',
          created_at: nowIso,
        },
      ]);
    } catch (auditErr) {
      console.warn('Failed to insert audit log for mobile ingest:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `[${targetSheetName}] 시트에 1건이 성공적으로 적재되었습니다.`,
      targetSheet: targetSheetName,
      projectId,
      token,
      receivedAt: nowIso,
      data: insertedRowData,
    });
  } catch (error: any) {
    console.error('POST /api/inbox/[token] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '데이터 수신 및 적재 실패' },
      { status: 500 }
    );
  }
}
