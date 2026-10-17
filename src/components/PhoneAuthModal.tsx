'use client';

import React from 'react';
import { Smartphone, X, AlertCircle, ShieldAlert } from 'lucide-react';

interface PhoneAuthModalProps {
  show: boolean;
  onClose: () => void;
  authStep: 'phone' | 'code';
  setAuthStep: (step: 'phone' | 'code') => void;
  authPhoneNumber: string;
  setAuthPhoneNumber: (phone: string) => void;
  authCode: string;
  setAuthCode: (code: string) => void;
  authLoading: boolean;
  authError: string;
  setAuthError: (err: string) => void;
  timerSeconds: number;
  testCodeHint: string;
  onSendCode: () => void;
  onVerifyCode: () => void;
  onOpenEmergencyRecovery?: () => void;
}

export function PhoneAuthModal({
  show,
  onClose,
  authStep,
  setAuthStep,
  authPhoneNumber,
  setAuthPhoneNumber,
  authCode,
  setAuthCode,
  authLoading,
  authError,
  setAuthError,
  timerSeconds,
  testCodeHint,
  onSendCode,
  onVerifyCode,
  onOpenEmergencyRecovery,
}: PhoneAuthModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">휴대폰 번호 간편가입 / 로그인</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          비밀번호 없이 6자리 인증번호로 10초 만에 가입 및 로그인하실 수 있습니다.
        </p>

        {authError && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {authStep === 'phone' ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                휴대폰 번호 (010)
              </label>
              <input
                autoFocus
                type="tel"
                placeholder="010-1234-5678"
                value={authPhoneNumber}
                onChange={(e) => setAuthPhoneNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSendCode();
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <button
              onClick={onSendCode}
              disabled={authLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition active:scale-98"
            >
              {authLoading ? '인증번호 발송 중...' : '인증번호 받기'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">인증번호 6자리</label>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <input
                autoFocus
                type="text"
                maxLength={6}
                placeholder="6자리 숫자 입력"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onVerifyCode();
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-center tracking-widest text-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {testCodeHint && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                <span>💡 테스트 인증번호: <strong>{testCodeHint}</strong></span>
                <span className="text-[10px] text-emerald-600 font-medium">자동 기입됨</span>
              </div>
            )}

            <button
              onClick={onVerifyCode}
              disabled={authLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition active:scale-98"
            >
              {authLoading ? '확인 중...' : '인증하고 시작하기'}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <button
                onClick={() => {
                  setAuthStep('phone');
                  setAuthError('');
                }}
                className="hover:text-slate-800 underline"
              >
                번호 다시 입력
              </button>
              <button
                onClick={onSendCode}
                disabled={authLoading}
                className="hover:text-blue-600 font-medium"
              >
                인증번호 재전송
              </button>
            </div>
          </div>
        )}

        {onOpenEmergencyRecovery && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEmergencyRecovery();
              }}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3 text-slate-400" />
              <span>휴대폰 분실 / 담당자 부재 비상 회수</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
