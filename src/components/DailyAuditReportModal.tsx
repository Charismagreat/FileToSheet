import { apiFetch } from '@/lib/api';
import React, { useState } from 'react';
import {
  X,
  FileCheck,
  AlertTriangle,
  Send,
  Sparkles,
  CopyCheck,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Smartphone,
  Check,
} from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';

interface DailyAuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: ParsedSheet[];
  userPhone?: string;
}

export const DailyAuditReportModal: React.FC<DailyAuditReportModalProps> = ({
  isOpen,
  onClose,
  sheets,
  userPhone = '010-7216-5884',
}) => {
  const [recipientPhone, setRecipientPhone] = useState(userPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  if (!isOpen) return null;

  // 실시간 AI 감사 실행 핸들러
  const handleRunAudit = async (sendSms = false) => {
    setIsLoading(true);
    setNotificationSent(false);
    try {
      const res = await apiFetch('/api/audit/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          sheets,
          sendNotification: sendSms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAuditResult(data.data);
        if (sendSms) {
          setNotificationSent(true);
        }
      } else {
        alert(data.error || '감사 실행 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      alert('서버 통신 실패: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!auditResult?.reportBody) return;
    navigator.clipboard.writeText(auditResult.reportBody);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50/70 to-blue-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">
                  AI 상시 데이터 감사 & 일일 리포트
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  PRO 서비스
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                백엔드 AI가 장부를 전수 순회하여 이중 전표, 계산 오차, 부가세 누락을 정밀 감사합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. 상단 안내 및 즉시 실행 카드 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                자동 감사 예약 현황: 매일 아침 08:30 (활성화됨)
              </span>
              <p className="text-xs text-slate-500">
                현재 적재된 <strong className="text-slate-700">{sheets.length}개 시트</strong>에 대해 지금 즉시 AI 감사를 실행할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRunAudit(false)}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? '감사 분석 중...' : '즉시 AI 전수 감사 실행'}
              </button>
            </div>
          </div>

          {/* 2. 감사 결과 대시보드 (실행 후 노출) */}
          {auditResult && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* 핵심 지표 4종 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 font-medium">데이터 건전성</span>
                  <div className="text-xl font-black text-indigo-600 mt-0.5">
                    {auditResult.overallMatchRate}%
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {auditResult.overallMatchRate === 100 ? '완벽한 상태' : '보정 권장'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 font-medium">감사 완료 행</span>
                  <div className="text-xl font-black text-slate-800 mt-0.5">
                    {auditResult.totalRows.toLocaleString()}건
                  </div>
                  <span className="text-[10px] text-slate-400">총 {auditResult.totalSheets}개 시트</span>
                </div>

                <div className={`p-3.5 rounded-xl border text-center ${
                  auditResult.duplicateCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                    <CopyCheck className="w-3.5 h-3.5 text-rose-500" />
                    이중 전표 의심
                  </span>
                  <div className={`text-xl font-black mt-0.5 ${
                    auditResult.duplicateCount > 0 ? 'text-rose-600' : 'text-slate-800'
                  }`}>
                    {auditResult.duplicateCount}건
                  </div>
                  <span className="text-[10px] text-slate-400">동일일자·거래처·금액</span>
                </div>

                <div className={`p-3.5 rounded-xl border text-center ${
                  auditResult.arithmeticCount + auditResult.vatCount > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-amber-500" />
                    계산/부가세 오차
                  </span>
                  <div className={`text-xl font-black mt-0.5 ${
                    auditResult.arithmeticCount + auditResult.vatCount > 0
                      ? 'text-amber-600'
                      : 'text-slate-800'
                  }`}>
                    {auditResult.arithmeticCount + auditResult.vatCount}건
                  </div>
                  <span className="text-[10px] text-slate-400">수식 불일치</span>
                </div>
              </div>

              {/* 시트별 감사 세부 테이블 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100/70 px-4 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>시트별 상세 감사 요약</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    전체 {auditResult.sheetSummaries.length}개 시트
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {auditResult.sheetSummaries.map((s: any, idx: number) => (
                    <div key={idx} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-indigo-500" />
                        <span className="font-semibold text-slate-800">{s.sheetName}</span>
                        <span className="text-slate-400">({s.rowCount}개 행)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.duplicateCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                            중복의심 {s.duplicateCount}건
                          </span>
                        )}
                        {s.errorCount > 0 ? (
                          <span className="text-rose-600 font-semibold">오류 {s.errorCount}건</span>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 통과
                          </span>
                        )}
                        <span className="font-mono text-slate-500 w-12 text-right">{s.matchRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 생성된 브리핑 리포트 텍스트 뷰어 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    일일 카카오 알림톡/SMS 브리핑 메시지
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : null}
                    {isCopied ? '복사됨!' : '리포트 전문 복사'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {auditResult.reportBody}
                </pre>
              </div>

              {/* 3. 모의 발송 및 실제 알림톡 수신 섹션 */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    담당자 스마트폰으로 즉시 리포트 발송 테스트
                  </span>
                  {notificationSent && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      문자 발송 및 감사로그 기록 완료
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="수신 전화번호 (예: 010-1234-5678)"
                    className="flex-1 px-3.5 py-2 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunAudit(true)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    리포트 전송
                  </button>
                </div>
                <p className="text-[11px] text-indigo-700/80">
                  * 발송된 내역은 시스템 감사 대장(`sms_dispatch_logs`)에 전수 기록되며, 관리자 콘솔에서 조회 가능합니다.
                </p>
              </div>
            </div>
          )}

          {!auditResult && !isLoading && (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ShieldCheck className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
              <h4 className="text-sm font-bold text-slate-700 mb-1">
                아직 오늘의 AI 감사를 실행하지 않았습니다.
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                상단의 <strong>[즉시 AI 전수 감사 실행]</strong> 버튼을 누르면, 백엔드 엔진이 모든 시트를 대조하여 이상치와 이중 전표를 찾아내고 일일 리포트를 생성합니다.
              </p>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            FileToSheet AI Autonomous Auditor v1.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
