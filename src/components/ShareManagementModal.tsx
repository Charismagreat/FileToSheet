'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe, X, Copy, Check, ExternalLink, Trash2, Lock, Unlock,
  RefreshCw, Layers, Send, Link as LinkIcon, ShieldCheck, AlertCircle
} from 'lucide-react';
import { UserSession } from '@/types/workspace';

interface WebLinkShare {
  id: number;
  token: string;
  projectName: string;
  allowedSheets: string[];
  allowedTabs: string[];
  allowDownload: boolean;
  hasPassword: boolean;
  createdAt: string;
  shareUrl: string;
}

interface SentSheetShare {
  id: number;
  receiverPhone: string;
  senderBranch: string;
  projectName: string;
  sheetName: string;
  rowCount: number;
  sharedAt: string;
}

interface ShareManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
}

export function ShareManagementModal({
  isOpen,
  onClose,
  currentUser,
}: ShareManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'links' | 'sent'>('links');
  const [webLinks, setWebLinks] = useState<WebLinkShare[]>([]);
  const [sentSheets, setSentSheets] = useState<SentSheetShare[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // 공유 내역 조회
  const fetchShares = async () => {
    setLoading(true);
    try {
      const phoneParam = currentUser?.phoneNumber ? `?userPhone=${currentUser.phoneNumber}` : '';
      const res = await fetch(`/api/share/manage${phoneParam}`);
      const data = await res.json();
      if (data.success) {
        setWebLinks(data.webLinks || []);
        setSentSheets(data.sentSheets || []);
      }
    } catch (e) {
      console.error('공유 관리 데이터 조회 오류:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, currentUser?.phoneNumber]);

  // 공유 링크 파기 또는 보낸 시트 회수(삭제)
  const handleRevokeShare = async (id: number, typeLabel: string) => {
    if (!confirm(`이 ${typeLabel}을(를) 중단(회수)하시겠습니까?\n외부에서의 모든 접근이 즉시 차단됩니다.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/share/manage?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setWebLinks((prev) => prev.filter((item) => item.id !== id));
        setSentSheets((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(data.error || '공유 중단 처리에 실패했습니다.');
      }
    } catch (e) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  // 링크 복사
  const handleCopy = (shareUrl: string, id: number) => {
    const fullUrl = `${window.location.origin}${shareUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">공유 통합 관리 센터</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  총 {webLinks.length + sentSheets.length}건 활성
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                외부로 공유된 웹 링크와 전송된 시트를 한곳에서 확인하고 즉시 회수·중단합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchShares}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'links'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>웹 링크 공유 ({webLinks.length}건)</span>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sent'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>직접 보낸 시트 ({sentSheets.length}건)</span>
          </button>
        </div>

        {/* 바디 리스트 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* 1. 웹 링크 공유 목록 */}
          {activeTab === 'links' && (
            <>
              {webLinks.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                  <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">발급된 웹 공유 링크가 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    상단 헤더의 [링크 공유]를 통해 외부에 시트 열람 링크를 발급하면 여기에 표시됩니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {webLinks.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{item.projectName}</span>
                          {item.hasPassword ? (
                            <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                              <Lock className="w-3 h-3 text-amber-500" />
                              비밀번호 보호
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                              <Unlock className="w-3 h-3 text-slate-400" />
                              공개 링크
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>시트: <strong>{item.allowedSheets.join(', ') || '전체'}</strong></span>
                          <span>•</span>
                          <span>발급일시: <span className="font-mono">{item.createdAt}</span></span>
                        </div>
                      </div>

                      {/* 액션 버튼군 */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleCopy(item.shareUrl, item.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition flex items-center gap-1 active:scale-95"
                          title="링크 복사"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">복사됨!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>복사</span>
                            </>
                          )}
                        </button>

                        <a
                          href={item.shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition flex items-center gap-1"
                          title="공유 페이지 열기"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>열기</span>
                        </a>

                        <button
                          onClick={() => handleRevokeShare(item.id, '공유 링크')}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 transition flex items-center gap-1 active:scale-95"
                          title="공유 즉시 중단 및 링크 파기"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>공유 중단</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 2. 직접 보낸 시트 목록 */}
          {activeTab === 'sent' && (
            <>
              {sentSheets.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                  <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">직접 보낸 시트 내역이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    상단 헤더의 [시트 보내기]를 통해 상대방 휴대폰으로 시트를 전송하면 여기에 기록됩니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sentSheets.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-600 text-white">
                            {item.senderBranch || '발신'}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900">{item.sheetName}</span>
                          <span className="text-xs text-slate-500 font-mono">({item.rowCount}행)</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>받는 분: <strong className="font-mono text-slate-800">{item.receiverPhone}</strong></span>
                          <span>•</span>
                          <span>프로젝트: <strong>{item.projectName}</strong></span>
                          <span>•</span>
                          <span>전송일시: <span className="font-mono">{item.sharedAt}</span></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeShare(item.id, '보낸 시트')}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 transition flex items-center gap-1 active:scale-95 self-end sm:self-center"
                        title="상대방 수신함에서 회수 및 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>전송 회수</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
