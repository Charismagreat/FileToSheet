// c:\dev\FileToSheet\src\app\api\inbox\token\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { insertRows, queryTable } from '@/egdesk-helpers';

function generateInboxToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'fts_inbox_';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * GET /api/inbox/token?projectId=...&sheetName=...
 * 해당 프로젝트 및 시트에 기발급된 모바일 수신 토큰 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const sheetName = searchParams.get('sheetName');

    const res = await queryTable('share_links', {
      filter: { project_id: projectId, status: 'active' },
      limit: 50,
    });

    if (res && Array.isArray(res.rows)) {
      const match = res.rows.find((r: any) => {
        try {
          const payload = typeof r.payload_data === 'string' ? JSON.parse(r.payload_data) : r.payload_data;
          return payload?.mode === 'mobile_sheet_ingest' && (!sheetName || payload?.sheetName === sheetName);
        } catch {
          return false;
        }
      });

      if (match) {
        const origin = request.nextUrl.origin || 'http://localhost:4003';
        return NextResponse.json({
          success: true,
          exists: true,
          token: match.token,
          sheetName: sheetName || '전체 시트',
          webhookUrl: `${origin}/api/inbox/${match.token}`,
          qrPayload: JSON.stringify({
            service: 'FileToSheet',
            action: 'sheet_ingest',
            token: match.token,
            endpoint: `${origin}/api/inbox/${match.token}`,
            sheetName: sheetName || '기본 시트',
            projectId,
          }),
        });
      }
    }

    return NextResponse.json({ success: true, exists: false });
  } catch (error: any) {
    console.error('GET /api/inbox/token error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/inbox/token
 * 특정 시트에 대한 신규 모바일 수신 토큰 발급
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId = 'default', projectName = '내 프로젝트', sheetName = '기본시트', userPhone } = body;

    const token = generateInboxToken();
    const nowIso = new Date().toISOString();
    const origin = request.nextUrl.origin || 'http://localhost:4003';
    const webhookUrl = `${origin}/api/inbox/${token}`;

    const payloadData = {
      mode: 'mobile_sheet_ingest',
      projectId,
      projectName,
      sheetName,
      createdAt: nowIso,
    };

    await insertRows('share_links', [
      {
        token,
        project_id: String(projectId),
        project_name: projectName,
        sender_phone: userPhone || null,
        sender_branch: 'SheetBot Mobile Agent',
        allowed_sheets: JSON.stringify([sheetName]),
        payload_data: JSON.stringify(payloadData),
        status: 'active',
        created_at: nowIso,
      },
    ]);

    const qrPayload = JSON.stringify({
      service: 'FileToSheet',
      action: 'sheet_ingest',
      token,
      endpoint: webhookUrl,
      sheetName,
      projectName,
      projectId,
    });

    return NextResponse.json({
      success: true,
      token,
      webhookUrl,
      qrPayload,
      sheetName,
      projectName,
    });
  } catch (error: any) {
    console.error('POST /api/inbox/token error:', error);
    return NextResponse.json({ success: false, error: error.message || '토큰 발급 실패' }, { status: 500 });
  }
}
