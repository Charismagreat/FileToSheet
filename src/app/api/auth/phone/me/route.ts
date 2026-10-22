import { NextRequest, NextResponse } from 'next/server';
import { queryTable } from '@/egdesk-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/phone/me
 * 현재 로그인된 사용자의 최신 프로필, 이용 플랜(Pro/Free), 잔여 토큰 동기화
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryPhone = searchParams.get('phone');
    const headerPhone = request.headers.get('x-user-phone') || request.headers.get('x-admin-phone');
    const cookiePhone = request.cookies.get('fts_user_phone')?.value;

    const rawPhone = queryPhone || headerPhone || cookiePhone;
    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: '전화번호 정보가 없습니다.' },
        { status: 400 }
      );
    }

    const cleanNumber = rawPhone.replace(/[^0-9]/g, '');
    if (!cleanNumber) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 전화번호입니다.' },
        { status: 400 }
      );
    }

    // 1. users 테이블 조회
    const userRes = await queryTable('users', {
      filters: { phone_number: cleanNumber },
      limit: 1,
    });
    const user = userRes?.rows?.[0];

    // 2. user_wallets 테이블 조회
    const walletRes = await queryTable('user_wallets', {
      filters: { phone_number: cleanNumber },
      limit: 1,
    });
    const wallet = walletRes?.rows?.[0];

    // 플랜 결정 (user_wallets.plan_tier와 users.plan 중 더 높은 권한 우선 적용)
    let plan = user?.plan || 'free';
    if (wallet?.plan_tier) {
      if (wallet.plan_tier === 'pro' || wallet.plan_tier === 'enterprise') {
        plan = wallet.plan_tier;
      }
    }

    const responseUser = {
      id: user?.id || wallet?.id || 1,
      phoneNumber: cleanNumber,
      nickname: user?.nickname || `사용자_${cleanNumber.slice(-4)}`,
      plan: plan || 'free',
      balanceTokens: Number(wallet?.balance_tokens || 0),
      totalPurchasedTokens: Number(wallet?.total_purchased_tokens || 0),
      totalUsedTokens: Number(wallet?.total_used_tokens || 0),
    };

    return NextResponse.json({
      success: true,
      user: responseUser,
    });
  } catch (error: any) {
    console.error('사용자 최신 세션 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '사용자 정보 조회 실패' },
      { status: 500 }
    );
  }
}
