'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, Download, AlertCircle, FileSpreadsheet, Layers, Maximize2, Minimize2, Trash2, Sparkles, Loader2, Database, ChevronUp, ChevronDown, ArrowRight, Table as TableIcon } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ReexamineModal } from './ReexamineModal';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';
import { getSheetOriginalFiles } from '@/lib/sheet-helpers';
import { DeleteProofModal } from './DeleteProofModal';

interface OriginalDocViewProps {
  project: ProjectWorkspace;
  onDeleteFile?: (fileIdx: number, deleteDataRows: boolean, targetDoc?: OriginalDocFile) => void;
  onGoToTableTab?: () => void;
  onApplyCorrection?: (
    targetFileName: string,
    correctedRows: Record<string, any>[],
    suggestedRule?: string,
    learnRule?: boolean
  ) => Promise<void> | void;
  filteredRows?: Record<string, any>[];
  isFiltered?: boolean;
}

export function OriginalDocView({ project, onDeleteFile, onGoToTableTab, onApplyCorrection, filteredRows, isFiltered = false }: OriginalDocViewProps) {
  const currentSheet = project.sheets[project.activeSheetIndex] || null;
  const files: OriginalDocFile[] = getSheetOriginalFiles(project, currentSheet);

  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isZoomFit, setIsZoomFit] = useState<boolean>(true);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [dockSize, setDockSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showReexamineModal, setShowReexamineModal] = useState<boolean>(false);
  const [reexamineData, setReexamineData] = useState<any>(null);

  useEffect(() => {
    if (files.length > 0 && selectedIdx >= files.length) {
      setSelectedIdx(Math.max(0, files.length - 1));
    }
  }, [files.length, selectedIdx]);

  const currentFile = files[selectedIdx] || files[0] || null;
  const filename = currentFile?.name || '문서';
  const isImage = Boolean(currentFile?.type?.includes('image')) || ['png', 'jpg', 'jpeg', 'webp', 'gif'].some((ext) => filename.toLowerCase().endsWith(ext));
  const isPdf = Boolean(currentFile?.type?.includes('pdf')) || filename.toLowerCase().endsWith('.pdf');

  // 🌟 파일 영구 접근 URL 결정 (Base64 캐시 -> 이지데스크 영구 서빙 API -> 세션 blob URL 순서)
  const resolvedFileUrl =
    currentFile?.dataUrl ||
    (currentFile?.id && !isNaN(Number(currentFile.id)) && Number(currentFile.id) > 0 ? `/api/files/${currentFile.id}` : null) ||
    currentFile?.url ||
    '';

  // 현재 선택된 파일에서 적재된 데이터 행 필터링
  const loadedRows = currentSheet?.rows.filter((r) => {
    if (r._fileName && currentFile?.name) return r._fileName === currentFile.name;
    if (r._fileId && currentFile?.id) return r._fileId === currentFile.id;
    return files.length === 1;
  }) || [];


  const handleReexamine = async () => {
    if (!currentFile || !currentSheet) return;
    setIsAnalyzing(true);
    try {
      let base64 = currentFile.dataUrl || '';
      if (!base64 && resolvedFileUrl) {
        try {
          const res = await fetch(resolvedFileUrl);
          const blob = await res.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          console.warn('파일 바이너리 변환 실패:', fetchErr);
        }
      }

      if (!base64) {
        alert('원본 파일의 이미지 데이터를 불러올 수 없습니다. 다시 시도해 주세요.');
        return;
      }

      const res = await apiFetch('/api/audit/reexamine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: currentFile.type || 'image/jpeg',
          fileName: currentFile.name,
          sheetName: currentSheet.name,
          headers: currentSheet.headers,
          currentRows: loadedRows,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '재검토 분석에 실패했습니다.');
      }

      setReexamineData(json.data);
      setShowReexamineModal(true);
    } catch (err: any) {
      console.error('재검토 오류:', err);
      alert(err.message || '재검토 요청 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteConfirm = (deleteDataRows: boolean) => {
    if (deletingIdx !== null && onDeleteFile) {
      onDeleteFile(deletingIdx, deleteDataRows, files[deletingIdx]);
    }
    setDeletingIdx(null);
  };

  if (files.length === 0 || !currentFile) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50/50 min-h-[500px]">
        <AlertCircle className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
        <span className="font-semibold text-slate-600 text-xs">등록된 원본 증빙 파일이 없습니다.</span>
        <span className="mt-1 text-slate-400 text-xs">파일을 업로드하면 원본 증빙이 여기에 자동 표시됩니다.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-[440px] h-[calc(100vh-290px)] overflow-hidden">
      {/* 1. 좌측 사이드바: 세로 파일 목록 및 각 파일별 적재 행수 뱃지 */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate mr-2">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{currentSheet?.name ? `증빙 (${currentSheet.name})` : '증빙 목록'}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono shrink-0">{files.length}개</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {files.map((file, idx) => {
            const isSelected = selectedIdx === idx;
            const totalCount = currentSheet?.rows.filter((r) => (r._fileName && file.name ? r._fileName === file.name : files.length === 1)).length || 0;
            const matchedCount = isFiltered && filteredRows
              ? filteredRows.filter((r) => (r._fileName && file.name ? r._fileName === file.name : files.length === 1)).length
              : null;

            return (
              <div
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1 cursor-pointer group ${
                  isSelected ? 'bg-blue-50/90 border-blue-400 text-blue-900 shadow-2xs ring-1 ring-blue-300' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold truncate" title={file.name}>{file.name}</span>
                  </div>
                  {onDeleteFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingIdx(idx); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition shrink-0"
                      title="증빙 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pl-0.5">
                  {isFiltered && matchedCount !== null ? (
                    <span className={`px-1.5 py-0.2 rounded font-medium text-[10px] ${
                      matchedCount > 0 ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-400'
                    }`}>
                      필터 {matchedCount}행 / 전체 {totalCount}행
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px]">
                      적재 {totalCount}행
                    </span>
                  )}
                  {file.uploadedAt && <span className="text-[10px] truncate">{file.uploadedAt.split(' ')[0]}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 2. 우측 메인 영역: 원본 증빙 뷰어 및 적재 데이터 보기 버튼 */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-100/60">
        <div className="h-11 px-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-800 truncate max-w-xs" title={filename}>{filename}</span>
            {currentFile.size && <span className="text-slate-400 text-[11px] shrink-0">({Math.round(currentFile.size / 1024)} KB)</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* AI 정밀 1:1 재검토 버튼 */}
            <button
              onClick={handleReexamine}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              title="AI가 원본과 적재 데이터를 1:1 정밀 대조하여 무엇이 문제인지 분석 보고서와 올바른 정정 데이터를 제안합니다."
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 대조 분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>재검토</span>
                </>
              )}
            </button>


            {isImage && (
              <button
                onClick={() => setIsZoomFit(!isZoomFit)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                title={isZoomFit ? '원본 크기로 보기' : '화면 맞춤'}
              >
                {isZoomFit ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            )}
            <a href={resolvedFileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-2xs">
              <ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">새 탭</span>
            </a>
            <a href={resolvedFileUrl} download={filename} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs">
              <Download className="w-3.5 h-3.5" /><span>다운로드</span>
            </a>
            {onDeleteFile && (
              <button onClick={() => setDeletingIdx(selectedIdx)} className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="삭제">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className={`flex-1 overflow-auto p-3 flex items-center justify-center relative min-h-0 transition-all ${isDockCollapsed ? 'pb-12' : 'pb-[230px]'}`}>

          {isImage ? (
            <div className={`flex items-center justify-center ${isZoomFit ? 'w-full h-full' : 'min-w-full min-h-full'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedFileUrl}
                alt="원본 증빙"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (currentFile?.id && !target.src.includes(`/api/files/${currentFile.id}`)) {
                    target.src = `/api/files/${currentFile.id}`;
                  } else if (currentFile?.dataUrl && target.src !== currentFile.dataUrl) {
                    target.src = currentFile.dataUrl;
                  }
                }}
                className={`rounded-lg shadow-sm transition-all duration-150 ${isZoomFit ? 'max-w-full max-h-full object-contain' : 'max-w-none w-auto h-auto'}`}
              />
            </div>
          ) : isPdf ? (
            <iframe src={resolvedFileUrl} className="w-full h-full border-none rounded-lg bg-white shadow-xs" title="PDF 증빙 뷰어" />
          ) : (
            <div className="border border-slate-200 bg-white rounded-2xl p-8 text-center shadow-xs max-w-md mx-auto my-auto">
              <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-sm mb-1">{filename}</h4>
              <p className="text-xs text-slate-500 mb-4">스프레드시트 원본 파일이 보관되어 있습니다.</p>
              <a href={resolvedFileUrl} download={filename} className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition">
                <Download className="w-3.5 h-3.5" /> 원본 파일 다운로드
              </a>
            </div>
          )}
        </div>
        {/* 🌟 3. 하단 플로팅 데이터 독: 원본 이미지 위를 100% 가로폭으로 덮으며 플로팅 (Floating Overlay) */}
        <div
          className={`absolute bottom-0 left-0 right-0 w-full z-30 border-t border-slate-300/80 bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.14)] transition-all duration-200 flex flex-col ${
            isDockCollapsed
              ? 'h-9'
              : dockSize === 'sm'
              ? 'h-[160px]'
              : dockSize === 'lg'
              ? 'h-[320px]'
              : 'h-[220px]'
          }`}
        >
          {/* 독 상단 헤더 바 (원클릭 접기/펼치기) */}
          <div
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="h-9 px-3.5 bg-slate-50 hover:bg-slate-100/90 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none shrink-0 text-xs transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold text-slate-800">적재 데이터</span>
              <span className="px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-bold font-mono text-[11px] shrink-0">
                {loadedRows.length}행
              </span>
              <span className="text-slate-400 text-[11px] truncate hidden sm:inline">
                · {filename}
              </span>
              {onGoToTableTab && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToTableTab();
                  }}
                  className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0"
                >
                  <span>표 탭 전체보기</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isDockCollapsed && (
                <div className="flex items-center gap-1 mr-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setDockSize('sm')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                      dockSize === 'sm' ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                    }`}
                    title="컴팩트 높이 (140px)"
                  >
                    소
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockSize('md')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                      dockSize === 'md' ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                    }`}
                    title="기본 높이 (190px)"
                  >
                    중
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockSize('lg')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                      dockSize === 'lg' ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                    }`}
                    title="확장 높이 (280px)"
                  >
                    대
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDockCollapsed(!isDockCollapsed);
                }}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition"
                title={isDockCollapsed ? '적재 데이터 표 펼치기' : '적재 데이터 표 접기'}
              >
                {isDockCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 독 본문: 데이터 테이블 (가로/세로 독립 스크롤) */}
          {!isDockCollapsed && (
            <div className="flex-1 overflow-auto bg-slate-50/30">
              {loadedRows.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs p-4 min-h-[100px]">
                  <TableIcon className="w-6 h-6 mb-1 opacity-40 text-slate-400" />
                  <p className="font-semibold text-slate-600">이 증빙 파일에서 추출·적재된 데이터가 없습니다.</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    상단의 [🔍 재검토]를 누르면 AI가 원본을 재분석하여 정정 데이터를 제안합니다.
                  </p>
                </div>
              ) : (
                <div className="min-w-full inline-block align-middle">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 select-none shadow-2xs">
                      <tr>
                        <th className="w-12 px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200 bg-slate-100">
                          #
                        </th>
                        {(currentSheet?.headers || [])
                          .filter((h) => !h.startsWith('_'))
                          .map((header, idx) => (
                            <th
                              key={idx}
                              className="px-3.5 py-2 border-r border-slate-200 whitespace-nowrap bg-slate-100 tracking-wide font-bold"
                            >
                              {header}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans bg-white">
                      {loadedRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-blue-50/60 transition group">
                          <td className="px-3 py-2 text-center font-mono text-slate-400 text-[11px] border-r border-slate-100 bg-slate-50/50 group-hover:bg-blue-50/30">
                            {rowIdx + 1}
                          </td>
                          {(currentSheet?.headers || [])
                            .filter((h) => !h.startsWith('_'))
                            .map((header, colIdx) => {
                              const val = row[header];
                              const isNum = typeof val === 'number';
                              return (
                                <td
                                  key={colIdx}
                                  className={`px-3.5 py-2 border-r border-slate-100 whitespace-nowrap text-slate-700 text-xs ${
                                    isNum ? 'text-right font-mono' : ''
                                  }`}
                                >
                                  {val !== undefined && val !== null ? (
                                    isNum ? Number(val).toLocaleString() : String(val)
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 모달 1: 증빙 삭제 시 데이터 유지 여부 선택 */}
      <DeleteProofModal
        show={deletingIdx !== null}
        fileName={deletingIdx !== null ? (files[deletingIdx]?.name || '문서') : ''}
        onClose={() => setDeletingIdx(null)}
        onConfirmDelete={handleDeleteConfirm}
      />



      {/* 모달 3: AI 정밀 1:1 재검토 진단 보고서 및 정정 승인 모달 */}
      <ReexamineModal
        show={showReexamineModal}
        onClose={() => setShowReexamineModal(false)}
        fileName={filename}
        sheetName={currentSheet?.name || ''}
        report={reexamineData}
        headers={currentSheet?.headers || []}
        onApplyCorrection={async (correctedRows, suggestedRule, learnRule) => {
          if (onApplyCorrection) {
            await onApplyCorrection(filename, correctedRows, suggestedRule, learnRule);
          }
          setShowReexamineModal(false);
          alert('정정 내역이 성공적으로 시트에 반영되었습니다.');
        }}
      />
    </div>
  );
}
