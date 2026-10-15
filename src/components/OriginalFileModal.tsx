'use client';

import React from 'react';
import { FileText, Download, X, FileSpreadsheet } from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';

interface OriginalFileModalProps {
  show: boolean;
  onClose: () => void;
  project: ProjectWorkspace | null;
}

export function OriginalFileModal({
  show,
  onClose,
  project,
}: OriginalFileModalProps) {
  if (!show || !project) return null;

  const filename = project.name || '파일';
  const isImage =
    Boolean(project.originalFileType?.includes('image')) ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif'].some((ext) => filename.toLowerCase().endsWith(ext));
  const isPdf = filename.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-w-4xl w-full max-h-[85vh] overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm text-slate-800">{filename}</span>
            <span className="text-xs text-slate-400 font-mono">
              {project.originalFileSize ? `(${(project.originalFileSize / 1024).toFixed(1)} KB)` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {project.originalFileUrl && (
              <a
                href={project.originalFileUrl}
                download={filename}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg transition"
              >
                <Download className="w-3 h-3" />
                다운로드
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/60">
          {project.originalFileUrl && isImage ? (
            <div className="max-w-full max-h-full flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.originalFileUrl}
                alt={filename}
                className="max-h-[65vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
              />
              <span className="text-[11px] text-slate-500 mt-2">
                💡 표 데이터와 원본 영수증/전표 이미지를 실시간 대조하여 검수하실 수 있습니다.
              </span>
            </div>
          ) : project.originalFileUrl && isPdf ? (
            <div className="w-full h-[65vh] flex flex-col items-center justify-center">
              <iframe
                src={project.originalFileUrl}
                title={filename}
                className="w-full h-full rounded-xl border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mb-2" />
              <span className="font-semibold text-slate-700 text-sm">{filename}</span>
              <span className="text-xs text-slate-400 mt-1">엑셀/스프레드시트 원본 파일입니다.</span>
              {project.originalFileUrl && (
                <a
                  href={project.originalFileUrl}
                  download={filename}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  원본 파일 다운로드
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
