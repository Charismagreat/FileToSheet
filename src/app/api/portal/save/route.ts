import { NextRequest, NextResponse } from 'next/server';
import { insertRows, queryTable } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';

/**
 * GET /api/portal/save
 * 사용자가 생성한 No-Code CRUD 웹앱 포털 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('phone') || req.headers.get('x-user-phone') || '';

    const res = await queryTable('user_portal_apps', { limit: 50 });
    const portals = (res.rows || []).map((row: any) => ({
      ...row,
      selected_modules: typeof row.selected_modules_json === 'string'
        ? JSON.parse(row.selected_modules_json || '[]')
        : row.selected_modules_json || [],
    }));

    return NextResponse.json({
      success: true,
      portals,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/portal/save
 * No-Code CRUD 웹앱 포털 설정 영구 저장
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userPhone = '',
      projectId = '',
      portalName,
      useCaseId = '',
      useCaseTitle = '',
      selectedModules = [],
      accessMode = 'ADMIN',
      isPublished = 1,
    } = body;

    if (!portalName) {
      return NextResponse.json({ success: false, error: '포털 명칭이 필요합니다.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const insertRes = await insertRows('user_portal_apps', [
      {
        user_phone: userPhone,
        project_id: projectId,
        portal_name: portalName,
        use_case_id: useCaseId,
        use_case_title: useCaseTitle,
        selected_modules_json: JSON.stringify(selectedModules),
        access_mode: accessMode,
        is_published: isPublished ? 1 : 0,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ]);

    realtimeHub.notifyTableChange('user_portal_apps', 'insert');

    return NextResponse.json({
      success: true,
      id: insertRes?.ids?.[0],
      portalName,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
