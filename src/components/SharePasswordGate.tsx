'use client';

import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface SharePasswordGateProps {
  projectName?: string;
  createdAt?: string;
  error?: string;
  onSubmit: (password: string) => void;
  loading?: boolean;
}

export function SharePasswordGate({ projectName, createdAt, error, onSubmit, loading }: SharePasswordGateProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onSubmit(password.trim());
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">{projectName || '보호된 공유 문서'}</h2>
        {createdAt && <p className="text-[11px] text-slate-400 mt-0.5">공유 일시: {createdAt}</p>}

        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 text-left">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>작성자가 비밀번호로 보호한 문서입니다.</span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-center tracking-widest"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>{loading ? '확인 중...' : '문서 열람하기'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center">
          <a href="/" className="text-xs text-slate-400 hover:text-blue-600 font-medium transition">
            FileToSheet 홈으로 이동
          </a>
        </div>
      </div>
    </div>
  );
}
