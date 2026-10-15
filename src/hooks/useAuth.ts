'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { UserSession } from '@/types/workspace';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [showPhoneAuthModal, setShowPhoneAuthModal] = useState<boolean>(false);
  const [authPhoneNumber, setAuthPhoneNumber] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [authStep, setAuthStep] = useState<'phone' | 'code'>('phone');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [testCodeHint, setTestCodeHint] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<number>(180);

  // 로컬 세션 복원
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('filetosheet_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('세션 복원 실패:', e);
    }
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
      localStorage.setItem('filetosheet_user', JSON.stringify(data.user));
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
      setCurrentUser(null);
      localStorage.removeItem('filetosheet_user');
    }
  };

  return {
    currentUser,
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
  };
}
