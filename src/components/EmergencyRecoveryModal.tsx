'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, AlertTriangle, CheckCircle, RefreshCw, Smartphone, ArrowRight, Lock } from 'lucide-react';
import { UserSession } from '@/types/workspace';

interface EmergencyRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecoverySuccess: (newUser: UserSession) => void;
}

export function EmergencyRecoveryModal({
  isOpen,
  onClose,
  onRecoverySuccess,
}: EmergencyRecoveryModalProps) {
  const [targetPhone, setTargetPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify' | 'completed'>('input');
  const [countdown, setCountdown] = useState(180);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [testCodeHint, setTestCodeHint] = useState('');

  // 3분 카운트다운 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'verify' && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  // 1. 대표자 휴대폰으로 비상 승인번호 발송 요청
  const handleSendAdminCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanTarget = targetPhone.replace(/[^0-9]/g, '');
    const cleanNew = newPhone.replace(/[^0-9]/g, '');
    const cleanAdmin = adminPhone.replace(/[^0-9]/g, '');

    if (!cleanTarget || !cleanNew || !cleanAdmin) {
      setErrorMessage('3개 번호(회수 대상, 신규 담당자, 대표자)를 모두 입력해 주세요.');
      return;
    }

    if (cleanTarget === cleanNew) {
      setErrorMessage('회수 대상 번호와 신규 담당자 번호가 같을 수 없습니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/phone/emergency-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_code',
          targetPhone: cleanTarget,
          newPhone: cleanNew,
          adminPhone: cleanAdmin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStep('verify');
        setCountdown(180);
        if (data.testCode) setTestCodeHint(data.testCode);
      } else {
        setErrorMessage(data.error || '승인번호 발송에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 2. 대표자 OTP 검증 및 비상 강제 회수 실행
  const handleExecuteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!authCode || authCode.length !== 6) {
      setErrorMessage('대표자 휴대폰으로 수신된 6자리 승인번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/phone/emergency-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          targetPhone: targetPhone.replace(/[^0-9]/g, ''),
          newPhone: newPhone.replace(/[^0-9]/g, ''),
          adminPhone: adminPhone.replace(/[^0-9]/g, ''),
          code: authCode,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setStep('completed');
        setTimeout(() => {
          onRecoverySuccess(data.user);
          onClose();
        }, 2200);
      } else {
        setErrorMessage(data.error || '회수 처리에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden relative">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-amber-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">비상 계정 강제 회수 센터</h3>
              <p className="text-xs text-rose-600 font-medium">담당자 폰 분실 / 무단 잠적 비상 대응 (대표자 2차 인증)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <div className="p-6">
          {step === 'input' && (
            <form onSubmit={handleSendAdminCode} className="space-y-3.5">
              {/* 무단 사용 방지 2차 인증 안내 */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>내부자 무단 회수 방지 (Two-Man Rule)</span>
                </div>
                직원의 무단 도용을 원천 차단하기 위해, 회수 요청 시{' '}
                <strong>사내 대표자(총괄)의 개인 휴대폰으로만 실시간 승인 문자(OTP)</strong>가 발송됩니다.
              </div>

              {/* 1. 회수 대상 번호 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. 회수 대상 (분실 / 잠적 직원) 번호
                </label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>

              {/* 2. 신규 담당자 번호 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. 새로 승계받을 담당자 번호
                </label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>

              {/* 3. 승인 대표자 번호 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>3. 사내 승인권자 (대표자 / CFO) 번호</span>
                  <span className="text-[10px] text-rose-500 font-normal">승인 SMS 발송 대상</span>
                </label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50/30 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>대표자 휴대폰으로 비상 승인문자 발송</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleExecuteRecovery} className="space-y-4">
              <div className="text-center py-1">
                <p className="text-xs text-slate-600">
                  대표자 휴대폰(<strong className="font-mono text-rose-600">{adminPhone}</strong>)으로 발송된
                  6자리 비상 승인번호를 입력하세요.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">대표자 실물 폰을 소지해야만 승인 가능합니다.</p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="승인번호 6자리"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center tracking-widest text-xl font-mono font-extrabold px-4 py-3 rounded-xl border border-rose-300 focus:outline-hidden focus:border-rose-500 text-slate-800"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-rose-500">
                  {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                </div>
              </div>

              {testCodeHint && (
                <p className="text-[11px] text-blue-600 font-mono text-center font-medium">
                  [개발/테스트용 자동 승인코드: <strong>{testCodeHint}</strong>]
                </p>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
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
                  className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loading || authCode.length !== 6}
                  className="flex-2 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>비상 강제 회수 승인 및 이전</span>
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
              <h4 className="font-extrabold text-base text-slate-900">비상 계정 회수 완료!</h4>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                잠적/분실 직원의 모든 프로젝트와 시트가 신규 담당자 계정으로 안전하게 강제 이전되었습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
