'use client';

import React, { useState } from 'react';
import { Trash2, UploadCloud, RefreshCw, FileText } from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';
import { TableHeader } from './TableHeader';
import { TableEmptyDropzone } from './TableEmptyDropzone';

interface TableViewProps {
  sheet: ParsedSheet;
  filteredRows: Record<string, any>[];
  docFilename?: string;
  isTableDragging: boolean;
  setIsTableDragging: (dragging: boolean) => void;
  onDropDirectlyToTable: (file: File) => void;
  isProcessing?: boolean;
  processStatus?: string;
  storageProgress?: number;
  editingCell: { rowIdx: number; colKey: string } | null;
  setEditingCell: (cell: { rowIdx: number; colKey: string } | null) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  onSaveCellEdit: () => void;
  editingHeaderIdx: number | null;
  setEditingHeaderIdx: (idx: number | null) => void;
  editingHeaderValue: string;
  setEditingHeaderValue: (val: string) => void;
  onSaveHeaderEdit: () => void;
  onDeleteColumn: (col: string) => void;
  onReorderColumns: (fromIdx: number, toIdx: number) => void;
  onDeleteRow: (rowIdx: number) => void;
}

export function TableView({
  sheet, filteredRows, docFilename, isTableDragging, setIsTableDragging, onDropDirectlyToTable,
  isProcessing, processStatus, storageProgress = 0, editingCell, setEditingCell, editValue, setEditValue,
  onSaveCellEdit, editingHeaderIdx, setEditingHeaderIdx, editingHeaderValue, setEditingHeaderValue,
  onSaveHeaderEdit, onDeleteColumn, onReorderColumns, onDeleteRow,
}: TableViewProps) {
  const [hoveredFileKey, setHoveredFileKey] = useState<string | number | null>(null);

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsTableDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsTableDragging(false); }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation(); setIsTableDragging(false);
          if (e.dataTransfer.files?.[0]) onDropDirectlyToTable(e.dataTransfer.files[0]);
        }}
        className={`flex-1 overflow-auto relative transition-colors ${isTableDragging ? 'bg-blue-50/70 ring-4 ring-blue-500/50 ring-inset' : ''}`}
      >
        {isTableDragging && (
          <div className="absolute inset-0 z-20 bg-blue-600/10 backdrop-blur-2xs flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-blue-500 rounded-xl m-2">
            <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce mb-2" />
            <span className="font-extrabold text-base text-blue-700">이 시트의 표 데이터로 즉시 적재됩니다 (팝업 없음)</span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-slate-900/20 backdrop-blur-2xs flex flex-col items-center justify-center p-4">
            <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xl max-w-sm w-full flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 mb-1">데이터 적재 진행 중...</h4>
              <p className="text-xs text-slate-500 mb-3 font-medium">{processStatus || '파일 파싱 및 표 데이터 변환 중...'}</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(storageProgress, 25)}%` }} />
              </div>
            </div>
          </div>
        )}

        <table className="w-full text-left border-collapse text-xs">
          <TableHeader
            headers={sheet.headers} editingHeaderIdx={editingHeaderIdx} setEditingHeaderIdx={setEditingHeaderIdx}
            editingHeaderValue={editingHeaderValue} setEditingHeaderValue={setEditingHeaderValue}
            onSaveHeaderEdit={onSaveHeaderEdit} onDeleteColumn={onDeleteColumn} onReorderColumns={onReorderColumns}
          />

          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredRows.map((row, rowIdx) => {
              const actualIdx = row._originIdx !== undefined ? row._originIdx : rowIdx;
              const rowFileKey = row._fileUid || (row._fileId ? `id_${row._fileId}` : undefined) || row._fileName || docFilename;
              const rowFileName = row._fileName || docFilename;
              const rowUploadTime = row.등록일시 ? ` (${row.등록일시} 적재)` : '';
              const isSame = hoveredFileKey && rowFileKey && rowFileKey === hoveredFileKey;

              return (
                <tr
                  key={rowIdx}
                  onMouseEnter={() => rowFileKey && setHoveredFileKey(rowFileKey)}
                  onMouseLeave={() => setHoveredFileKey(null)}
                  className={`group transition ${isSame ? 'bg-indigo-50/90 ring-1 ring-indigo-300 ring-inset font-medium' : 'hover:bg-blue-50/40'}`}
                >
                  <td className="px-2.5 py-2 text-center text-slate-400 border-r border-slate-200 font-mono text-[11px] bg-slate-50/60 select-none">
                    <div className="flex items-center justify-center gap-1">
                      <span>{rowIdx + 1}</span>
                      {rowFileName && (
                        <span
                          title={`📄 원본 증빙: ${rowFileName}${rowUploadTime}\n(동일 파일에서 추출된 행들이 함께 하이라이트됩니다)`}
                          className={`p-0.5 rounded cursor-help transition ${isSame ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 hover:text-indigo-600'}`}
                        >
                          <FileText className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  {sheet.headers.map((header, colIdx) => {
                    const isEditing = editingCell?.rowIdx === actualIdx && editingCell?.colKey === header;
                    const cellVal = row[header] ?? '';

                    return (
                      <td
                        key={colIdx}
                        onDoubleClick={() => {
                          setEditingCell({ rowIdx: actualIdx, colKey: header });
                          setEditValue(String(cellVal));
                        }}
                        className="px-3.5 py-2 border-r border-slate-200 text-slate-700 max-w-xs truncate cursor-cell relative"
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={onSaveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onSaveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full bg-white text-slate-900 px-2 py-0.5 rounded border-2 border-blue-500 shadow-xs focus:outline-none text-xs"
                          />
                        ) : (
                          <span>{String(cellVal)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center border-l border-slate-200">
                    <button
                      onClick={() => onDeleteRow(actualIdx)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                      title="행 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 && <TableEmptyDropzone onFileSelect={onDropDirectlyToTable} />}
      </div>

      <div className="border-t border-slate-200 bg-slate-50/90 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-medium">총 {sheet.rows.length}개 행</span>
          <span>•</span>
          <span className="font-medium">{sheet.headers.length}개 열</span>
          {docFilename && <><span>•</span><span className="text-slate-700 font-mono font-medium">{docFilename}</span></>}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>더블클릭 편집 • 일련번호 옆 📄 호버 시 동일 파일 행 그룹 하이라이트</span>
        </div>
      </div>
    </>
  );
}
