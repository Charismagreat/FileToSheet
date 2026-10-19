'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Link2,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  ArrowLeftRight,
  RotateCcw,
} from 'lucide-react';
import { SheetRelation } from '@/lib/parser';

interface TableHeaderProps {
  headers: string[];
  relations?: SheetRelation[];
  editingHeaderIdx: number | null;
  setEditingHeaderIdx: (idx: number | null) => void;
  editingHeaderValue: string;
  setEditingHeaderValue: (val: string) => void;
  onSaveHeaderEdit: () => void;
  onDeleteColumn: (header: string) => void;
  onReorderColumns: (fromIdx: number, toIdx: number) => void;
  sortCol?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  onToggleColSort?: (header: string) => void;
  onSetColSort?: (header: string, dir: 'asc' | 'desc' | null) => void;
  colWidths?: Record<string, number>;
  onColWidthChange?: (header: string, width: number) => void;
  onColAutoFit?: (header: string) => void;
  onResetColWidth?: (header: string) => void;
}

function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function TableHeader({
  headers,
  relations = [],
  editingHeaderIdx,
  setEditingHeaderIdx,
  editingHeaderValue,
  setEditingHeaderValue,
  onSaveHeaderEdit,
  onDeleteColumn,
  onReorderColumns,
  sortCol,
  sortDir,
  onToggleColSort,
  onSetColSort,
  colWidths,
  onColWidthChange,
  onColAutoFit,
  onResetColWidth,
}: TableHeaderProps) {
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [openMenuColIdx, setOpenMenuColIdx] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 열 너비 마우스 드래그 조절 핸들러
  const handleResizeMouseDown = (header: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const initialWidth = colWidths?.[header] || 120;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.max(50, Math.min(800, initialWidth + deltaX));
      if (onColWidthChange) {
        onColWidthChange(header, nextWidth);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // 메뉴 외부 클릭 및 ESC 키 감지 시 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuColIdx(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuColIdx(null);
      }
    };

    if (openMenuColIdx !== null) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuColIdx]);

  const handleDragStart = (idx: number, e: React.DragEvent) => {
    setOpenMenuColIdx(null);
    setDraggedColIdx(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (targetIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedColIdx !== null && draggedColIdx !== targetIdx) {
      onReorderColumns(draggedColIdx, targetIdx);
    }
    setDraggedColIdx(null);
    setDragOverIdx(null);
  };

  // 정렬 핸들러 (직접 방향 지정 또는 토글)
  const handleSort = (header: string, dir: 'asc' | 'desc' | null) => {
    if (onSetColSort) {
      onSetColSort(header, dir);
    } else if (onToggleColSort) {
      if (dir === null) {
        if (sortCol === header) {
          if (sortDir === 'asc') {
            onToggleColSort(header); // to desc
            onToggleColSort(header); // to null
          } else if (sortDir === 'desc') {
            onToggleColSort(header); // to null
          }
        }
      } else if (dir === 'asc') {
        if (sortCol !== header || !sortDir) {
          onToggleColSort(header);
        } else if (sortDir === 'desc') {
          onToggleColSort(header);
          onToggleColSort(header);
        }
      } else if (dir === 'desc') {
        if (sortCol !== header || !sortDir) {
          onToggleColSort(header);
          onToggleColSort(header);
        } else if (sortDir === 'asc') {
          onToggleColSort(header);
        }
      }
    }
    setOpenMenuColIdx(null);
  };

  return (
    <thead className="sticky top-0 z-10 select-none shadow-2xs">
      {/* 1행: 엑셀 스타일 열 알파벳 (A, B, C...) 독립 행 */}
      <tr className="bg-slate-100/90 text-slate-500 border-b border-slate-200 text-[11px]">
        <th className="w-10 py-1 border-r border-slate-200 bg-slate-200/50"></th>
        {headers.map((header, colIdx) => {
          const isDef = header === '일련번호' || header === '등록일시';
          const w = colWidths?.[header];
          return (
            <th
              key={colIdx}
              style={{
                width: w ? `${w}px` : undefined,
                minWidth: w ? `${w}px` : '80px',
              }}
              className={`py-1 px-2.5 text-center font-mono font-semibold border-r border-slate-200 tracking-wider transition-colors relative group/alphacol ${
                dragOverIdx === colIdx
                  ? 'bg-blue-100 text-blue-700 font-bold'
                  : isDef
                  ? 'bg-slate-200/50 text-indigo-700 font-bold'
                  : ''
              }`}
            >
              {getColumnLetter(colIdx)}

              {/* 1행 열 너비 리사이징 핸들 */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(header, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onColAutoFit && onColAutoFit(header);
                }}
                className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-indigo-400/40 z-20 group/resizer transition-colors"
                title="드래그: 열 너비 조절 / 더블클릭: 자동 너비 맞춤"
              >
                <div className="w-0.5 h-full mx-auto bg-transparent group-hover/resizer:bg-indigo-500 transition-colors" />
              </div>
            </th>
          );
        })}
        <th className="w-12 py-1 bg-slate-100/90"></th>
      </tr>

      {/* 2행: 실제 데이터 열 이름 행 (더보기 드롭다운 메뉴로 슬림화) */}
      <tr className="bg-slate-50 border-b border-slate-200 text-xs">
        <th className="w-10 px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
          #
        </th>
        {headers.map((header, colIdx) => {
          const isEditing = editingHeaderIdx === colIdx;
          const isDefaultCol = header === '일련번호' || header === '등록일시';
          const isBeingDragged = draggedColIdx === colIdx;
          const isTarget = dragOverIdx === colIdx;
          const isSorted = sortCol === header;
          const isMenuOpen = openMenuColIdx === colIdx;
          const w = colWidths?.[header];

          return (
            <th
              key={colIdx}
              draggable={!isEditing}
              style={{
                width: w ? `${w}px` : undefined,
                minWidth: w ? `${w}px` : '80px',
              }}
              onDragStart={(e) => handleDragStart(colIdx, e)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIdx(colIdx);
              }}
              onDragLeave={() => {
                if (dragOverIdx === colIdx) setDragOverIdx(null);
              }}
              onDrop={(e) => handleDrop(colIdx, e)}
              onDragEnd={() => {
                setDraggedColIdx(null);
                setDragOverIdx(null);
              }}
              className={`px-2 py-2 font-bold border-r border-slate-200 group/col relative transition-all ${
                isBeingDragged
                  ? 'opacity-40 bg-slate-200'
                  : isDefaultCol
                  ? 'bg-slate-100/90 text-indigo-700'
                  : 'bg-slate-50 text-slate-700'
              } ${isTarget ? 'border-l-4 border-l-blue-600 bg-blue-50/60' : ''} ${
                isSorted ? 'bg-blue-50/70 text-blue-900' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1 min-w-0">
                {/* 드래그 핸들 (호버 시에만 아주 은은하게 표시) */}
                {!isEditing && (
                  <div
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 shrink-0 opacity-0 group-hover/col:opacity-100 transition-opacity"
                    title="드래그하여 열 순서 변경"
                  >
                    <GripVertical className="w-3 h-3" />
                  </div>
                )}

                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingHeaderValue}
                    onChange={(e) => setEditingHeaderValue(e.target.value)}
                    onBlur={onSaveHeaderEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveHeaderEdit();
                      if (e.key === 'Escape') setEditingHeaderIdx(null);
                    }}
                    className="bg-white border border-blue-500 text-slate-900 px-1 py-0.5 rounded text-xs w-full focus:outline-none"
                  />
                ) : (
                  <div
                    onClick={() => onToggleColSort && onToggleColSort(header)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingHeaderIdx(colIdx);
                      setEditingHeaderValue(header);
                    }}
                    className={`flex items-center gap-1 cursor-pointer flex-1 min-w-0 py-0.5 ${
                      isDefaultCol
                        ? 'text-indigo-700 hover:text-indigo-900 font-bold'
                        : 'hover:text-blue-700'
                    }`}
                    title={
                      isDefaultCol
                        ? `[${header}] 시스템 기본 열 (클릭: 정렬 / 더블클릭: 열 이름 수정)`
                        : `${header} (클릭: 오름차순/내림차순 정렬 토글 / 더블클릭: 열 이름 수정)`
                    }
                  >
                    <span className="truncate">{header}</span>

                    {/* 외래키(FK) 연결 뱃지 */}
                    {(() => {
                      const matchedRel = relations?.find((r) => r.foreignKey === header);
                      if (!matchedRel) return null;
                      return (
                        <span
                          title={`🔗 외래키(FK): [${matchedRel.targetSheetName}] 시트의 [${matchedRel.targetKey}] 열 참조 중`}
                          className="text-[9px] px-1 py-0.2 rounded-md bg-indigo-100 text-indigo-700 font-bold shrink-0 flex items-center gap-0.5 border border-indigo-200"
                        >
                          <Link2 className="w-2.5 h-2.5 text-indigo-600" />
                          FK
                        </span>
                      );
                    })()}

                    {/* 정렬 상태 표시: 정렬되어 있을 때만 컴팩트하게 노출 */}
                    {isSorted && (
                      <span
                        className="shrink-0 flex items-center p-0.5 rounded bg-blue-100/80 text-blue-700"
                        title={`현재 ${sortDir === 'asc' ? '오름차순' : '내림차순'} 정렬 중`}
                      >
                        {sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3 font-bold" />
                        ) : (
                          <ArrowDown className="w-3 h-3 font-bold" />
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* 우측 더보기(⋮) 메뉴 버튼: 4개 아이콘을 1개로 통합하여 가로폭 최소화 */}
                {!isEditing && (
                  <div className="relative shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuColIdx(isMenuOpen ? null : colIdx);
                      }}
                      className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition ${
                        isMenuOpen
                          ? 'opacity-100 bg-slate-200 text-slate-800 ring-1 ring-slate-300'
                          : 'opacity-0 group-hover/col:opacity-100'
                      }`}
                      title="열 작업 메뉴 (정렬, 이동, 이름수정, 삭제)"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* 드롭다운 팝오버 메뉴 */}
                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className={`absolute ${
                          colIdx === 0 ? 'left-0' : 'right-0'
                        } top-full mt-1.5 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-normal text-slate-700 select-none animate-in fade-in zoom-in-95 duration-100`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 메뉴 상단 헤더 */}
                        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                          <span className="truncate max-w-[130px] font-bold text-slate-600">
                            [{header}]
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 font-semibold">
                            {getColumnLetter(colIdx)}열
                          </span>
                        </div>

                        {/* 1. 정렬 옵션 */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => handleSort(header, 'asc')}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition ${
                              isSorted && sortDir === 'asc' ? 'bg-blue-50/80 text-blue-700 font-semibold' : ''
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                              <span>오름차순 정렬</span>
                            </span>
                            {isSorted && sortDir === 'asc' && (
                              <Check className="w-3 h-3 text-blue-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSort(header, 'desc')}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition ${
                              isSorted && sortDir === 'desc' ? 'bg-blue-50/80 text-blue-700 font-semibold' : ''
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                              <span>내림차순 정렬</span>
                            </span>
                            {isSorted && sortDir === 'desc' && (
                              <Check className="w-3 h-3 text-blue-600" />
                            )}
                          </button>
                          {isSorted && (
                            <button
                              type="button"
                              onClick={() => handleSort(header, null)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 text-slate-500 text-[11px] transition"
                            >
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              <span>정렬 해제</span>
                            </button>
                          )}
                        </div>

                        <div className="h-px bg-slate-100 my-0.5" />

                        {/* 2. 순서 이동 옵션 */}
                        <div className="py-1">
                          <button
                            type="button"
                            disabled={colIdx === 0}
                            onClick={() => {
                              onReorderColumns(colIdx, colIdx - 1);
                              setOpenMenuColIdx(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                            <span>왼쪽으로 열 이동</span>
                          </button>
                          <button
                            type="button"
                            disabled={colIdx === headers.length - 1}
                            onClick={() => {
                              onReorderColumns(colIdx, colIdx + 1);
                              setOpenMenuColIdx(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <span>오른쪽으로 열 이동</span>
                          </button>
                        </div>

                        <div className="h-px bg-slate-100 my-0.5" />

                        {/* 3. 열 너비 옵션 */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              onColAutoFit && onColAutoFit(header);
                              setOpenMenuColIdx(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 text-slate-700 transition"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                            <span>열 너비 자동 맞춤</span>
                          </button>
                          {colWidths?.[header] && (
                            <button
                              type="button"
                              onClick={() => {
                                onResetColWidth && onResetColWidth(header);
                                setOpenMenuColIdx(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 text-slate-500 text-[11px] transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                              <span>열 너비 기본값 복원</span>
                            </button>
                          )}
                        </div>

                        <div className="h-px bg-slate-100 my-0.5" />

                        {/* 4. 이름 수정 및 열 삭제 */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingHeaderIdx(colIdx);
                              setEditingHeaderValue(header);
                              setOpenMenuColIdx(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 text-slate-700 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>열 이름 수정</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuColIdx(null);
                              onDeleteColumn(header);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>열 삭제</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2행 열 너비 리사이징 핸들 */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(header, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onColAutoFit && onColAutoFit(header);
                }}
                className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-indigo-400/40 z-20 group/resizer transition-colors"
                title="드래그: 열 너비 조절 / 더블클릭: 자동 너비 맞춤"
              >
                <div className="w-0.5 h-full mx-auto bg-transparent group-hover/resizer:bg-indigo-500 transition-colors" />
              </div>
            </th>
          );
        })}
        <th className="w-12 px-2 py-2 text-center text-slate-400 font-medium">관리</th>
      </tr>
    </thead>
  );
}
