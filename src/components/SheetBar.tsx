'use client';

import React from 'react';
import { Table as TableIcon, Plus, Edit2, X } from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';

interface SheetBarProps {
  sheets: ParsedSheet[];
  activeSheetIndex: number;
  category?: string;
  editingSheetIdx: number | null;
  setEditingSheetIdx: (idx: number | null) => void;
  editingSheetName: string;
  setEditingSheetName: (name: string) => void;
  onSelectSheet: (idx: number) => void;
  onSaveSheetName: () => void;
  onAddNewSheet: () => void;
  onDeleteSheet: (idx: number, e: React.MouseEvent) => void;
  plan?: string;
}

export function SheetBar({
  sheets = [],
  activeSheetIndex,
  category,
  editingSheetIdx,
  setEditingSheetIdx,
  editingSheetName,
  setEditingSheetName,
  onSelectSheet,
  onSaveSheetName,
  onAddNewSheet,
  onDeleteSheet,
  plan,
}: SheetBarProps) {
  const maxSheets = plan === 'pro' ? 30 : 5;
  const isLimitReached = sheets.length >= maxSheets;

  return (
    <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 text-xs text-slate-500 mr-1.5 shrink-0 font-bold">
          <TableIcon className="w-4 h-4 text-blue-600" />
          <span>📑 시트:</span>
        </div>
        {sheets.map((sheet, idx) => {
          const isCurrent = activeSheetIndex === idx;
          const isRenaming = editingSheetIdx === idx;

          return (
            <div
              key={idx}
              onClick={() => onSelectSheet(idx)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-xs border-blue-600'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  type="text"
                  value={editingSheetName}
                  onChange={(e) => setEditingSheetName(e.target.value)}
                  onBlur={onSaveSheetName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveSheetName();
                    if (e.key === 'Escape') setEditingSheetIdx(null);
                  }}
                  className="bg-white text-slate-900 px-1 py-0.5 rounded text-xs w-20 focus:outline-none"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingSheetIdx(idx);
                    setEditingSheetName(sheet.name);
                  }}
                  title="더블클릭하여 시트 이름 변경"
                >
                  {sheet.name}
                </span>
              )}

              <span className={`opacity-80 font-mono text-[10px] ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>
                ({sheet.rows.length})
              </span>

              {!isRenaming && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSheetIdx(idx);
                    setEditingSheetName(sheet.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-blue-200 transition"
                  title="시트 이름 편집"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              )}

              {sheets.length > 1 && (
                <button
                  onClick={(e) => onDeleteSheet(idx, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-300 transition"
                  title="시트 삭제"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={onAddNewSheet}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition font-medium shadow-2xs border ${
            isLimitReached ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title={`새 빈 시트 추가 (${sheets.length}/${maxSheets})`}
        >
          <Plus className="w-3 h-3 text-blue-600" />
          <span>시트 추가</span>
          <span className="text-[10px] text-slate-400 font-mono">({sheets.length}/{maxSheets})</span>
        </button>
      </div>

      {category && (
        <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md font-semibold">
          {category}
        </span>
      )}
    </div>
  );
}
