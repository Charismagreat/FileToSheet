'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, GripVertical, ArrowUp, ArrowDown, ArrowUpDown, Link2 } from 'lucide-react';
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
}: TableHeaderProps) {
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number, e: React.DragEvent) => {
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

  return (
    <thead className="sticky top-0 z-10 select-none shadow-2xs">
      {/* 1행: 엑셀 스타일 열 알파벳 (A, B, C...) 독립 행 */}
      <tr className="bg-slate-100/90 text-slate-500 border-b border-slate-200 text-[11px]">
        <th className="w-10 py-1 border-r border-slate-200 bg-slate-200/50"></th>
        {headers.map((_, colIdx) => (
          <th
            key={colIdx}
            className={`py-1 px-3 text-center font-mono font-semibold border-r border-slate-200 tracking-wider transition-colors ${
              dragOverIdx === colIdx ? 'bg-blue-100 text-blue-700 font-bold' : ''
            }`}
          >
            {getColumnLetter(colIdx)}
          </th>
        ))}
        <th className="w-12 py-1 bg-slate-100/90"></th>
      </tr>

      {/* 2행: 실제 데이터 열 이름 행 (드래그 앤 드롭, 정렬 토글, 좌우 이동) */}
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

          return (
            <th
              key={colIdx}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(colIdx, e)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(colIdx); }}
              onDragLeave={() => { if (dragOverIdx === colIdx) setDragOverIdx(null); }}
              onDrop={(e) => handleDrop(colIdx, e)}
              onDragEnd={() => { setDraggedColIdx(null); setDragOverIdx(null); }}
              className={`px-2.5 py-2 font-bold text-slate-700 border-r border-slate-200 group/col relative transition-all ${
                isBeingDragged ? 'opacity-40 bg-slate-200' : 'bg-slate-50'
              } ${isTarget ? 'border-l-4 border-l-blue-600 bg-blue-50/60' : ''} ${
                isSorted ? 'bg-blue-50/50 text-blue-900' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 min-w-[100px]">
                {/* 드래그 핸들 (호버 시 표시) */}
                {!isEditing && (
                  <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover/col:text-slate-500 shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
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
                    className="flex items-center gap-1.5 cursor-pointer hover:text-blue-700 flex-1 truncate py-0.5"
                    title="클릭: 오름차순/내림차순 정렬 / 더블클릭: 열 이름 수정"
                  >
                    <span className="truncate">{header}</span>
                    {isDefaultCol && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-normal shrink-0">
                        기본열
                      </span>
                    )}

                    {/* 외래키(FK) 연결 뱃지 */}
                    {(() => {
                      const matchedRel = relations?.find((r) => r.foreignKey === header);
                      if (!matchedRel) return null;
                      return (
                        <span
                          title={`🔗 외래키(FK): [${matchedRel.targetSheetName}] 시트의 [${matchedRel.targetKey}] 열 참조 중`}
                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold shrink-0 flex items-center gap-0.5 border border-indigo-200"
                        >
                          <Link2 className="w-2.5 h-2.5 text-indigo-600" />
                          FK
                        </span>
                      );
                    })()}

                    {/* 정렬 표시 아이콘 */}
                    <div className="shrink-0 flex items-center">
                      {isSorted ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/col:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                )}

                {/* 좌/우 이동 화살표 및 삭제 버튼 (호버 시 노출) */}
                {!isEditing && (
                  <div className="opacity-0 group-hover/col:opacity-100 flex items-center gap-0.5 shrink-0 transition">
                    <button
                      type="button"
                      disabled={colIdx === 0}
                      onClick={(e) => { e.stopPropagation(); onReorderColumns(colIdx, colIdx - 1); }}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="왼쪽으로 이동"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={colIdx === headers.length - 1}
                      onClick={(e) => { e.stopPropagation(); onReorderColumns(colIdx, colIdx + 1); }}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="오른쪽으로 이동"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteColumn(header); }}
                      className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-400 transition"
                      title={`'${header}' 열 삭제`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </th>
          );
        })}
        <th className="w-12 px-2 py-2 text-center text-slate-400 font-medium">관리</th>
      </tr>
    </thead>
  );
}
