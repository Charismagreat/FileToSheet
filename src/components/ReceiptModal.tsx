'use client';

import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import { BillingRecord } from '@/lib/billing-history';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BillingRecord | null;
}

export function ReceiptModal({ isOpen, onClose, record }: ReceiptModalProps) {
  if (!isOpen || !record) return null;

  const isFree = record.finalAmount === 0;
  const supplyAmount = Math.round(record.finalAmount / 1.1);
  const vatAmount = record.finalAmount - supplyAmount;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(record.date).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-800 relative flex flex-col max-h-[90vh]">
        {/* 모달 상단 툴바 (인쇄 시 숨김) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              🧾
            </div>
            <span className="font-extrabold text-sm text-slate-800">전자 결제 영수증</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>영수증 인쇄</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 인쇄 영역 (Receipt Container) */}
        <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs bg-white print:p-0 print:m-0">
          {/* 타이틀 및 로고 */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">FileToSheet 매출전표</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">고객용 이용 요금 영수증</p>
          </div>

          {/* 공급자 정보 */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">서비스명</span>
              <span className="font-bold text-slate-800">File to Sheet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">공급자 상호</span>
              <span className="font-medium text-slate-700">(주)이지데스크</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">사업자등록번호</span>
              <span className="font-mono text-slate-700">120-88-29401</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">고객센터 문의</span>
              <span className="text-slate-600">support@egdesk.com</span>
            </div>
          </div>

          {/* 거래 상세 내역 */}
          <div className="space-y-2 py-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">주문 / 거래번호</span>
              <span className="font-mono font-bold text-slate-800">{record.id}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">결제 승인일시</span>
              <span className="font-mono text-slate-700">{formattedDate}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">결제 수단</span>
              <span className="font-medium text-slate-800">{record.paymentMethod}</span>
            </div>
            {record.couponCode && (
              <div className="flex justify-between text-[11px]">
                <span className="text-blue-600 font-semibold">적용 프로모션 쿠폰</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  {record.couponCode}
                </span>
              </div>
            )}
          </div>

          {/* 결제 품목 상세 */}
          <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-1.5">
            <div className="flex justify-between font-bold text-xs text-slate-900">
              <span>{record.title}</span>
              <span>{record.originalAmount.toLocaleString()}원</span>
            </div>
            <p className="text-[10px] text-slate-500">{record.benefitsDesc}</p>
            {isFree && (
              <div className="flex justify-between text-blue-600 font-semibold text-[11px] pt-1">
                <span>프로모션 쿠폰 전액 할인</span>
                <span>-{record.originalAmount.toLocaleString()}원</span>
              </div>
            )}
          </div>

          {/* 금액 계산 합계 */}
          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>공급가액</span>
              <span>{supplyAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>부가가치세 (VAT 10%)</span>
              <span>{vatAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
              <span>최종 결제 금액</span>
              <span className="text-base text-blue-600">
                {isFree ? '0원 (전액 무료)' : `${record.finalAmount.toLocaleString()}원`}
              </span>
            </div>
          </div>

          {/* 하단 확인 서명 */}
          <div className="pt-3 text-center border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>정상 결제 승인 완료</span>
            </div>
            <p>본 영수증은 세법상 소득공제 및 매입세액공제 증빙 자료로 활용하실 수 있습니다.</p>
          </div>
        </div>

        {/* 하단 닫기 (인쇄 시 숨김) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center print:hidden">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
