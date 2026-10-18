import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable, updateRows, insertRows } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';
import { invalidateCache } from '@/lib/server-cache';

/**
 * GET /api/admin/sms - SMS 환경설정 조회
 * POST /api/admin/sms - SMS 환경설정 저장
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const res = await queryTable('admin_sms_settings', { limit: 1 });
    const settings = res.rows?.[0] || {
      config_key: 'default',
      dispatch_mode: 'GOOGLE_MESSAGES',
      admin_phone: '010-7216-5884',
      is_active: 1,
    };

    return NextResponse.json({ success: true, settings });
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
    const { dispatch_mode, admin_phone, aligo_api_key, aligo_sender, is_active } = body;
    const now = new Date().toISOString();

    const existing = await queryTable('admin_sms_settings', { limit: 1 });
    if (existing.rows && existing.rows.length > 0) {
      await updateRows(
        'admin_sms_settings',
        {
          dispatch_mode: dispatch_mode || 'GOOGLE_MESSAGES',
          admin_phone: admin_phone || '010-7216-5884',
          aligo_api_key: aligo_api_key || '',
          aligo_sender: aligo_sender || admin_phone || '010-7216-5884',
          is_active: is_active !== undefined ? Number(is_active) : 1,
          updated_at: now,
        },
        { ids: [existing.rows[0].id] }
      );
    } else {
      await insertRows('admin_sms_settings', [
        {
          config_key: 'default',
          dispatch_mode: dispatch_mode || 'GOOGLE_MESSAGES',
          admin_phone: admin_phone || '010-7216-5884',
          aligo_api_key: aligo_api_key || '',
          aligo_sender: aligo_sender || admin_phone || '010-7216-5884',
          is_active: 1,
          updated_at: now,
        },
      ]);
    }

    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('admin_sms_settings', 'update');

    return NextResponse.json({ success: true, message: 'SMS 설정이 저장되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
