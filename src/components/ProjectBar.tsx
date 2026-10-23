'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  isTeamMember?: boolean;
  allowedSheets?: string[];
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
  isTeamMember = false,
  allowedSheets,
}: ProjectBarProps) {
  if (projects.length === 0) return null;

  // 가로 스크롤 및 휠 인터랙션 제어
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // 드래그 앤 드롭 상태
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // 마우스 휠로 가로 스크롤
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // 활성 프로젝트 탭 자동 시야 확보
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeProjectIndex]);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200/90 pt-1.5 pb-0.5 select-none">
      {/* 🌟 좌측: 프로젝트 라벨 + 탭 목록 가로 스크롤 영역 */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
      >
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1.5 shrink-0 font-bold">
          <FolderOpen className="w-4 h-4 text-blue-600" />
          <span>프로젝트:</span>
        </div>

        {projects.map((proj, idx) => {
          // RBAC: 팀원 모드일 때 허용된 시트가 포함되지 않은 타 프로젝트는 완전히 숨김
          if (isTeamMember && allowedSheets && allowedSheets.length > 0) {
            const hasAllowedSheet = (proj.sheets || []).some((s) => allowedSheets.includes(s.name));
            if (!hasAllowedSheet) {
              return null;
            }
          }

          const isActive = activeProjectIndex === idx;
          const isRenaming = editingProjectIdx === idx;
          const displayName = proj.name || '새 프로젝트';

          return (
            <div
              key={idx}
              ref={isActive ? activeTabRef : null}
              draggable={!isRenaming && !isTeamMember}
              onDragStart={(e) => {
                if (isTeamMember) return;
                e.dataTransfer.setData('text/plain', String(idx));
                e.dataTransfer.effectAllowed = 'move';
                setDraggingIdx(idx);
              }}
              onDragOver={(e) => {
                if (isTeamMember) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIdx !== idx) setDragOverIdx(idx);
              }}
              onDragLeave={() => {
                if (dragOverIdx === idx) setDragOverIdx(null);
              }}
              onDrop={(e) => {
                if (isTeamMember) return;
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
              className={`group flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-bold cursor-pointer transition shrink-0 whitespace-nowrap border ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border-transparent'
              } ${draggingIdx === idx ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''} ${
                dragOverIdx === idx && draggingIdx !== idx ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-100/90' : ''
              }`}
            >
              {/* 드래그 힌트 그립 아이콘 (소유자만) */}
              {projects.length > 1 && !isRenaming && !isTeamMember && (
                <GripVertical
                  className={`w-2.5 h-2.5 opacity-0 group-hover:opacity-60 cursor-grab shrink-0 -ml-1 transition ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
              )}

              <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />

              {isRenaming && !isTeamMember ? (
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
                  className="bg-white text-slate-900 px-1.5 py-0.5 rounded text-xs w-32 focus:outline-none ring-1 ring-blue-400"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    if (isTeamMember) return;
                    e.stopPropagation();
                    setEditingProjectIdx(idx);
                    setEditingProjectName(displayName);
                  }}
                  title={isTeamMember ? displayName : `${displayName} (더블클릭하여 프로젝트 이름 변경)`}
                  className="max-w-[160px] truncate inline-block"
                >
                  {displayName}
                </span>
              )}

              {/* 닫기 버튼 (팀원은 삭제 불가) */}
              {projects.length > 1 && !isTeamMember && (
                <button
                  type="button"
                  onClick={(e) => onCloseProject(idx, e)}
                  className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition ml-0.5"
                  title="프로젝트 닫기"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 🌟 우측: 새 프로젝트 추가 버튼 (팀원은 프로젝트 추가 불가) */}
      {!isTeamMember && (
        <button
          type="button"
          onClick={onAddNewProject}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 px-2.5 h-8 rounded-lg hover:bg-slate-100 border border-slate-200 shrink-0 whitespace-nowrap transition cursor-pointer active:scale-95"
          title="새 빈 프로젝트 추가"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>새 프로젝트</span>
        </button>
      )}
    </div>
  );
}
