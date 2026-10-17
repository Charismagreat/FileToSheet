'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, X, AlertCircle, CheckCircle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { UserSession } from '@/types/workspace';

interface AccountTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onTransferSuccess: (newUser: UserSession) => void;
}

export function AccountTransferModal({
  isOpen,
  onClose,
  currentUser,
  onTransferSuccess,
}: AccountTransferModalProps) {
  const [newPhone, setNewPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify' | 'completed'>('input');
  const [countdown, setCountdown] = useState(180);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [testCodeHint, setTestCodeHint] = useState('');

  // 타이머 카운트다운
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'verify' && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const currentFormattedPhone = currentUser?.phoneNumber
    ? currentUser.phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')
    : '현재 계정';

  // 1. 신규 담당자 휴대폰으로 인증번호 발송 요청
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanNew = newPhone.replace(/[^0-9]/g, '');
    if (cleanNew.length < 10 || cleanNew.length > 11 || !cleanNew.startsWith('010')) {
      setErrorMessage('신규 담당자의 올바른 010 휴대폰 번호를 입력해 주세요.');
      return;
    }

    if (currentUser?.phoneNumber && cleanNew === currentUser.phoneNumber.replace(/[^0-9]/g, '')) {
      setErrorMessage('현재 로그인된 번호와 동일합니다. 다른 번호를 입력해 주세요.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleanNew }),
      });
      const data = await res.json();

      if (data.success) {
        setStep('verify');
        setCountdown(180);
        if (data.testCode) {
          setTestCodeHint(data.testCode);
        }
      } else {
        setErrorMessage(data.error || '인증번호 발송에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSending(false);
    }
  };

  // 2. 인증번호 검증 및 전사 프로젝트/데이터 계정 승계 실행
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!authCode || authCode.length !== 6) {
      setErrorMessage('문자로 전송된 6자리 인증번호를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/phone/transfer-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPhone: currentUser?.phoneNumber,
          newPhone: newPhone.replace(/[^0-9]/g, ''),
          code: authCode,
        }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setStep('completed');
        setTimeout(() => {
          onTransferSuccess(data.user);
          onClose();
        }, 2200);
      } else {
        setErrorMessage(data.error || '승계 처리에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">담당자 인수인계 (계정 승계)</h3>
              <p className="text-xs text-slate-500 font-medium">새로운 담당자의 휴대폰 번호로 데이터 일괄 이전</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 컨텐츠 */}
        <div className="p-6">
          {step === 'input' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              {/* 안내 카드 */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-blue-800">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>데이터 유실 없는 안전한 승계</span>
                </div>
                퇴사 또는 보직 변경 시, 신규 담당자의 휴대폰 번호로 현재 계정의{' '}
                <strong>모든 프로젝트, 시트, 증빙 문서, 설정</strong>이 즉시 이전됩니다.
              </div>

              {/* 현재 계정 번호 */}
              <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">현재 담당자 번호</span>
                <span className="font-mono font-bold text-slate-800">{currentFormattedPhone}</span>
              </div>

              {/* 신규 담당자 번호 입력 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  신규 담당자 휴대폰 번호
                </label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 font-mono text-sm tracking-wide text-slate-800"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  신규 담당자의 휴대폰으로 본인 확인용 6자리 인증 문자가 발송됩니다.
                </p>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending || !newPhone}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>인증번호 발송 중...</span>
                  </>
                ) : (
                  <>
                    <span>신규 담당자 번호로 인증문자 발송</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="text-center py-2">
                <p className="text-xs text-slate-500">
                  <strong className="text-slate-800 font-mono">{newPhone}</strong> 번호로
                  발송된 6자리 인증번호를 입력해 주세요.
                </p>
              </div>

              <div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="인증번호 6자리"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center tracking-widest text-xl font-mono font-extrabold px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-500 text-slate-800"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-rose-500">
                    {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                  </div>
                </div>
                {testCodeHint && (
                  <p className="text-[11px] text-blue-600 font-mono mt-1 text-center font-medium">
                    [테스트 모드 자동발급 번호: <strong>{testCodeHint}</strong>]
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setErrorMessage('');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || authCode.length !== 6}
                  className="flex-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>데이터 승계 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>인수인계 및 승계 완료</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'completed' && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900">담당자 인수인계 완료!</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                모든 프로젝트와 시트 데이터가 신규 담당자의 휴대폰 번호로 안전하게 승계되었습니다. 새 세션으로 자동 전환됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
