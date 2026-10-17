'use client';

import React, { useState, useEffect } from 'react';
import {
  X, CreditCard, Sparkles, FileSpreadsheet, Download, Printer,
  FileText, CheckCircle, Search, RefreshCw, Layers, ShieldCheck,
  AlertCircle, ArrowRight, Zap
} from 'lucide-react';
import { UserSession, ProjectWorkspace } from '@/types/workspace';
import {
  BillingRecord,
  UsageItem,
  getBillingHistory,
  getAggregatedUsageHistory,
  exportBillingAndUsageToExcel,
} from '@/lib/billing-history';
import { ReceiptModal } from './ReceiptModal';
import { TaxInvoiceModal } from './TaxInvoiceModal';

interface BillingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  currentProject?: ProjectWorkspace | null;
  onOpenPricingModal?: () => void;
}

export function BillingHistoryModal({
  isOpen,
  onClose,
  currentUser,
  currentProject,
  onOpenPricingModal,
}: BillingHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'billing' | 'ai_usage' | 'doc_usage'>('billing');
  const [billingList, setBillingList] = useState<BillingRecord[]>([]);
  const [aiUsages, setAiUsages] = useState<UsageItem[]>([]);
  const [docUsages, setDocUsages] = useState<UsageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 서브 모달 상태
  const [selectedReceipt, setSelectedReceipt] = useState<BillingRecord | null>(null);
  const [selectedTaxRecord, setSelectedTaxRecord] = useState<BillingRecord | null>(null);

  const loadData = () => {
    const billings = getBillingHistory();
    setBillingList(billings);

    const { aiUsages: ai, docUsages: docs } = getAggregatedUsageHistory(currentProject?.originalFiles);
    setAiUsages(ai);
    setDocUsages(docs);
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();

    window.addEventListener('filetosheet_billing_updated', loadData);
    window.addEventListener('filetosheet_credit_updated', loadData);
    return () => {
      window.removeEventListener('filetosheet_billing_updated', loadData);
      window.removeEventListener('filetosheet_credit_updated', loadData);
    };
  }, [isOpen, currentProject]);

  if (!isOpen) return null;

  // 통계 집계
  const totalPaidAmount = billingList.reduce((acc, r) => acc + (r.finalAmount || 0), 0);
  const totalAiTokensUsed = aiUsages.reduce((acc, u) => acc + (u.tokensUsed?.total || 0), 0);
  const totalDocsParsed = docUsages.reduce((acc, d) => acc + (d.docsUsed || 1), 0);

  // 엑셀 다운로드
  const handleExportExcel = () => {
    exportBillingAndUsageToExcel({
      billingList,
      aiUsages,
      docUsages,
    });
  };

  // 탭별 필터링
  const filteredBilling = billingList.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.couponCode && r.couponCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAi = aiUsages.filter(
    (u) =>
      !searchQuery ||
      u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.detail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocs = docUsages.filter(
    (d) =>
      !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.detail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden text-slate-800 relative">
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/40 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">결제 및 이용 내역</h2>
                <p className="text-xs text-slate-500">
                  결제/충전 내역, 전자 영수증 출력, 세금계산서 발행 신청 및 토큰 사용 로그
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 엑셀 다운로드 버튼 */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
              title="전체 결제 및 이용 내역을 엑셀 파일(.xlsx)로 내려받습니다"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀 다운로드</span>
            </button>

            {/* 추가 충전 바로가기 */}
            {onOpenPricingModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPricingModal();
                }}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>크레딧 충전</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 핵심 통계 요약 카드 3종 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3 bg-slate-50/70 border-b border-slate-200/70 text-xs">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium">총 결제/충전</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {billingList.length}건 <span className="text-xs font-semibold text-blue-600">({totalPaidAmount.toLocaleString()}원)</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              💳
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium">AI 비서 소모 토큰</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {totalAiTokensUsed.toLocaleString()} <span className="text-xs font-normal text-slate-500">토큰</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium">문서 파싱 처리량</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {totalDocsParsed.toLocaleString()} <span className="text-xs font-normal text-slate-500">장 처리</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              📑
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 및 검색 바 */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'billing'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>충전 및 결제 내역</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 rounded-full text-slate-700">
                {billingList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_usage')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'ai_usage'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 토큰 소모 로그</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 rounded-full text-slate-700">
                {aiUsages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('doc_usage')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'doc_usage'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>문서 파싱 내역</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 rounded-full text-slate-700">
                {docUsages.length}
              </span>
            </button>
          </div>

          {/* 검색 인풋 */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="내역 검색 (품목, 주문번호, 쿠폰...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: 결제 및 충전 내역 */}
          {activeTab === 'billing' && (
            <div className="space-y-3">
              {filteredBilling.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">결제 및 충전 내역이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    프로모션 쿠폰을 등록하거나 충전 팩을 결제하시면 영수증과 세금계산서 신청이 가능합니다.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-3 px-4">일시 / 주문번호</th>
                          <th className="py-3 px-4">결제 품목</th>
                          <th className="py-3 px-4">충전 혜택</th>
                          <th className="py-3 px-4">결제 금액</th>
                          <th className="py-3 px-4">결제 수단</th>
                          <th className="py-3 px-4 text-center">증빙 및 세무 액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredBilling.map((record) => {
                          const isFree = record.finalAmount === 0;
                          return (
                            <tr key={record.id} className="hover:bg-blue-50/30 transition">
                              <td className="py-3.5 px-4 font-mono text-[11px]">
                                <div className="font-bold text-slate-800">
                                  {new Date(record.date).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })}
                                </div>
                                <div className="text-[10px] text-slate-400">{record.id}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                  <span>{record.title}</span>
                                  {record.couponCode && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                      {record.couponCode}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                                  record.type === 'coupon'
                                    ? 'bg-purple-50 text-purple-700'
                                    : record.type === 'subscription'
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {record.type === 'coupon' ? '프로모션 바우처' : record.type === 'subscription' ? 'PRO 플랜 구독' : '초과 종량 충전'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-[11px] text-slate-600">
                                <span className="font-medium">{record.benefitsDesc}</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <div className="font-extrabold text-sm text-slate-900">
                                  {isFree ? (
                                    <span className="text-blue-600">0원 (전액 무료)</span>
                                  ) : (
                                    `${record.finalAmount.toLocaleString()}원`
                                  )}
                                </div>
                                {isFree && record.originalAmount > 0 && (
                                  <div className="text-[10px] text-slate-400 line-through">
                                    정가 {record.originalAmount.toLocaleString()}원
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-[11px] text-slate-500">
                                <span>{record.paymentMethod}</span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* 영수증 버튼 */}
                                  <button
                                    onClick={() => setSelectedReceipt(record)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1 active:scale-95"
                                    title="전자 결제 영수증 확인 및 인쇄"
                                  >
                                    <Printer className="w-3 h-3 text-slate-500" />
                                    <span>영수증</span>
                                  </button>

                                  {/* 세금계산서 버튼 */}
                                  <button
                                    onClick={() => setSelectedTaxRecord(record)}
                                    className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition flex items-center gap-1 active:scale-95 ${
                                      record.taxInvoiceStatus === 'requested'
                                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : isFree
                                        ? 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'
                                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                                    }`}
                                    title={isFree ? '0원 결제건은 세금계산서 발행 대상이 아닙니다' : '국세청 전자세금계산서 발행 요청'}
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>
                                      {record.taxInvoiceStatus === 'requested'
                                        ? '신청완료'
                                        : isFree
                                        ? '세금계산서(0원)'
                                        : '세금계산서'}
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI 토큰 소모 로그 */}
          {activeTab === 'ai_usage' && (
            <div className="space-y-3">
              {filteredAi.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">아직 AI 토큰 소모 기록이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    우측 하단 [AI 데이터 비서]와 대화를 나누시면 실시간 토큰 사용 내역이 기록됩니다.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-3 px-4">일시</th>
                          <th className="py-3 px-4">대화 주제</th>
                          <th className="py-3 px-4">기반 모델</th>
                          <th className="py-3 px-4 font-mono">입력 토큰</th>
                          <th className="py-3 px-4 font-mono">출력 토큰</th>
                          <th className="py-3 px-4 font-mono font-bold text-slate-800">총 토큰</th>
                          <th className="py-3 px-4">답변 요약</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredAi.map((item) => (
                          <tr key={item.id} className="hover:bg-purple-50/20 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {item.date}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {item.title}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {item.model || 'Gemini 3.8 Flash'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              {item.tokensUsed?.prompt.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              {item.tokensUsed?.completion.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] font-extrabold text-blue-600">
                              {item.tokensUsed?.total.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate" title={item.detail}>
                              {item.detail}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 문서 파싱 내역 */}
          {activeTab === 'doc_usage' && (
            <div className="space-y-3">
              {filteredDocs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">문서 파싱 내역이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">파일을 드롭하여 표로 변환하시면 파싱 이력이 저장됩니다.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-3 px-4">일시</th>
                          <th className="py-3 px-4">증빙 파일명</th>
                          <th className="py-3 px-4">문서 유형 / 규격</th>
                          <th className="py-3 px-4 text-center">차감 장수</th>
                          <th className="py-3 px-4 text-center">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredDocs.map((item) => (
                          <tr key={item.id} className="hover:bg-emerald-50/20 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {item.date ? new Date(item.date).toLocaleDateString('ko-KR') : '최근'}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {item.title}
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-500">
                              {item.detail}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-blue-600">
                              -{item.docsUsed || 1}장
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                <span>정상 완료</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 안내 */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>모든 결제 및 이용 데이터는 암호화되어 안전하게 보관되며 언제든지 엑셀 파일로 증빙 백업할 수 있습니다.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 전자 영수증 서브 모달 */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        record={selectedReceipt}
      />

      {/* 전자세금계산서 신청 서브 모달 */}
      <TaxInvoiceModal
        isOpen={!!selectedTaxRecord}
        onClose={() => setSelectedTaxRecord(null)}
        record={selectedTaxRecord}
        onSuccess={loadData}
      />
    </div>
  );
}
