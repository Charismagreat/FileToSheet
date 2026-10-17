'use client';

import React from 'react';
import { FolderOpen, FolderPlus, X } from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';

interface ProjectBarProps {
  projects: ProjectWorkspace[];
  activeProjectIndex: number;
  setActiveProjectIndex: (idx: number) => void;
  editingProjectIdx: number | null;
  setEditingProjectIdx: (idx: number | null) => void;
  editingProjectName: string;
  setEditingProjectName: (name: string) => void;
  onSaveProjectName: () => void;
  onAddNewProject: () => void;
  onCloseProject: (idx: number, e: React.MouseEvent) => void;
}

export function ProjectBar({
  projects = [],
  activeProjectIndex,
  setActiveProjectIndex,
  editingProjectIdx,
  setEditingProjectIdx,
  editingProjectName,
  setEditingProjectName,
  onSaveProjectName,
  onAddNewProject,
  onCloseProject,
}: ProjectBarProps) {
  if (projects.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-200/90 pt-1">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2 shrink-0 font-bold">
          <FolderOpen className="w-4 h-4 text-blue-600" />
          <span>프로젝트:</span>
        </div>
        {projects.map((proj, idx) => {
          const isActive = activeProjectIndex === idx;
          const isRenaming = editingProjectIdx === idx;
          const displayName = proj.name || '새 프로젝트';

          return (
            <div
              key={idx}
              onClick={() => setActiveProjectIndex(idx)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-semibold cursor-pointer border transition ${
                isActive
                  ? 'bg-white border-slate-300 border-b-transparent text-blue-700 shadow-xs'
                  : 'bg-slate-100/70 hover:bg-slate-200/70 border-slate-200 text-slate-600'
              }`}
            >
              <FolderOpen className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {isRenaming ? (
                <input
                  autoFocus
                  type="text"
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onBlur={onSaveProjectName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveProjectName();
                    if (e.key === 'Escape') setEditingProjectIdx(null);
                  }}
                  className="bg-white text-slate-900 px-1 py-0.5 rounded text-xs w-32 focus:outline-none border border-blue-400"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingProjectIdx(idx);
                    setEditingProjectName(displayName);
                  }}
                  title="더블클릭하여 프로젝트 이름 변경"
                  className="max-w-[220px] truncate"
                >
                  {displayName}
                </span>
              )}
              <button
                onClick={(e) => onCloseProject(idx, e)}
                className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                title="프로젝트 닫기"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={onAddNewProject}
        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 border border-slate-200 shrink-0 transition"
        title="새 빈 프로젝트 추가"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        <span>새 프로젝트</span>
      </button>
    </div>
  );
}
