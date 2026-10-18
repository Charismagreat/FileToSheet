'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, UploadCloud, RefreshCw, FileText, Link2, Check, ExternalLink } from 'lucide-react';
import { ParsedSheet, SheetRelation } from '@/lib/parser';
import { TableHeader } from './TableHeader';
import { TableEmptyDropzone } from './TableEmptyDropzone';
import { TablePagination } from './TablePagination';

interface TableViewProps {
  sheet: ParsedSheet;
  filteredRows: Record<string, any>[];
  docFilename?: string;
  isTableDragging: boolean;
  setIsTableDragging: (dragging: boolean) => void;
  onDropDirectlyToTable: (file: File, allFiles?: File[]) => void;
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
  sortCol?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  onToggleColSort?: (header: string) => void;
  projectSheets?: ParsedSheet[];
  isJoinViewActive?: boolean;
  setIsJoinViewActive?: (v: boolean) => void;
}

export function TableView({
  sheet,
  filteredRows,
  docFilename,
  isTableDragging,
  setIsTableDragging,
  onDropDirectlyToTable,
  isProcessing,
  processStatus,
  storageProgress = 0,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  onSaveCellEdit,
  editingHeaderIdx,
  setEditingHeaderIdx,
  editingHeaderValue,
  setEditingHeaderValue,
  onSaveHeaderEdit,
  onDeleteColumn,
  onReorderColumns,
  onDeleteRow,
  sortCol,
  sortDir,
  onToggleColSort,
  projectSheets,
  isJoinViewActive = false,
  setIsJoinViewActive,
}: TableViewProps) {
  const [hoveredFileKey, setHoveredFileKey] = useState<string | number | null>(null);

  // 실무형 페이지네이션 상태 (기본 50개씩)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // 필터링 결과나 행 개수 변경 시 유효 페이지 범위 보정
  useEffect(() => {
    const maxPage = pageSize >= 999999 ? 1 : Math.max(1, Math.ceil(filteredRows.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredRows.length, pageSize, currentPage]);

  const isAll = pageSize >= 999999;
  const paginatedRows = isAll
    ? filteredRows
    : filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 외래키(FK) 관계 및 조인 컬럼 계산
  const relations: SheetRelation[] = sheet.relations || [];
  const hasRelations = relations.length > 0;

  interface JoinedColMeta {
    headerName: string;
    sheetName: string;
    targetCol: string;
    foreignKey: string;
  }

  const joinedCols: JoinedColMeta[] = [];
  if (isJoinViewActive && hasRelations && projectSheets) {
    relations.forEach((rel) => {
      const targetSheet = projectSheets.find((s) => s.name === rel.targetSheetName);
      if (targetSheet) {
        (rel.displayColumns || []).forEach((dc) => {
          joinedCols.push({
            headerName: `[${rel.targetSheetName}] ${dc}`,
            sheetName: rel.targetSheetName,
            targetCol: dc,
            foreignKey: rel.foreignKey,
          });
        });
      }
    });
  }

  // 조인 값 계산
  const getJoinedVal = (row: any, jc: JoinedColMeta) => {
    const fkVal = row[jc.foreignKey];
    if (fkVal === undefined || fkVal === null || String(fkVal).trim() === '') {
      return { val: '-', isMatched: false };
    }
    const targetSheet = projectSheets?.find((s) => s.name === jc.sheetName);
    if (!targetSheet) return { val: '-', isMatched: false };

    const rel = relations.find((r) => r.foreignKey === jc.foreignKey);
    if (!rel) return { val: '-', isMatched: false };

    const matchedRow = targetSheet.rows.find(
      (tr) => String(tr[rel.targetKey] ?? '').trim() === String(fkVal).trim()
    );

    if (matchedRow) {
      return { val: String(matchedRow[jc.targetCol] ?? '-'), isMatched: true };
    }
    return { val: '(미연결)', isMatched: false };
  };

  // 현재 수정 중인 셀이 외래키 열이면 대상 시트의 고유 키 목록을 datalist로 추천
  const currentEditingRel = relations.find((r) => r.foreignKey === editingCell?.colKey);
  const targetKeyOptions: string[] = [];
  if (currentEditingRel && projectSheets) {
    const targetSheet = projectSheets.find((s) => s.name === currentEditingRel.targetSheetName);
    if (targetSheet) {
      targetSheet.rows.forEach((r) => {
        const val = String(r[currentEditingRel.targetKey] ?? '').trim();
        if (val && !targetKeyOptions.includes(val)) {
          targetKeyOptions.push(val);
        }
      });
    }
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsTableDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsTableDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsTableDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            onDropDirectlyToTable(files[0], files);
          }
        }}
        className={`flex-1 overflow-auto relative transition-colors ${
          isTableDragging ? 'bg-blue-50/70 ring-4 ring-blue-500/50 ring-inset' : ''
        }`}
      >
        {isTableDragging && (
          <div className="absolute inset-0 z-20 bg-blue-600/10 backdrop-blur-2xs flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-blue-500 rounded-xl m-2">
            <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce mb-2" />
            <span className="font-extrabold text-base text-blue-700">
              스마트 시트 자동 분류로 즉시 적재됩니다
            </span>
            <span className="text-xs text-blue-600 mt-1 font-medium">
              여러 개의 파일을 동시에 올릴 수 있습니다 (일괄 큐 모니터링)
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-slate-900/20 backdrop-blur-2xs flex flex-col items-center justify-center p-4">
            <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xl max-w-sm w-full flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 mb-1">데이터 적재 진행 중...</h4>
              <p className="text-xs text-slate-500 mb-3 font-medium">
                {processStatus || '파일 파싱 및 표 데이터 변환 중...'}
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(storageProgress, 25)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <table className="w-full text-left border-collapse text-xs">
          <TableHeader
            headers={sheet.headers}
            relations={sheet.relations}
            editingHeaderIdx={editingHeaderIdx}
            setEditingHeaderIdx={setEditingHeaderIdx}
            editingHeaderValue={editingHeaderValue}
            setEditingHeaderValue={setEditingHeaderValue}
            onSaveHeaderEdit={onSaveHeaderEdit}
            onDeleteColumn={onDeleteColumn}
            onReorderColumns={onReorderColumns}
            sortCol={sortCol}
            sortDir={sortDir}
            onToggleColSort={onToggleColSort}
          />

          <tbody className="divide-y divide-slate-100 font-sans">
            {paginatedRows.map((row, rowIdx) => {
              const actualIdx = row._originIdx !== undefined ? row._originIdx : rowIdx;
              const displayRowNumber = isAll ? rowIdx + 1 : (currentPage - 1) * pageSize + rowIdx + 1;
              const rowFileKey =
                row._fileUid || (row._fileId ? `id_${row._fileId}` : undefined) || row._fileName || docFilename;
              const rowFileName = row._fileName || docFilename;
              const rowUploadTime = row.등록일시 ? ` (${row.등록일시} 적재)` : '';
              const isSame = hoveredFileKey && rowFileKey && rowFileKey === hoveredFileKey;

              return (
                <tr
                  key={rowIdx}
                  onMouseEnter={() => rowFileKey && setHoveredFileKey(rowFileKey)}
                  onMouseLeave={() => setHoveredFileKey(null)}
                  className={`group transition ${
                    isSame ? 'bg-indigo-50/90 ring-1 ring-indigo-300 ring-inset font-medium' : 'hover:bg-blue-50/40'
                  }`}
                >
                  <td className="px-2.5 py-2 text-center text-slate-400 border-r border-slate-200 font-mono text-[11px] bg-slate-50/60 select-none">
                    <div className="flex items-center justify-center gap-1">
                      <span>{displayRowNumber}</span>
                      {rowFileName && (
                        <span
                          title={`📄 원본 증빙: ${rowFileName}${rowUploadTime}\n(동일 파일에서 추출된 행들이 함께 하이라이트됩니다)`}
                          className={`p-0.5 rounded cursor-help transition ${
                            isSame ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 hover:text-indigo-600'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 기본 시트 컬럼 렌더링 */}
                  {sheet.headers.map((header, colIdx) => {
                    const isEditing = editingCell?.rowIdx === actualIdx && editingCell?.colKey === header;
                    const cellVal = row[header] ?? '';
                    const isFkCol = relations.some((r) => r.foreignKey === header);

                    return (
                      <td
                        key={colIdx}
                        onDoubleClick={() => {
                          setEditingCell({ rowIdx: actualIdx, colKey: header });
                          setEditValue(String(cellVal));
                        }}
                        className={`px-3.5 py-2 border-r border-slate-200 text-slate-700 max-w-xs truncate cursor-cell relative ${
                          isFkCol ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        {isEditing ? (
                          <>
                            <input
                              autoFocus
                              type="text"
                              list={isFkCol ? 'fk-key-suggestions' : undefined}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={onSaveCellEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveCellEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full bg-white text-slate-900 px-2 py-0.5 rounded border-2 border-indigo-500 shadow-xs focus:outline-none text-xs"
                            />
                            {isFkCol && targetKeyOptions.length > 0 && (
                              <datalist id="fk-key-suggestions">
                                {targetKeyOptions.map((opt) => (
                                  <option key={opt} value={opt} />
                                ))}
                              </datalist>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{String(cellVal)}</span>
                            {isFkCol && cellVal && (
                              <span
                                title="외래키(FK) 값"
                                className="text-[10px] text-indigo-400 opacity-60 group-hover:opacity-100"
                              >
                                🔗
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* 🔗 조인 뷰 모드 활성화 시 참조 시트에서 가져온 확장 열 렌더링 */}
                  {isJoinViewActive &&
                    joinedCols.map((jc, jIdx) => {
                      const { val, isMatched } = getJoinedVal(row, jc);
                      return (
                        <td
                          key={`joined_${jIdx}`}
                          className={`px-3 py-2 border-r border-indigo-100 text-xs truncate select-none ${
                            isMatched
                              ? 'bg-indigo-50/50 text-indigo-900 font-medium'
                              : 'bg-slate-50/50 text-slate-400 italic'
                          }`}
                          title={`조인 결과: [${jc.sheetName}] ${jc.targetCol} (${isMatched ? '연결됨' : '키 불일치'})`}
                        >
                          <span className="flex items-center gap-1">
                            {isMatched && <Check className="w-3 h-3 text-indigo-500 shrink-0" />}
                            <span className="truncate">{val}</span>
                          </span>
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

      {/* 페이지네이션 컨트롤러 */}
      <TablePagination
        currentPage={currentPage}
        totalRows={filteredRows.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* 하단 바: 행/열 개수 및 조인 뷰 컨트롤러 */}
      <div className="border-t border-slate-200 bg-slate-50/90 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-medium">총 {sheet.rows.length}개 행</span>
          <span>•</span>
          <span className="font-medium">{sheet.headers.length}개 열</span>
          {docFilename && (
            <>
              <span>•</span>
              <span className="text-slate-700 font-mono font-medium">{docFilename}</span>
            </>
          )}

          {/* 🔗 외래키 및 조인 뷰 상태 토글러 */}
          {hasRelations && setIsJoinViewActive && (
            <>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsJoinViewActive(!isJoinViewActive)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs ${
                  isJoinViewActive
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }`}
                title="외래키(FK)를 기준으로 다른 시트의 상세 데이터를 우측에 나란히 조인하여 표시합니다"
              >
                <Link2 className="w-3.5 h-3.5" />
                {isJoinViewActive ? '조인 뷰 켜짐 (숨기기)' : `🔗 다른 시트 조인 뷰 (${relations.length}개 FK 연동)`}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>더블클릭 편집 • 일련번호 옆 📄 호버 시 동일 파일 행 그룹 하이라이트</span>
        </div>
      </div>
    </>
  );
}
