import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/egdesk-helpers';

/**
 * GET /api/billing
 * 결제 및 충전, 바우처 내역 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || '';

    let records: any[] = [];
    try {
      const filter = phone ? { phone_number: phone } : undefined;
      const res = await queryTable('billing_history', {
        filter,
        limit: 100,
      });
      if (res && Array.isArray(res.rows)) {
        records = res.rows;
      }
    } catch (dbErr) {
      console.warn('billing_history query error (fallback to empty):', dbErr);
    }

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error: any) {
    console.error('GET /api/billing failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || '결제 내역 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing
 * 신규 결제/충전/쿠폰 내역 영구 적재
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phone,
      orderId,
      type,
      title,
      originalAmount,
      finalAmount,
      paymentMethod,
      couponCode,
      benefitsDesc,
      status,
      taxInvoiceStatus,
      taxInvoiceInfo,
    } = body;

    const row = {
      phone_number: phone || 'anonymous',
      order_id: orderId || `TX-${Date.now()}`,
      transaction_type: type || 'charge',
      title: title || '충전 결제',
      original_amount: Number(originalAmount) || 0,
      final_amount: Number(finalAmount) || 0,
      payment_method: paymentMethod || '신용카드',
      coupon_code: couponCode || null,
      benefits_desc: benefitsDesc || '',
      status: status || 'completed',
      tax_invoice_status: taxInvoiceStatus || 'none',
      tax_invoice_info: taxInvoiceInfo ? (typeof taxInvoiceInfo === 'string' ? taxInvoiceInfo : JSON.stringify(taxInvoiceInfo)) : null,
      created_at: new Date().toISOString(),
    };

    try {
      await insertRows('billing_history', [row]);
    } catch (insertErr) {
      console.error('Failed to insert into billing_history:', insertErr);
    }

    return NextResponse.json({
      success: true,
      record: row,
    });
  } catch (error: any) {
    console.error('POST /api/billing failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || '결제 내역 저장 실패' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/billing
 * 세금계산서 신청 정보 업데이트
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, taxInvoiceStatus, taxInvoiceInfo } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId가 필요합니다.' },
        { status: 400 }
      );
    }

    try {
      await updateRows(
        'billing_history',
        { order_id: orderId },
        {
          tax_invoice_status: taxInvoiceStatus || 'requested',
          tax_invoice_info: typeof taxInvoiceInfo === 'string' ? taxInvoiceInfo : JSON.stringify(taxInvoiceInfo),
        }
      );
    } catch (updateErr) {
      console.error('Failed to update billing_history:', updateErr);
    }

    return NextResponse.json({
      success: true,
      message: '세금계산서 신청 정보가 저장되었습니다.',
    });
  } catch (error: any) {
    console.error('PATCH /api/billing failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || '세금계산서 신청 실패' },
      { status: 500 }
    );
  }
}
