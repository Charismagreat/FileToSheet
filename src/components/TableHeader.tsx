'use client';

import React from 'react';
import { X } from 'lucide-react';

interface TableHeaderProps {
  headers: string[];
  editingHeaderIdx: number | null;
  setEditingHeaderIdx: (idx: number | null) => void;
  editingHeaderValue: string;
  setEditingHeaderValue: (val: string) => void;
  onSaveHeaderEdit: () => void;
  onDeleteColumn: (header: string) => void;
}

// 엑셀 스타일의 열 알파벳 계산 (0 -> A, 25 -> Z, 26 -> AA ...)
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
}: TableHeaderProps) {
  return (
    <thead className="sticky top-0 z-10 select-none shadow-2xs">
      {/* 1행: 엑셀 스타일 열 알파벳 (A, B, C...) 독립 행 */}
      <tr className="bg-slate-100/90 text-slate-500 border-b border-slate-200 text-[11px]">
        <th className="w-10 py-1 border-r border-slate-200 bg-slate-200/50"></th>
        {headers.map((_, colIdx) => (
          <th
            key={colIdx}
            className="py-1 px-3 text-center font-mono font-semibold border-r border-slate-200 tracking-wider"
          >
            {getColumnLetter(colIdx)}
          </th>
        ))}
        <th className="w-12 py-1 bg-slate-100/90"></th>
      </tr>

      {/* 2행: 실제 데이터 열 이름 행 */}
      <tr className="bg-slate-50 border-b border-slate-200 text-xs">
        <th className="w-10 px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
          #
        </th>
        {headers.map((header, colIdx) => {
          const isEditing = editingHeaderIdx === colIdx;
          const isDefaultCol = header === '일련번호' || header === '등록일시';

          return (
            <th key={colIdx} className="px-3.5 py-2 font-bold text-slate-700 border-r border-slate-200 group/col">
              <div className="flex items-center justify-between gap-2">
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
                    onDoubleClick={() => {
                      setEditingHeaderIdx(colIdx);
                      setEditingHeaderValue(header);
                    }}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-blue-700 flex-1 truncate"
                    title="더블클릭하여 열 이름 편집"
                  >
                    <span className="truncate">{header}</span>
                    {isDefaultCol && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-normal shrink-0">
                        기본열
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => onDeleteColumn(header)}
                  className="opacity-0 group-hover/col:opacity-100 p-0.5 hover:text-red-500 text-slate-400 transition shrink-0"
                  title={`'${header}' 열 삭제`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </th>
          );
        })}
        <th className="w-12 px-2 py-2 text-center text-slate-400 font-medium">삭제</th>
      </tr>
    </thead>
  );
}
