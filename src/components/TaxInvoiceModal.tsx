'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertCircle, Building2, Mail, User, ShieldCheck } from 'lucide-react';
import { BillingRecord, requestTaxInvoice } from '@/lib/billing-history';

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BillingRecord | null;
  onSuccess?: () => void;
}

export function TaxInvoiceModal({ isOpen, onClose, record, onSuccess }: TaxInvoiceModalProps) {
  const [businessNumber, setBusinessNumber] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [representative, setRepresentative] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [bizType, setBizType] = useState<string>('서비스');
  const [bizItem, setBizItem] = useState<string>('소프트웨어 개발 및 공급');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (record?.taxInvoiceInfo) {
      setBusinessNumber(record.taxInvoiceInfo.businessNumber || '');
      setCompanyName(record.taxInvoiceInfo.companyName || '');
      setRepresentative(record.taxInvoiceInfo.representative || '');
      setEmail(record.taxInvoiceInfo.email || '');
      setAddress(record.taxInvoiceInfo.address || '');
      setBizType(record.taxInvoiceInfo.bizType || '서비스');
      setBizItem(record.taxInvoiceInfo.bizItem || '소프트웨어');
    } else {
      setErrorMsg(null);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const isFree = record.finalAmount === 0;
  const isAlreadyRequested = record.taxInvoiceStatus === 'requested';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanBizNum = businessNumber.replace(/[^0-9]/g, '');
    if (cleanBizNum.length !== 10) {
      setErrorMsg('사업자등록번호 10자리를 정확히 입력해 주세요.');
      return;
    }

    if (!companyName.trim()) {
      setErrorMsg('상호(법인명)을 입력해 주세요.');
      return;
    }

    if (!representative.trim()) {
      setErrorMsg('대표자 성명을 입력해 주세요.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('세금계산서를 수신할 유효한 이메일 주소를 입력해 주세요.');
      return;
    }

    const success = requestTaxInvoice(record.id, {
      businessNumber: cleanBizNum.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3'),
      companyName: companyName.trim(),
      representative: representative.trim(),
      email: email.trim(),
      address: address.trim(),
      bizType: bizType.trim(),
      bizItem: bizItem.trim(),
    });

    if (success) {
      alert('전자세금계산서 발행 요청이 정상적으로 접수되었습니다!\n(국세청 홈택스 시스템을 통해 영업일 1~2일 내 전자 발행됩니다)');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg('세금계산서 발행 요청 저장에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 relative flex flex-col max-h-[92vh]">
        {/* 헤더 */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">전자세금계산서 발행 요청</h3>
              <p className="text-[11px] text-slate-500">결제 건별 국세청 홈택스 정발행 신청</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs">
          {/* 거래 요약 카드 */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">주문 / 거래번호</span>
              <span className="font-mono font-bold text-slate-800">{record.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">결제 품목</span>
              <span className="font-bold text-slate-800">{record.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">결제 금액</span>
              <span className="font-bold text-blue-600">
                {isFree ? '0원 (전액 무료 바우처)' : `${record.finalAmount.toLocaleString()}원 (VAT 포함)`}
              </span>
            </div>
          </div>

          {/* 0원 무료 결제 건 예외 안내 */}
          {isFree ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>세금계산서 발행 불가 안내</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/80">
                본 결제 건은 <strong>웰컴 바우처 / 전액 프로모션 쿠폰</strong>이 적용되어 실제 결제된 금액이 <strong>0원</strong>입니다.
                부가가치세법상 실공급가액이 발생하지 않는 무료 혜택은 세금계산서 발행 대상이 아니며, 필요 시 <strong>[영수증 인쇄]</strong> 기능을 통해 바우처 지급 내역을 증빙하실 수 있습니다.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
                >
                  확인 완료
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isAlreadyRequested && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>이미 발행 요청이 접수된 건입니다. 정보를 수정하시려면 다시 제출해 주세요.</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* 1. 사업자등록번호 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  사업자등록번호 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="숫자 10자리 입력 (- 제외)"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    maxLength={12}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* 2. 상호 및 대표자명 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    상호(법인명) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: (주)이지컴퍼니"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    대표자 성명 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="홍길동"
                      value={representative}
                      onChange={(e) => setRepresentative(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 3. 수신 이메일 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  세금계산서 수신 이메일 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="tax@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* 4. 사업장 주소 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">사업장 주소</label>
                <input
                  type="text"
                  placeholder="서울특별시 강남구 테헤란로 123, 4층"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* 5. 업태 / 종목 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">업태</label>
                  <input
                    type="text"
                    value={bizType}
                    onChange={(e) => setBizType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">종목</label>
                  <input
                    type="text"
                    value={bizItem}
                    onChange={(e) => setBizItem(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-98"
                >
                  {isAlreadyRequested ? '수정된 정보로 재신청하기' : '전자세금계산서 발행 요청 제출'}
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  접수 후 익영업일 내 국세청 홈택스 정발행 처리되며 수신 이메일로 알림이 발송됩니다.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
