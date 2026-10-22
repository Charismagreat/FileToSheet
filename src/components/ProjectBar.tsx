'use client';

import React, { useState } from 'react';
import { FolderOpen, FolderPlus, X, GripVertical } from 'lucide-react';
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
  onReorderProjects?: (fromIdx: number, toIdx: number) => void;
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
  onReorderProjects,
}: ProjectBarProps) {
  if (projects.length === 0) return null;

  // 드래그 앤 드롭 상태
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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
              draggable={!isRenaming}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(idx));
                e.dataTransfer.effectAllowed = 'move';
                setDraggingIdx(idx);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIdx !== idx) setDragOverIdx(idx);
              }}
              onDragLeave={() => {
                if (dragOverIdx === idx) setDragOverIdx(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                if (!isNaN(fromIdx) && fromIdx !== idx && onReorderProjects) {
                  onReorderProjects(fromIdx, idx);
                }
                setDraggingIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDraggingIdx(null);
                setDragOverIdx(null);
              }}
              onClick={() => setActiveProjectIndex(idx)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-semibold cursor-pointer border transition select-none ${
                isActive
                  ? 'bg-white border-slate-300 border-b-transparent text-blue-700 shadow-xs'
                  : 'bg-slate-100/70 hover:bg-slate-200/70 border-slate-200 text-slate-600'
              } ${draggingIdx === idx ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''} ${
                dragOverIdx === idx && draggingIdx !== idx ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50/90' : ''
              }`}
              title="드래그하여 프로젝트 순서 변경 가능"
            >
              {/* 드래그 힌트 그립 아이콘 */}
              {projects.length > 1 && !isRenaming && (
                <GripVertical
                  className={`w-2.5 h-2.5 opacity-0 group-hover:opacity-60 cursor-grab shrink-0 -ml-1 transition ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
              )}

              <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />

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
                  className="max-w-[200px] truncate"
                >
                  {displayName}
                </span>
              )}



              <button
                onClick={(e) => onCloseProject(idx, e)}
                className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition ml-0.5"
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
