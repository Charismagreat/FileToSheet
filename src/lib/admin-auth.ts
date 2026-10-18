/**
 * src/lib/admin-auth.ts
 * 관리자 권한 판별 및 인증 헬퍼
 */

import { NextRequest } from 'next/server';

export const ADMIN_PHONE_NUMBERS = [
  '010-7216-5884',
  '01072165884',
];

/**
 * 전화번호 또는 세션으로부터 관리자 여부 판별
 */
export function isPhoneNumberAdmin(phone?: string | null): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return ADMIN_PHONE_NUMBERS.some((adm) => adm.replace(/[^0-9]/g, '') === cleanPhone);
}

/**
 * API 요청 헤더, 쿠키 또는 쿼리에서 관리자 권한 검증
 */
export function checkAdminAuth(req: NextRequest): boolean {
  // 1. 요청 헤더 x-admin-phone 또는 x-user-phone 확인
  const phoneHeader = req.headers.get('x-admin-phone') || req.headers.get('x-user-phone');
  if (phoneHeader && isPhoneNumberAdmin(phoneHeader)) {
    return true;
  }

  // 2. 쿠키 확인
  const phoneCookie = req.cookies.get('fts_user_phone')?.value || req.cookies.get('fts_admin_phone')?.value;
  if (phoneCookie && isPhoneNumberAdmin(phoneCookie)) {
    return true;
  }

  // 3. 로컬 개발 환경(localhost / 127.0.0.1)에서는 관리자 테스트 접근 허용
  const host = req.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }

  return false;
}
