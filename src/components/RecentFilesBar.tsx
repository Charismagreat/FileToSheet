'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';

interface RecentFilesBarProps {
  recentFiles: any[];
  projects: ProjectWorkspace[];
  onSelectRecentFile: (file: any) => void;
}

export function RecentFilesBar({
  recentFiles,
  projects,
  onSelectRecentFile,
}: RecentFilesBarProps) {
  if (recentFiles.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-600">
      <span className="text-slate-400 shrink-0 font-medium text-[11px]">이지데스크 My DB 보관 파일:</span>
      {recentFiles.map((f) => {
        const isAlreadyOpen = projects.some((p) => p.id === f.id || p.name === f.filename);
        return (
          <button
            key={f.id}
            onClick={() => onSelectRecentFile(f)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 border shrink-0 transition shadow-2xs font-medium ${
              isAlreadyOpen
                ? 'bg-blue-50/80 border-blue-200 text-blue-800'
                : 'bg-white hover:bg-slate-100 border-slate-200'
            }`}
          >
            <FileText className={`w-3 h-3 ${isAlreadyOpen ? 'text-blue-600' : 'text-slate-400'}`} />
            <span className="max-w-[140px] truncate">{f.filename}</span>
            <span className="text-[10px] text-slate-400">({f.category || '일반'})</span>
          </button>
        );
      })}
    </div>
  );
}
