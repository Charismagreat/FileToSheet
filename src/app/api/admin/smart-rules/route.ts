import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable, insertRows, updateRows, deleteRows } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';
import { invalidateCache } from '@/lib/server-cache';

/**
 * GET /api/admin/smart-rules - 전체 자연어 규칙 조회
 * POST /api/admin/smart-rules - 신규 규칙 등록
 * PUT /api/admin/smart-rules - 규칙 활성/비활성 토글
 * DELETE /api/admin/smart-rules - 규칙 삭제
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const res = await queryTable('sms_notification_rules', { limit: 200 });
    return NextResponse.json({ success: true, rules: res.rows || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      projectId = 'SYSTEM',
      sheetName = '공통',
      ruleName,
      rawPrompt,
      triggerConfig,
      recipientPhone,
      messageTemplate,
    } = body;

    if (!ruleName || !rawPrompt) {
      return NextResponse.json({ success: false, error: '규칙 이름과 프롬프트가 필요합니다.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const triggerStr = typeof triggerConfig === 'string' ? triggerConfig : JSON.stringify(triggerConfig || {});

    const result = await insertRows('sms_notification_rules', [
      {
        project_id: projectId,
        sheet_name: sheetName,
        rule_name: ruleName,
        raw_prompt: rawPrompt,
        trigger_config: triggerStr,
        recipient_phone: recipientPhone || '010-7216-5884',
        message_template: messageTemplate || '',
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
    ]);

    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('sms_notification_rules', 'insert');

    return NextResponse.json({ success: true, id: result?.ids?.[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '규칙 ID가 필요합니다.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await updateRows('sms_notification_rules', { is_active: Number(is_active), updated_at: now }, { ids: [Number(id)] });

    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('sms_notification_rules', 'update');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '규칙 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('sms_notification_rules', { id: Number(id) });

    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('sms_notification_rules', 'delete');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
