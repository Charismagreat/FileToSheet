'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, UploadCloud, RefreshCw, FileText, Link2, Check, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';
import { ParsedSheet, SheetRelation } from '@/lib/parser';
import { TableHeader } from './TableHeader';
import { getSmartColumnWidth, renderFormattedNumber, isNumericColumn } from '@/lib/formatters';
import { TableEmptyDropzone } from './TableEmptyDropzone';
import { TablePagination } from './TablePagination';
import { ValidationBanner } from './ValidationBanner';
import { ValidationRuleModal } from './ValidationRuleModal';
import {
  ValidationRule,
  generateDefaultRules,
  validateSheetRows,
} from '@/lib/validation-engine';

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
  onSetColSort?: (header: string, dir: 'asc' | 'desc' | null) => void;
  projectSheets?: ParsedSheet[];
  isJoinViewActive?: boolean;
  setIsJoinViewActive?: (v: boolean) => void;
  onJumpToOriginalDoc?: (fileName?: string, fileId?: string | number, fileUid?: string) => void;
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
  onSetColSort,
  projectSheets,
  isJoinViewActive = false,
  setIsJoinViewActive,
  onJumpToOriginalDoc,
}: TableViewProps) {
  const [hoveredFileKey, setHoveredFileKey] = useState<string | number | null>(null);

  // 실무형 페이지네이션 상태 (기본 50개씩)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // 🌟 유효성 검증 규칙 상태 (시트별 localStorage 연동 및 지능형 기본 규칙 생성)
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [filterOnlyErrors, setFilterOnlyErrors] = useState<boolean>(false);

  // 시트 변경 시 유효성 검증 규칙 로드
  useEffect(() => {
    if (!sheet?.name) return;
    try {
      const storageKey = `fts_val_rules_${sheet.name}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: ValidationRule[] = JSON.parse(saved);
        // 시스템이 임의로 주입했던 레거시 중복 규칙 제거
        const cleaned = parsed.filter((r) => r.id !== 'default_duplicate_entry');
        setRules(cleaned);
        return;
      }
    } catch {}

    // 기본 규칙 자동 감지
    const defaults = generateDefaultRules(sheet.headers || []);
    setRules(defaults);
  }, [sheet.name, sheet.headers]);

  // 규칙 변경 핸들러
  const handleUpdateRules = (newRules: ValidationRule[]) => {
    setRules(newRules);
    try {
      if (sheet?.name) {
        localStorage.setItem(`fts_val_rules_${sheet.name}`, JSON.stringify(newRules));
      }
    } catch {}
  };

  // 실시간 유효성 검증 평가
  const validationResult = useMemo(() => {
    return validateSheetRows(sheet.rows || [], rules);
  }, [sheet.rows, rules]);

  // 불일치 행만 모아보기 필터 적용
  const displayRows = useMemo(() => {
    if (!filterOnlyErrors) return filteredRows;
    return filteredRows.filter((r, idx) => {
      const actualIdx = r._originIdx !== undefined ? r._originIdx : idx;
      return validationResult.errorRowIndices.has(actualIdx);
    });
  }, [filteredRows, filterOnlyErrors, validationResult.errorRowIndices]);

  // 필터링 결과나 행 개수 변경 시 유효 페이지 범위 보정
  useEffect(() => {
    const maxPage = pageSize >= 999999 ? 1 : Math.max(1, Math.ceil(displayRows.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [displayRows.length, pageSize, currentPage]);

  const isAll = pageSize >= 999999;
  const paginatedRows = isAll
    ? displayRows
    : displayRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 외래키(FK) 관계 및 조인 컬럼 계산
  const relations: SheetRelation[] = sheet.relations || [];
  const hasRelations = relations.length > 0;

  // 🌟 컬럼 너비 상태 관리 (시트별 localStorage 영속화 지원)
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  // 시트 변경 시 저장된 너비 로드 또는 기본값 계산
  useEffect(() => {
    if (!sheet?.name) return;
    try {
      const storageKey = `fts_col_widths_${sheet.name}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setColWidths(JSON.parse(saved));
        return;
      }
    } catch {}

    // 기본 너비 초기값 지능형 설정 (불필요하게 넓은 컬럼 슬림화)
    const initial: Record<string, number> = {};
    (sheet.headers || []).forEach((h) => {
      initial[h] = getSmartColumnWidth(h);
    });
    setColWidths(initial);
  }, [sheet.name, sheet.headers]);

  // 컬럼 너비 변경 핸들러
  const handleColWidthChange = (header: string, width: number) => {
    setColWidths((prev) => {
      const next = { ...prev, [header]: width };
      try {
        if (sheet?.name) {
          localStorage.setItem(`fts_col_widths_${sheet.name}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  // 컬럼 너비 자동 맞춤 (Auto-fit): 최장 텍스트 길이에 맞춰 지능형 확장
  const handleColAutoFit = (header: string) => {
    let maxPixel = header.length * 14;
    const sampleRows = (sheet.rows || []).slice(0, 100);
    sampleRows.forEach((r) => {
      const val = r[header];
      if (val !== undefined && val !== null) {
        const str = String(val);
        let px = 0;
        for (let i = 0; i < str.length; i++) {
          px += str.charCodeAt(i) > 127 ? 13 : 8;
        }
        if (px > maxPixel) maxPixel = px;
      }
    });

    const fitWidth = Math.max(70, Math.min(650, maxPixel + 40));
    handleColWidthChange(header, fitWidth);
  };

  // 컬럼 너비 기본값 복원
  const handleResetColWidth = (header: string) => {
    const defaultW = header === '일련번호' ? 75 : header === '등록일시' ? 150 : 130;
    handleColWidthChange(header, defaultW);
  };

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
      <ValidationBanner
        validationResult={validationResult}
        totalRowCount={sheet.rows?.length || 0}
        filterOnlyErrors={filterOnlyErrors}
        onToggleFilterOnlyErrors={() => setFilterOnlyErrors((prev) => !prev)}
        onOpenRuleModal={() => setIsRuleModalOpen(true)}
        activeRuleCount={rules.filter((r) => r.enabled).length}
      />

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
            onSetColSort={onSetColSort}
            colWidths={colWidths}
            onColWidthChange={handleColWidthChange}
            onColAutoFit={handleColAutoFit}
            onResetColWidth={handleResetColWidth}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onJumpToOriginalDoc) {
                              onJumpToOriginalDoc(rowFileName, row._fileId, row._fileUid);
                            }
                          }}
                          title={`📄 원본 증빙 바로가기: ${rowFileName}\n(클릭 시 원본 증빙 대조 탭으로 이동하여 이 파일이 바로 열립니다)`}
                          className={`p-1 rounded cursor-pointer transition hover:scale-110 active:scale-95 ${
                            isSame
                              ? 'text-indigo-600 bg-indigo-100 ring-1 ring-indigo-400'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 기본 시트 컬럼 렌더링 */}
                  {sheet.headers.map((header, colIdx) => {
                    const isEditing = editingCell?.rowIdx === actualIdx && editingCell?.colKey === header;
                    let cellVal = row[header] ?? '';
                    if (header === '등록일시' && (!cellVal || String(cellVal).trim() === '')) {
                      const matchedDoc = (sheet.originalFiles || []).find(
                        (f) =>
                          (row._fileUid && f.id === row._fileUid) ||
                          (row._fileId && f.id === row._fileId) ||
                          (row._fileName && f.name === row._fileName)
                      );
                      if (matchedDoc?.uploadedAt) {
                        cellVal = matchedDoc.uploadedAt;
                      }
                    }
                    const isFkCol = relations.some((r) => r.foreignKey === header);
                    const w = colWidths[header];
                    const cellError = validationResult.errorMap.get(`${actualIdx}_${header}`);

                    return (
                      <td
                        key={colIdx}
                        style={{
                          width: w ? `${w}px` : undefined,
                          minWidth: w ? `${w}px` : '80px',
                          maxWidth: w ? `${w}px` : undefined,
                        }}
                        title={cellError ? cellError.message : undefined}
                        onDoubleClick={() => {
                          setEditingCell({ rowIdx: actualIdx, colKey: header });
                          setEditValue(String(cellVal));
                        }}
                        className={`px-3 py-2 border-r border-slate-200 text-slate-700 truncate cursor-cell relative transition-colors ${
                          cellError
                            ? 'bg-rose-50/90 text-rose-950 font-medium ring-1 ring-rose-300 ring-inset'
                            : isFkCol
                            ? 'bg-indigo-50/20'
                            : ''
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
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
                            {cellError?.suggestedFix !== undefined && (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // onBlur 방지
                                  setEditValue(String(cellError.suggestedFix));
                                }}
                                className="text-[10px] text-left px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-sans flex items-center gap-1 transition-colors select-none"
                                title="클릭 시 계산된 정상 값으로 자동 치환합니다"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                <span>계산값({cellError.suggestedFix})으로 수정</span>
                              </button>
                            )}
                            {isFkCol && targetKeyOptions.length > 0 && (
                              <datalist id="fk-key-suggestions">
                                {targetKeyOptions.map((opt) => (
                                  <option key={opt} value={opt} />
                                ))}
                              </datalist>
                            )}
                          </div>
                        ) : (
                          <div className={`flex items-center justify-between gap-1.5 truncate ${isNumericColumn(header, cellVal) ? 'justify-end font-mono' : ''}`}>
                            <span className="truncate">
                              {isNumericColumn(header, cellVal)
                                ? renderFormattedNumber(cellVal)
                                : String(cellVal)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {cellError && (
                                <span
                                  title={cellError.message}
                                  className="flex items-center justify-center w-4 h-4 rounded bg-rose-200 text-rose-700 animate-pulse cursor-help"
                                >
                                  <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                                </span>
                              )}
                              {isFkCol && cellVal && (
                                <span
                                  title="외래키(FK) 값"
                                  className="text-[10px] text-indigo-400 opacity-60 group-hover:opacity-100"
                                >
                                  🔗
                                </span>
                              )}
                            </div>
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
        totalRows={displayRows.length}
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

      {/* 데이터 유효성 검증 규칙 관리 모달 */}
      <ValidationRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        headers={sheet.headers || []}
        rules={rules}
        onUpdateRules={handleUpdateRules}
      />
    </>
  );
}
