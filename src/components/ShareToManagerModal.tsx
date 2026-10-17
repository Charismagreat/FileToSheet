'use client';

import React, { useState } from 'react';
import { Building2, X, Send, CheckCircle, AlertCircle, Smartphone, Layers } from 'lucide-react';
import { ProjectWorkspace, UserSession } from '@/types/workspace';

interface ShareToManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectWorkspace | null;
  currentUser: UserSession | null;
}

export function ShareToManagerModal({
  isOpen,
  onClose,
  currentProject,
  currentUser,
}: ShareToManagerModalProps) {
  const [branchName, setBranchName] = useState('강남사업소');
  const [managerPhone, setManagerPhone] = useState('');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(
    currentProject?.activeSheetIndex || 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !currentProject) return null;

  const currentSheet = currentProject.sheets[selectedSheetIndex] || currentProject.sheets[0];

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = managerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || !cleanPhone.startsWith('010')) {
      setErrorMessage('올바른 010 총괄 담당자 휴대폰 번호를 입력해 주세요.');
      return;
    }

    if (!branchName.trim()) {
      setErrorMessage('사업소 또는 부서명을 입력해 주세요 (예: 부산사업소, 광주공장).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/share/to-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPhone: currentUser?.phoneNumber,
          senderBranch: branchName.trim(),
          receiverPhone: cleanPhone,
          projectName: currentProject.name,
          sheetName: currentSheet.name,
          headers: currentSheet.headers,
          rows: currentSheet.rows,
          originalFiles: currentProject.originalFiles,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 2200);
      } else {
        setErrorMessage(data.error || '공유 전송에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">본사 총괄 담당자에게 공유</h3>
              <p className="text-xs text-slate-500 font-medium">사업소별 시트 데이터를 본사 총괄 계정으로 전송</p>
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
          {successMessage ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900">공유 전송 완료!</h4>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleShareSubmit} className="space-y-4">
              {/* 사업소 / 지점명 입력 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  소속 사업소 / 지점명
                </label>
                <input
                  type="text"
                  placeholder="예: 강남사업소, 부산공장, 광주지사"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 text-sm font-semibold text-slate-800"
                  required
                />
              </div>

              {/* 공유할 시트 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  전송할 시트 선택 ({currentProject.sheets.length}개 중)
                </label>
                <select
                  value={selectedSheetIndex}
                  onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 text-xs font-semibold text-slate-700 bg-slate-50 cursor-pointer"
                >
                  {currentProject.sheets.map((sheet, idx) => (
                    <option key={idx} value={idx}>
                      {sheet.name} ({sheet.rows.length}개 행)
                    </option>
                  ))}
                </select>
              </div>

              {/* 총괄 담당자 휴대폰 번호 입력 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  수신 총괄 담당자 휴대폰 번호
                </label>
                <input
                  type="tel"
                  placeholder="010-1234-5678"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 font-mono text-sm tracking-wide text-slate-800"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  총괄 담당자가 본인 휴대폰으로 로그인 시 &apos;공유받은 시트&apos; 함에서 확인합니다.
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
                disabled={isSubmitting || !managerPhone}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? '시트 데이터 전송 중...' : '총괄 담당자에게 시트 공유하기'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
