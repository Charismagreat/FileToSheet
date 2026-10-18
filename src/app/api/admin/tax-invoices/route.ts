import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable, updateRows } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';
import { invalidateCache } from '@/lib/server-cache';

/**
 * GET /api/admin/tax-invoices - 세금계산서 신청 목록 조회
 * POST /api/admin/tax-invoices - 세금계산서 상태 변경 (ISSUED, REJECTED, REQUESTED)
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const billingRes = await queryTable('billing_history', {
      limit: 300,
      orderBy: [{ column: 'id', direction: 'desc' }],
    });

    const taxInvoices = (billingRes.rows || [])
      .filter((b: any) => b.tax_invoice_status || b.tax_invoice_info)
      .map((b: any) => {
        let info: any = {};
        try {
          info = typeof b.tax_invoice_info === 'string' ? JSON.parse(b.tax_invoice_info) : (b.tax_invoice_info || {});
        } catch {}
        return {
          id: b.id,
          orderId: b.order_id,
          phoneNumber: b.phone_number,
          title: b.title,
          finalAmount: Number(b.final_amount || 0),
          status: b.tax_invoice_status || 'REQUESTED',
          companyName: info.companyName || '미입력',
          bizNumber: info.bizNumber || '미입력',
          ceoName: info.ceoName || '미입력',
          email: info.email || '미입력',
          address: info.address || '미입력',
          createdAt: b.created_at,
        };
      });

    return NextResponse.json({ success: true, taxInvoices });
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
    const { id, newStatus } = body;

    if (!id || !newStatus) {
      return NextResponse.json({ success: false, error: 'ID와 변경할 상태값이 필요합니다.' }, { status: 400 });
    }

    await updateRows(
      'billing_history',
      { tax_invoice_status: newStatus },
      { ids: [Number(id)] }
    );

    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('billing_history', 'update');

    return NextResponse.json({ success: true, message: `상태가 ${newStatus}(으)로 변경되었습니다.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
