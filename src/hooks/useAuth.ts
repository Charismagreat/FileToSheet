'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { UserSession } from '@/types/workspace';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [showPhoneAuthModal, setShowPhoneAuthModal] = useState<boolean>(false);
  const [authPhoneNumber, setAuthPhoneNumber] = useState<string>(process.env.NODE_ENV === 'development' ? '010-7216-5884' : '');
  const [authCode, setAuthCode] = useState<string>('');
  const [authStep, setAuthStep] = useState<'phone' | 'code'>('phone');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [testCodeHint, setTestCodeHint] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<number>(180);

  // 🌟 서버로부터 최신 사용자 프로필(플랜, 잔여 토큰 등)을 실시간 동기화
  const syncLatestUserProfile = async (phoneNumber: string) => {
    if (typeof window !== 'undefined' && localStorage.getItem('filetosheet_logged_out') === 'true') {
      return;
    }
    try {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      if (!cleanPhone) return;
      const res = await apiFetch(`/api/auth/phone/me?phone=${cleanPhone}`);
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser((prev) => {
          const updated: UserSession = {
            ...prev,
            ...data.user,
            id: data.user.id || prev?.id || 1,
            phoneNumber: data.user.phoneNumber || prev?.phoneNumber || phoneNumber,
            nickname: data.user.nickname || prev?.nickname,
            plan: data.user.plan || prev?.plan || 'free',
          };
          localStorage.setItem('filetosheet_user', JSON.stringify(updated));
          document.cookie = `fts_user_phone=${updated.phoneNumber}; path=/; max-age=2592000; SameSite=Lax`;
          return updated;
        });
      }
    } catch (e) {
      console.warn('사용자 최신 세션 실시간 동기화 실패 (오프라인/네트워크):', e);
    }
  };

  // 로컬 세션 복원, 모바일 앱 URL 핸드오프(?phone= / ?token=) 자동 로그인 및 서버 최신 상태 즉각 재검증(Revalidate)
  useEffect(() => {
    let phoneToSync = '';
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlPhone = (params?.get('phone') || '').replace(/[^0-9]/g, '');
    const urlToken = (params?.get('token') || '').trim();

    if (urlPhone.length >= 10 && urlPhone.startsWith('010')) {
      try {
        localStorage.removeItem('filetosheet_logged_out');
        const handoffUser: UserSession = {
          id: 1,
          phoneNumber: urlPhone,
          nickname: urlPhone,
          plan: 'free',
        };
        const savedUser = localStorage.getItem('filetosheet_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed?.phoneNumber?.replace(/[^0-9]/g, '') === urlPhone) {
            Object.assign(handoffUser, parsed, { phoneNumber: urlPhone });
          }
        }
        setCurrentUser(handoffUser);
        localStorage.setItem('filetosheet_user', JSON.stringify(handoffUser));
        document.cookie = `fts_user_phone=${urlPhone}; path=/; max-age=2592000; SameSite=Lax`;
        phoneToSync = urlPhone;
      } catch (e) {
        console.error('URL 핸드오프 세션 설정 실패:', e);
      }
    } else {
      try {
        const savedUser = localStorage.getItem('filetosheet_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed?.phoneNumber) {
            setCurrentUser(parsed);
            document.cookie = `fts_user_phone=${parsed.phoneNumber}; path=/; max-age=2592000; SameSite=Lax`;
            phoneToSync = parsed.phoneNumber;
          }
        }
      } catch (e) {
        console.error('세션 복원 실패:', e);
      }
    }

    if (!phoneToSync && urlToken) {
      apiFetch(`/api/inbox/${encodeURIComponent(urlToken)}`)
        .then((res) => res.json())
        .then((data) => {
          const tokenPhone = (data?.phoneNumber || '').replace(/[^0-9]/g, '');
          if (data?.success && tokenPhone.length >= 10) {
            localStorage.removeItem('filetosheet_logged_out');
            const tokenUser: UserSession = {
              id: 1,
              phoneNumber: tokenPhone,
              nickname: tokenPhone,
              plan: 'free',
            };
            setCurrentUser(tokenUser);
            localStorage.setItem('filetosheet_user', JSON.stringify(tokenUser));
            document.cookie = `fts_user_phone=${tokenPhone}; path=/; max-age=2592000; SameSite=Lax`;
            syncLatestUserProfile(tokenPhone);
          }
        })
        .catch(() => {});
    }

    const isExplicitlyLoggedOut = typeof window !== 'undefined' && localStorage.getItem('filetosheet_logged_out') === 'true';
    if (!phoneToSync && process.env.NODE_ENV === 'development' && !isExplicitlyLoggedOut) {
      phoneToSync = '010-7216-5884';
      const devSuperAdmin: UserSession = {
        id: 1,
        phoneNumber: '010-7216-5884',
        nickname: '최고관리자 (010-7216-5884)',
        plan: 'enterprise',
      };
      setCurrentUser(devSuperAdmin);
      localStorage.setItem('filetosheet_user', JSON.stringify(devSuperAdmin));
      document.cookie = `fts_user_phone=${devSuperAdmin.phoneNumber}; path=/; max-age=2592000; SameSite=Lax`;
    }

    // 서버의 최신 플랜/토큰 정보를 조회하여 즉시 동기화
    if (phoneToSync) {
      syncLatestUserProfile(phoneToSync);
    }

    // 창 포커스 복귀 시 최신 플랜 재검증 (관리자 탭에서 플랜 변경 후 돌아왔을 때 즉시 반영)
    const handleWindowFocus = () => {
      const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('filetosheet_logged_out') === 'true';
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('filetosheet_user') : null;
      if (!isLoggedOut && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.phoneNumber) {
            syncLatestUserProfile(parsed.phoneNumber);
          }
        } catch (e) {}
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // 인증번호 타이머 카운트다운
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPhoneAuthModal && authStep === 'code' && timerSeconds > 0) {
      timer = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showPhoneAuthModal, authStep, timerSeconds]);

  // 인증번호 발송 요청
  const handleSendAuthCode = async () => {
    const rawNumber = authPhoneNumber.replace(/[^0-9]/g, '');
    if (rawNumber.length < 10 || !rawNumber.startsWith('010')) {
      setAuthError('올바른 010 휴대폰 번호를 입력해 주세요.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await apiFetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: rawNumber }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '인증번호 발송에 실패했습니다.');
      }

      setAuthStep('code');
      setTimerSeconds(180);
      if (data.testCode) {
        setTestCodeHint(data.testCode);
        setAuthCode(data.testCode);
      }
    } catch (err: any) {
      setAuthError(err.message || '인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 인증번호 확인 및 로그인
  const handleVerifyAuthCode = async () => {
    if (!authCode || authCode.trim().length !== 6) {
      setAuthError('6자리 인증번호를 정확히 입력해 주세요.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await apiFetch('/api/auth/phone/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: authPhoneNumber,
          code: authCode.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '인증에 실패했습니다.');
      }

      setCurrentUser(data.user);
      localStorage.removeItem('filetosheet_logged_out');
      localStorage.setItem('filetosheet_user', JSON.stringify(data.user));
      if (data.user?.phoneNumber) {
        document.cookie = `fts_user_phone=${data.user.phoneNumber}; path=/; max-age=2592000; SameSite=Lax`;
      }
      setShowPhoneAuthModal(false);
      setAuthPhoneNumber('');
      setAuthCode('');
      setAuthStep('phone');
      setTestCodeHint('');
      alert(data.message || '로그인되었습니다!');
    } catch (err: any) {
      setAuthError(err.message || '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('filetosheet_logged_out', 'true');
        localStorage.removeItem('filetosheet_user');
        localStorage.removeItem('filetosheet_guest_projects');
        document.cookie = 'fts_user_phone=; path=/; max-age=0; SameSite=Lax';
      }
      setCurrentUser(null);
      window.location.reload();
    }
  };

  // 사용자 세션 수동 갱신 (담당자 인수인계 등)
  const handleUpdateUser = (newUser: UserSession | null) => {
    setCurrentUser(newUser);
    if (newUser) {
      localStorage.setItem('filetosheet_user', JSON.stringify(newUser));
      if (newUser.phoneNumber) {
        document.cookie = `fts_user_phone=${newUser.phoneNumber}; path=/; max-age=2592000; SameSite=Lax`;
      }
    } else {
      localStorage.setItem('filetosheet_logged_out', 'true');
      localStorage.removeItem('filetosheet_user');
        localStorage.removeItem('filetosheet_guest_projects');
      document.cookie = 'fts_user_phone=; path=/; max-age=0; SameSite=Lax';
    }
  };

  return {
    currentUser,
    setCurrentUser: handleUpdateUser,
    showPhoneAuthModal,
    setShowPhoneAuthModal,
    authPhoneNumber,
    setAuthPhoneNumber,
    authCode,
    setAuthCode,
    authStep,
    setAuthStep,
    authLoading,
    authError,
    setAuthError,
    timerSeconds,
    testCodeHint,
    handleSendAuthCode,
    handleVerifyAuthCode,
    handleLogout,
    refreshUser: () => currentUser?.phoneNumber && syncLatestUserProfile(currentUser.phoneNumber),
  };
}
