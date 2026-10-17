'use client';

import React, { useState } from 'react';
import { Building2, X, Send, CheckCircle2, ShieldCheck, Server, Lock } from 'lucide-react';

interface EnterpriseInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnterpriseInquiryModal({ isOpen, onClose }: EnterpriseInquiryModalProps) {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    company: '', name: '', email: '', phone: '',
    deployType: 'on-premise', userScale: '50-100', note: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setFormData({ company: '', name: '', email: '', phone: '', deployType: 'on-premise', userScale: '50-100', note: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 text-slate-800 relative">
        <button onClick={handleResetAndClose} className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">도입 문의가 접수되었습니다</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              귀사의 정보 보안 정책과 구축 환경(폐쇄망/온프레미스)에 맞춘<br />
              <strong>맞춤형 기술 백서 및 상세 견적서</strong>를 1영업일 이내에 보내드립니다.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium inline-block mb-6">
              접수 담당: <strong>{formData.company}</strong> {formData.name} 님 ({formData.email})
            </div>
            <button onClick={handleResetAndClose} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition">
              확인 및 닫기
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Enterprise On-Premise
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">사내 구축형 도입 및 견적 문의</h2>
              <p className="text-xs text-slate-500 mt-1">외부 망 데이터 반출 0% · 사내 폐쇄망 단독 배포를 지원합니다.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl mb-4 text-[11px] text-indigo-900">
              <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> 완전 폐쇄망</div>
              <div className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> 사내 서버 배포</div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> 사내 SSO/보안</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">회사명 / 기관명 *</label>
                  <input required type="text" placeholder="(주)한국엔터프라이즈" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">담당자 성함 / 직책 *</label>
                  <input required type="text" placeholder="홍길동 팀장" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">업무용 이메일 *</label>
                  <input required type="email" placeholder="contact@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">연락처 *</label>
                  <input required type="tel" placeholder="010-1234-5678" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">희망 구축 환경</label>
                  <select value={formData.deployType} onChange={(e) => setFormData({ ...formData, deployType: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 bg-white">
                    <option value="on-premise">사내 전용 서버 (온프레미스)</option>
                    <option value="air-gapped">완전 망분리 폐쇄망 (인터넷 차단)</option>
                    <option value="private-cloud">프라이빗 클라우드 (AWS/Azure VPC)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">예상 사내 사용자 규모</label>
                  <select value={formData.userScale} onChange={(e) => setFormData({ ...formData, userScale: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 bg-white">
                    <option value="under-50">50인 미만</option>
                    <option value="50-100">50인 ~ 100인</option>
                    <option value="100-500">100인 ~ 500인</option>
                    <option value="over-500">500인 이상 전사 도입</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">문의 및 요구사항 (선택)</label>
                <textarea rows={2} placeholder="예: 사내 ERP/그룹웨어 연동 가능 여부, 계약 절차 문의 등" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 resize-none" />
              </div>

              <button type="submit" disabled={loading} className="w-full py-2.5 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-98">
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? '접수 처리 중...' : '도입 상담 및 견적 신청하기'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
