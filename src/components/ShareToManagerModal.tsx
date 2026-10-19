'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import {
  Building2, X, Send, CheckCircle, AlertCircle, Smartphone, Layers,
  Trash2, RefreshCw, Plus, Clock, Search, ArrowRight, Check
} from 'lucide-react';
import { ProjectWorkspace, UserSession } from '@/types/workspace';

interface SentSheetItem {
  id: number;
  receiverPhone: string;
  senderBranch: string;
  projectName: string;
  sheetName: string;
  rowCount: number;
  sharedAt: string;
}

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
  const [activeTab, setActiveTab] = useState<'list' | 'send'>('list');
  const [sentList, setSentList] = useState<SentSheetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 전송 폼 상태
  const [branchName, setBranchName] = useState('본사/사업소');
  const [managerPhone, setManagerPhone] = useState('');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(
    currentProject?.activeSheetIndex || 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. 내가 보낸 시트 내역 조회
  const fetchSentSheets = async () => {
    if (!currentUser?.phoneNumber) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/share/manage?userPhone=${currentUser.phoneNumber}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sentSheets)) {
        setSentList(data.sentSheets);
      }
    } catch (e) {
      console.error('보낸 시트함 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSentSheets();
      setActiveTab('list');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, currentUser?.phoneNumber]);

  if (!isOpen) return null;

  const currentSheet = currentProject?.sheets[selectedSheetIndex] || currentProject?.sheets[0];

  // 2. 보낸 시트 회수(삭제)
  const handleRevokeSent = async (id: number) => {
    if (!confirm('이 시트 전송을 회수(취소)하시겠습니까?\n상대방의 받은 시트함에서도 즉시 삭제됩니다.')) {
      return;
    }
    try {
      const res = await apiFetch(`/api/share/manage?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSentList((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(data.error || '회수 처리에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  // 3. 새 시트 전송 처리
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !currentSheet) {
      setErrorMessage('전송할 프로젝트 또는 시트 데이터가 없습니다.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = managerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || !cleanPhone.startsWith('010')) {
      setErrorMessage('올바른 010 수신 담당자 휴대폰 번호를 입력해 주세요.');
      return;
    }

    if (!branchName.trim()) {
      setErrorMessage('사업소 또는 부서명을 입력해 주세요 (예: 부산사업소, 영업팀).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/share/to-manager', {
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
        setSuccessMessage('성공적으로 전송되었습니다!');
        fetchSentSheets();
        setTimeout(() => {
          setSuccessMessage('');
          setActiveTab('list');
          setManagerPhone('');
        }, 1200);
      } else {
        setErrorMessage(data.error || '공유 전송에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 검색 필터링
  const filteredList = sentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.receiverPhone.includes(q) ||
      item.projectName.toLowerCase().includes(q) ||
      item.sheetName.toLowerCase().includes(q) ||
      (item.senderBranch && item.senderBranch.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden relative">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">보낸 시트함</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  총 {sentList.length}건 발송
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                다른 담당자에게 전송한 시트 내역을 관리하고, 새 시트를 직접 전송합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSentSheets}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>보낸 내역 목록 ({sentList.length}건)</span>
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'send'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 시트 보내기</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="pb-2 flex items-center">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="수신번호/시트명 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg w-40 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 바디 영역 */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 🌟 1. 보낸 내역 목록 탭 */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {filteredList.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                  <Send className="w-9 h-9 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">보낸 시트 내역이 없습니다.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      상단의 [새 시트 보내기] 탭을 눌러 다른 담당자의 휴대폰 번호로 시트를 전송해 보세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('send')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 시트 전송하기</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredList.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
                            {item.senderBranch || '발신'}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            {item.sheetName}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({item.rowCount}행)
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>
                            받는 분: <strong className="font-mono text-slate-800">{item.receiverPhone}</strong>
                          </span>
                          <span>•</span>
                          <span>프로젝트: <strong>{item.projectName}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{item.sharedAt}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeSent(item.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 transition flex items-center gap-1 active:scale-95 self-end sm:self-center shrink-0 cursor-pointer"
                        title="상대방의 받은 시트함에서도 삭제하고 전송을 회수합니다"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>전송 회수</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🌟 2. 새 시트 보내기 탭 */}
          {activeTab === 'send' && (
            <div className="max-w-xl mx-auto space-y-4">
              {!currentProject ? (
                <div className="p-8 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                  현재 열려 있는 프로젝트가 없습니다. 먼저 프로젝트와 시트를 열어주세요.
                </div>
              ) : (
                <form onSubmit={handleShareSubmit} className="space-y-4">
                  {/* 프로젝트 및 시트 안내 카드 */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">대상 프로젝트:</span>
                      <span className="font-bold text-slate-800">{currentProject.name}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">전송할 시트 선택:</span>
                      <select
                        value={selectedSheetIndex}
                        onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
                        className="bg-white border border-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                      >
                        {currentProject.sheets.map((s, idx) => (
                          <option key={idx} value={idx}>
                            {s.name} ({s.rows?.length || 0}행)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 발신 소속/부서명 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>발신 사업소 / 부서명</span>
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="예: 부산사업소, 생산관리팀"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 font-medium"
                      required
                    />
                  </div>

                  {/* 수신자 전화번호 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      <span>받는 분(담당자) 휴대폰 번호</span>
                    </label>
                    <input
                      type="tel"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 font-mono"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      ※ 수신자의 FileToSheet [받은 시트함]에 즉시 도착합니다.
                    </p>
                  </div>

                  {/* 결과 메시지 */}
                  {errorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* 전송 버튼 */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? '전송 중...' : '시트 전송하기'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
