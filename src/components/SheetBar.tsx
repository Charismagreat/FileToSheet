'use client';

import React, { useState } from 'react';
import {
  Table as TableIcon,
  Plus,
  Edit2,
  X,
  Sparkles,
  Sliders,
  Brain,
  GripVertical,
} from 'lucide-react';
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
  onOpenSheetRule?: (idx: number) => void;
  onReorderSheets?: (fromIdx: number, toIdx: number) => void;
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
  onOpenSheetRule,
  onReorderSheets,
  plan,
}: SheetBarProps) {
  const isPro = plan === 'pro' || plan === 'enterprise';
  const maxSheets = isPro ? 30 : 5;
  const isLimitReached = sheets.length >= maxSheets;

  // 드래그 앤 드롭 상태
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  return (
    <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 text-xs text-slate-500 mr-1.5 shrink-0 font-bold">
          <TableIcon className="w-4 h-4 text-blue-600" />
          <span>시트:</span>
        </div>
        {sheets.map((sheet, idx) => {
          const isCurrent = activeSheetIndex === idx;
          const isRenaming = editingSheetIdx === idx;
          const hasRule = Boolean(sheet.customPrompt?.trim());

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
                if (!isNaN(fromIdx) && fromIdx !== idx && onReorderSheets) {
                  onReorderSheets(fromIdx, idx);
                }
                setDraggingIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDraggingIdx(null);
                setDragOverIdx(null);
              }}
              onClick={() => onSelectSheet(idx)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition select-none ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-xs border-blue-600'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              } ${draggingIdx === idx ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''} ${
                dragOverIdx === idx && draggingIdx !== idx ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50/90' : ''
              }`}
              title={hasRule ? `[AI 규칙 적용 중]\n${sheet.customPrompt}` : '드래그하여 시트 순서 변경 가능'}
            >
              {/* 드래그 힌트 아이콘 (호버 시 표시) */}
              {sheets.length > 1 && !isRenaming && (
                <GripVertical
                  className={`w-2.5 h-2.5 opacity-0 group-hover:opacity-60 cursor-grab shrink-0 -ml-1 transition ${
                    isCurrent ? 'text-white' : 'text-slate-400'
                  }`}
                />
              )}

              {/* AI 규칙 적용 시 스파클 아이콘 */}
              {hasRule && (
                <Sparkles
                  className={`w-3 h-3 shrink-0 ${
                    isCurrent ? 'text-amber-300 fill-amber-300' : 'text-blue-600 fill-blue-600'
                  }`}
                />
              )}

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

              {/* 시트 전용 AI 규칙 열기 버튼 */}
              {onOpenSheetRule && !isRenaming && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSheetRule(idx);
                  }}
                  className={`p-0.5 transition ${
                    hasRule
                      ? isCurrent ? 'text-amber-300 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                      : 'opacity-0 group-hover:opacity-100 hover:text-blue-200'
                  }`}
                  title="이 시트의 AI 분석·적재 규칙 설정"
                >
                  <Sliders className="w-2.5 h-2.5" />
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

      {/* 우측: 현재 활성 시트 AI 적재 규칙 원클릭 제어 버튼 */}
      {onOpenSheetRule && sheets[activeSheetIndex] && (
        <button
          onClick={() => onOpenSheetRule(activeSheetIndex)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition font-bold shadow-2xs shrink-0 cursor-pointer ${
            sheets[activeSheetIndex].customPrompt?.trim()
              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title="현재 활성 시트에 파일이 추가되거나 다중 파일 분류 시 적용할 자연어 규칙을 설정합니다."
        >
          <Sparkles
            className={`w-3.5 h-3.5 ${
              sheets[activeSheetIndex].customPrompt?.trim()
                ? 'text-amber-500 fill-amber-500'
                : 'text-blue-600'
            }`}
          />
          <span>시트 AI 적재 규칙</span>
          {sheets[activeSheetIndex].customPrompt?.trim() ? (
            <span className="text-[10px] bg-blue-600 text-white font-mono px-1.5 py-0.2 rounded-full leading-none">
              ON
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">미설정</span>
          )}

          {/* 누적 데이터 In-Context 학습 상태 뱃지 */}
          {sheets[activeSheetIndex].rows && sheets[activeSheetIndex].rows.length > 0 && (
            <span
              className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-1.5 py-0.5 rounded-md border border-purple-200 flex items-center gap-1"
              title={`이 시트에 누적된 ${sheets[activeSheetIndex].rows.length}건의 데이터 패턴을 AI가 자동으로 학습·계승합니다.`}
            >
              <Brain className="w-2.5 h-2.5" />
              <span>{sheets[activeSheetIndex].rows.length}건 학습중</span>
            </span>
          )}
        </button>
      )}
    </div>
  );
}
