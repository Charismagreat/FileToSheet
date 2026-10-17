'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Download, Table, FileText, BarChart3, AlertCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { downloadWorkbook } from '@/lib/parser';
import { TableHeader } from '@/components/TableHeader';
import { SummaryView } from '@/components/SummaryView';

function SharedProjectContent() {
  const params = useParams();
  const token = params?.token as string;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [shareConfig, setShareConfig] = useState<any>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'table' | 'original' | 'summary'>('table');

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/share?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || '문서를 불러올 수 없습니다.');
        setShareConfig(data.shareConfig);
        const tabs = data.shareConfig.allowedTabs || ['table'];
        if (!tabs.includes('table') && tabs.length > 0) setActiveTab(tabs[0]);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>공유된 문서를 안전하게 불러오는 중입니다...</span>
        </div>
      </div>
    );
  }

  if (error || !shareConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-base font-bold text-slate-800 mb-1">문서를 열 수 없습니다</h2>
        <p className="text-xs text-slate-500 mb-4">{error || '유효하지 않거나 만료된 공유 링크입니다.'}</p>
        <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">홈으로 이동</a>
      </div>
    );
  }

  const currentSheet = shareConfig.sheets?.[activeSheetIdx] || shareConfig.sheets?.[0];
  const allowedTabs: string[] = shareConfig.allowedTabs || ['table', 'original', 'summary'];
  const sheetFiles = currentSheet?.originalFiles?.length > 0 ? currentSheet.originalFiles : (shareConfig.sheets?.length === 1 ? shareConfig.originalFiles : []);

  const handleDownload = () => {
    if (!shareConfig.sheets) return;
    downloadWorkbook(shareConfig.sheets, `FileToSheet_${shareConfig.projectName}.xlsx`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">FS</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{shareConfig.projectName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">읽기 전용</span>
            </div>
            <div className="text-[10px] text-slate-400">공유 일시: {shareConfig.createdAt}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {shareConfig.allowDownload && (
            <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">
              <Download className="w-3.5 h-3.5" />
              <span>.xlsx 다운로드</span>
            </button>
          )}
          <a href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs">
            <span>나도 써보기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-3 max-w-7xl w-full mx-auto">
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {shareConfig.sheets.length > 1 && (
            <div className="flex items-center gap-1 px-3 pt-2 border-b border-slate-200 bg-slate-100/50 overflow-x-auto">
              {shareConfig.sheets.map((s: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveSheetIdx(idx)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition border-t border-x ${
                    activeSheetIdx === idx ? 'bg-white border-slate-200 text-blue-700 shadow-2xs' : 'border-transparent text-slate-500 hover:bg-slate-200/50'
                  }`}
                >
                  {s.name} ({s.rows?.length || 0})
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              {allowedTabs.includes('table') && (
                <button onClick={() => setActiveTab('table')} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${activeTab === 'table' ? 'bg-white text-blue-700 shadow-xs border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                  <Table className="w-3.5 h-3.5" />
                  <span>표 데이터 ({currentSheet?.rows?.length || 0})</span>
                </button>
              )}
              {allowedTabs.includes('original') && (
                <button onClick={() => setActiveTab('original')} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${activeTab === 'original' ? 'bg-white text-blue-700 shadow-xs border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                  <FileText className="w-3.5 h-3.5" />
                  <span>원본 증빙 ({sheetFiles?.length || 0})</span>
                </button>
              )}
              {allowedTabs.includes('summary') && (
                <button onClick={() => setActiveTab('summary')} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${activeTab === 'summary' ? 'bg-white text-blue-700 shadow-xs border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>요약 통계</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {activeTab === 'table' && currentSheet && (
              <div className="overflow-auto max-h-[75vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <TableHeader
                    headers={currentSheet.headers}
                    editingHeaderIdx={null}
                    setEditingHeaderIdx={() => {}}
                    editingHeaderValue=""
                    setEditingHeaderValue={() => {}}
                    onSaveHeaderEdit={() => {}}
                    onDeleteColumn={() => {}}
                    onReorderColumns={() => {}}
                  />
                  <tbody className="divide-y divide-slate-100">
                    {currentSheet.rows.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2 text-center text-slate-400 border-r border-slate-200 font-mono text-[11px] bg-slate-50/50">{rIdx + 1}</td>
                        {currentSheet.headers.map((h: string, cIdx: number) => (
                          <td key={cIdx} className="px-3 py-2 border-r border-slate-200 text-slate-700 truncate max-w-[240px]">{String(row[h] ?? '')}</td>
                        ))}
                        <td className="w-12"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'original' && (
              <div className="p-6 text-center text-xs text-slate-500">
                {sheetFiles?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sheetFiles.map((file: any, fIdx: number) => (
                      <div key={fIdx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                        <span className="font-mono font-medium text-slate-700">{file.name}</span>
                        {file.url && (
                          <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">원본 열람</a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>현재 시트에 연결된 원본 증빙 파일이 없거나 공유에서 제외되었습니다.</span>
                )}
              </div>
            )}

            {activeTab === 'summary' && currentSheet && <SummaryView sheet={currentSheet} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SharedProjectViewer() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">불러오는 중...</div>}>
      <SharedProjectContent />
    </Suspense>
  );
}
