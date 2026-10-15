'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, Download, AlertCircle, FileSpreadsheet, Layers } from 'lucide-react';
import { ProjectWorkspace, OriginalDocFile } from '@/types/workspace';

interface OriginalDocViewProps {
  project: ProjectWorkspace;
}

export function OriginalDocView({ project }: OriginalDocViewProps) {
  // 프로젝트 내 보관된 원본 증빙 파일 목록 도출 (단일 필드 호환)
  const files: OriginalDocFile[] =
    project.originalFiles && project.originalFiles.length > 0
      ? project.originalFiles
      : project.originalFileUrl
      ? [
          {
            name: project.name || '원본 문서',
            url: project.originalFileUrl,
            type: project.originalFileType,
            size: project.originalFileSize,
            uploadedAt: project.uploadedAt,
          },
        ]
      : [];

  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // 파일 목록이 바뀌거나 추가될 때 유효 인덱스 유지 (최신 파일 자동 포커스)
  useEffect(() => {
    if (files.length > 0) {
      setSelectedIdx(files.length - 1);
    }
  }, [files.length]);

  const currentFile = files[selectedIdx] || files[0] || null;
  const filename = currentFile?.name || '문서';
  const isImage =
    Boolean(currentFile?.type?.includes('image')) ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif'].some((ext) => filename.toLowerCase().endsWith(ext));
  const isPdf = Boolean(currentFile?.type?.includes('pdf')) || filename.toLowerCase().endsWith('.pdf');

  if (files.length === 0 || !currentFile) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50/50 min-h-[450px]">
        <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <span className="font-semibold text-slate-600">등록된 원본 증빙 파일이 없습니다.</span>
          <span className="mt-1">새 프로젝트를 생성하거나 파일을 업로드하면 원본 증빙이 여기에 자동 표시됩니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 flex flex-col items-center bg-slate-50/50 min-h-[450px] overflow-y-auto">
      <div className="flex flex-col items-center gap-4 max-w-4xl w-full">
        {/* 다중 원본 증빙 선택 탭 (2개 이상일 때 목록 칩 표시) */}
        {files.length > 1 && (
          <div className="w-full bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-2 shrink-0">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>증빙 목록 ({files.length}개):</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {files.map((file, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="max-w-[140px] truncate">{file.name}</span>
                    <span className="text-[10px] opacity-75">#{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between w-full pb-3 border-b border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-slate-900 font-bold">{filename}</span>
            {currentFile.size && (
              <span className="text-slate-400">({Math.round(currentFile.size / 1024)} KB)</span>
            )}
            {currentFile.uploadedAt && (
              <span className="text-slate-400 text-[11px] hidden sm:inline">| 등록: {currentFile.uploadedAt}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={currentFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold transition text-xs shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              새 탭에서 원본 열기
            </a>
            <a
              href={currentFile.url}
              download={filename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-semibold transition text-xs shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
            </a>
          </div>
        </div>

        {/* 원본 증빙 뷰어 본문 */}
        {isImage ? (
          <div className="relative border border-slate-200 rounded-2xl bg-white p-3 shadow-md overflow-hidden max-h-[550px] w-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentFile.url}
              alt="원본 증빙"
              className="object-contain max-h-[520px] w-auto rounded-lg"
            />
          </div>
        ) : isPdf ? (
          <div className="w-full h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-md">
            <iframe src={currentFile.url} className="w-full h-full border-none" title="PDF 증빙 뷰어" />
          </div>
        ) : (
          <div className="border border-slate-200 bg-white rounded-2xl p-8 text-center shadow-xs w-full">
            <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm mb-1">{filename}</h4>
            <p className="text-xs text-slate-500 mb-4">스프레드시트 원본 파일이 안전하게 보관되어 있습니다.</p>
            <a
              href={currentFile.url}
              download={filename}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              원본 파일 다운로드
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
