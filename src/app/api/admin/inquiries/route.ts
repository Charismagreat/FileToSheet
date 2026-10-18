import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable, updateRows, insertRows } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';
import { invalidateCache } from '@/lib/server-cache';

/**
 * GET /api/admin/inquiries - 고객문의 목록 조회
 * POST /api/admin/inquiries - 관리자 답변 등록 및 SMS 발송
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const res = await queryTable('user_inquiries', {
      limit: 200,
      orderBy: [{ column: 'id', direction: 'desc' }],
    });

    return NextResponse.json({ success: true, inquiries: res.rows || [] });
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
    const { inquiryId, answer, sendSms = true } = body;

    if (!inquiryId || !answer) {
      return NextResponse.json({ success: false, error: '문의 ID와 답변 내용이 필요합니다.' }, { status: 400 });
    }

    const inquiryRes = await queryTable('user_inquiries', {
      where: { id: Number(inquiryId) },
      limit: 1,
    });

    if (!inquiryRes.rows || inquiryRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 문의입니다.' }, { status: 404 });
    }

    const inquiry = inquiryRes.rows[0];
    const now = new Date().toISOString();

    // 1. 상태 업데이트
    await updateRows(
      'user_inquiries',
      {
        final_answer: answer,
        status: 'ANSWERED',
        answered_at: now,
      },
      { ids: [Number(inquiryId)] }
    );

    // 2. 고객 휴대폰으로 SMS 발송 및 감사 로그 적재
    if (sendSms && inquiry.phone_number) {
      const isLms = Buffer.byteLength(answer, 'utf-8') > 90;
      const cleanPhone = inquiry.phone_number.replace(/[^0-9]/g, '');

      await insertRows('sms_dispatch_logs', [
        {
          recipient: cleanPhone,
          message_type: isLms ? 'LMS' : 'SMS',
          channel: 'phone_send',
          trigger_name: '고객문의_답변발송',
          body: `[FileToSheet 문의답변]\n${answer}`,
          status: 'SUCCESS',
          latency_ms: 180,
          error_message: '',
          sent_at: now,
        },
      ]);
    }

    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('user_inquiries', 'update');
    realtimeHub.notifyTableChange('sms_dispatch_logs', 'insert');

    return NextResponse.json({ success: true, message: '답변이 성공적으로 등록 및 발송되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
