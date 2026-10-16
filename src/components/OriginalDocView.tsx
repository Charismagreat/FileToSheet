'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, Download, AlertCircle, FileSpreadsheet, Layers, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';
import { DeleteProofModal } from './DeleteProofModal';

interface OriginalDocViewProps {
  project: ProjectWorkspace;
  onDeleteFile?: (fileIdx: number, deleteDataRows: boolean) => void;
}

export function OriginalDocView({ project, onDeleteFile }: OriginalDocViewProps) {
  const files: OriginalDocFile[] =
    project.originalFiles && project.originalFiles.length > 0
      ? project.originalFiles
      : project.originalFileUrl
      ? [{ name: project.name || '원본 문서', url: project.originalFileUrl, type: project.originalFileType, size: project.originalFileSize, uploadedAt: project.uploadedAt }]
      : [];

  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isZoomFit, setIsZoomFit] = useState<boolean>(true);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (files.length > 0 && selectedIdx >= files.length) {
      setSelectedIdx(Math.max(0, files.length - 1));
    }
  }, [files.length, selectedIdx]);

  const currentFile = files[selectedIdx] || files[0] || null;
  const filename = currentFile?.name || '문서';
  const isImage = Boolean(currentFile?.type?.includes('image')) || ['png', 'jpg', 'jpeg', 'webp', 'gif'].some((ext) => filename.toLowerCase().endsWith(ext));
  const isPdf = Boolean(currentFile?.type?.includes('pdf')) || filename.toLowerCase().endsWith('.pdf');

  const handleDeleteConfirm = (deleteDataRows: boolean) => {
    if (deletingIdx !== null && onDeleteFile) {
      onDeleteFile(deletingIdx, deleteDataRows);
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
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-[600px] h-[calc(100vh-210px)] overflow-hidden">
      {/* 1. 좌측 사이드바: 세로 방향 파일 목록 나열 */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>증빙 목록</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">{files.length}개</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {files.map((file, idx) => {
            const isSelected = selectedIdx === idx;
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
                  <span>{file.size ? `${Math.round(file.size / 1024)} KB` : '증빙 파일'}</span>
                  {file.uploadedAt && <span className="text-[10px] truncate">{file.uploadedAt.split(' ')[0]}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 2. 우측 메인 영역: 원본 증빙 뷰어 공간 최대화 */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-100/60">
        <div className="h-11 px-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-800 truncate max-w-xs sm:max-w-md" title={filename}>{filename}</span>
            {currentFile.size && <span className="text-slate-400 text-[11px] shrink-0">({Math.round(currentFile.size / 1024)} KB)</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <button
                onClick={() => setIsZoomFit(!isZoomFit)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                title={isZoomFit ? '원본 크기로 보기' : '화면 맞춤'}
              >
                {isZoomFit ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isZoomFit ? '원본 크기' : '화면 맞춤'}</span>
              </button>
            )}
            <a href={currentFile.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-2xs">
              <ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">새 탭 열기</span>
            </a>
            <a href={currentFile.url} download={filename} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs">
              <Download className="w-3.5 h-3.5" /><span>다운로드</span>
            </a>
            {onDeleteFile && (
              <button
                onClick={() => setDeletingIdx(selectedIdx)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                title="이 원본 증빙 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">삭제</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 flex items-center justify-center relative min-h-0">
          {isImage ? (
            <div className={`flex items-center justify-center ${isZoomFit ? 'w-full h-full' : 'min-w-full min-h-full'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentFile.url} alt="원본 증빙" className={`rounded-lg shadow-sm transition-all duration-150 ${isZoomFit ? 'max-w-full max-h-full object-contain' : 'max-w-none w-auto h-auto'}`} />
            </div>
          ) : isPdf ? (
            <iframe src={currentFile.url} className="w-full h-full border-none rounded-lg bg-white shadow-xs" title="PDF 증빙 뷰어" />
          ) : (
            <div className="border border-slate-200 bg-white rounded-2xl p-8 text-center shadow-xs max-w-md mx-auto my-auto">
              <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-sm mb-1">{filename}</h4>
              <p className="text-xs text-slate-500 mb-4">스프레드시트 원본 파일이 보관되어 있습니다.</p>
              <a href={currentFile.url} download={filename} className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition">
                <Download className="w-3.5 h-3.5" /> 원본 파일 다운로드
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 증빙 삭제 시 데이터 유지 여부 선택 모달 */}
      <DeleteProofModal
        show={deletingIdx !== null}
        fileName={deletingIdx !== null ? (files[deletingIdx]?.name || '문서') : ''}
        onClose={() => setDeletingIdx(null)}
        onConfirmDelete={handleDeleteConfirm}
      />
    </div>
  );
}
