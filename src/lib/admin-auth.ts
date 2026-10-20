/**
 * src/lib/admin-auth.ts
 * 관리자 권한 판별 및 인증 헬퍼
 */

import { NextRequest } from 'next/server';

export const SUPER_ADMIN_PHONE = '010-7216-5884';

export const ADMIN_PHONE_NUMBERS = [
  '010-7216-5884',
  '01072165884',
];

/**
 * 전화번호 또는 세션으로부터 관리자 여부 판별
 * 개발 환경(NODE_ENV === 'development')에서는 별도 지정이 없어도 010-7216-5884 최고관리자 권한 자동 인정
 */
export function isPhoneNumberAdmin(phone?: string | null): boolean {
  if (!phone) {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return ADMIN_PHONE_NUMBERS.some((adm) => adm.replace(/[^0-9]/g, '') === cleanPhone);
}

/**
 * API 요청 헤더, 쿠키 또는 쿼리에서 관리자 권한 검증
 * 개발 환경에서는 010-7216-5884 최고관리자 권한으로 별도 로그인 없이 자동 승인
 */
export function checkAdminAuth(req: NextRequest): boolean {
  // ⚡ 개발 환경 예외: 010-7216-5884 최고관리자 권한으로 별도 로그인 없이 통과
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // 1. 요청 헤더 x-admin-phone 또는 x-user-phone 확인
  const phoneHeader = req.headers.get('x-admin-phone') || req.headers.get('x-user-phone');
  if (phoneHeader) {
    return isPhoneNumberAdmin(phoneHeader);
  }

  // 2. 쿠키 확인
  const phoneCookie = req.cookies.get('fts_user_phone')?.value || req.cookies.get('fts_admin_phone')?.value;
  if (phoneCookie) {
    return isPhoneNumberAdmin(phoneCookie);
  }

  // 3. Authorization Bearer 토큰 또는 특수 헤더 확인 (내부 시스템/터널링 연동용)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.includes('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (process.env.ADMIN_SECRET_KEY && token === process.env.ADMIN_SECRET_KEY) {
      return true;
    }
  }

  return false;
}
