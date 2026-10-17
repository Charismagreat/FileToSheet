'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Check, Copy, ExternalLink, X, Table, FileText, BarChart3 } from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';
import { apiFetch } from '@/lib/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWorkspace | null;
}

export function ShareModal({ isOpen, onClose, project }: ShareModalProps) {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['table', 'original', 'summary']);
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (project) {
      setSelectedSheets(project.sheets.map((s) => s.name));
      setShareUrl('');
      setCopied(false);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const toggleSheet = (name: string) => {
    setSelectedSheets((prev) => prev.includes(name) ? (prev.length > 1 ? prev.filter((s) => s !== name) : prev) : [...prev, name]);
  };

  const toggleTab = (tab: string) => {
    setSelectedTabs((prev) => prev.includes(tab) ? (prev.length > 1 ? prev.filter((t) => t !== tab) : prev) : [...prev, tab]);
  };

  const handleCreateShareLink = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          allowedSheets: selectedSheets,
          allowedTabs: selectedTabs,
          allowDownload,
          sheets: project.sheets,
          originalFiles: project.originalFiles,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '공유 링크 생성 실패');
      setShareUrl(`${window.location.origin}${data.sharePath}`);
    } catch (e: any) {
      alert(`공유 링크 생성 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">프로젝트 선택적 공유</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        {/* 1. 공유할 시트 선택 */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">1. 공유할 시트(Sheet) 선택</label>
          <div className="flex flex-wrap gap-2">
            {project.sheets.map((sheet, idx) => {
              const isChecked = selectedSheets.includes(sheet.name);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleSheet(sheet.name)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                    isChecked ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300'}`}>
                    {isChecked && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>{sheet.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 노출할 탭 선택 */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">2. 열람 허용 탭 선택</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'table', label: '표 데이터', icon: Table },
              { id: 'original', label: '원본 증빙', icon: FileText },
              { id: 'summary', label: '요약 통계', icon: BarChart3 },
            ].map((tab) => {
              const isChecked = selectedTabs.includes(tab.id);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => toggleTab(tab.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                    isChecked ? 'bg-indigo-50/60 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-xs truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 다운로드 권한 */}
        <div className="mb-5 flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span className="text-slate-700 font-medium">수신자의 엑셀(.xlsx) 파일 다운로드 허용</span>
          <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
        </div>

        {/* 4. 링크 생성 및 결과 */}
        {shareUrl ? (
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
            <div className="text-xs font-bold text-blue-900 mb-1.5 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600" />
              <span>공유 링크가 생성되었습니다!</span>
            </div>
            <div className="flex gap-2">
              <input type="text" readOnly value={shareUrl} className="flex-1 bg-white border border-blue-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-mono truncate" />
              <button onClick={handleCopyLink} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨' : '복사'}</span>
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-white border border-blue-200 hover:bg-blue-100 rounded-lg text-blue-700 flex items-center justify-center shrink-0 transition" title="새 창에서 미리보기">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <button type="button" disabled={loading} onClick={handleCreateShareLink} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50">
            {loading ? '공유 링크 생성 중...' : '공유 링크 발급하기'}
          </button>
        )}
      </div>
    </div>
  );
}
