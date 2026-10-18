import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable } from '@/egdesk-helpers';

/**
 * GET /api/admin/dispatch-logs
 * 문자(SMS/LMS) 발송 전수 감사 추적 대장 조회
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const res = await queryTable('sms_dispatch_logs', {
      limit,
      orderBy: [{ column: 'id', direction: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      logs: res.rows || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
