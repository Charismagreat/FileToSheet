'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Search,
  Loader2,
  AlertCircle,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { renderFormattedNumber, isNumericColumn } from '@/lib/formatters';

interface ExcelPreviewViewerProps {
  fileUrl: string;
  filename: string;
  dataUrl?: string;
  fileId?: number | string;
}

interface ParsedWorksheet {
  name: string;
  data: any[][];
  maxCols: number;
  totalRows: number;
}

// 엑셀 열 인덱스(0 -> A, 1 -> B, 26 -> AA ...) 변환 헬퍼
function getColumnLetter(colIdx: number): string {
  let letter = '';
  let temp = colIdx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function ExcelPreviewViewer({
  fileUrl,
  filename,
  dataUrl,
  fileId,
}: ExcelPreviewViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedWorksheet[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // 1. 엑셀/CSV 파일 데이터 비동기 로딩 및 파싱
  useEffect(() => {
    let isCancelled = false;

    async function loadWorkbook() {
      setLoading(true);
      setError(null);

      try {
        let buffer: ArrayBuffer | null = null;

        // 1-1. dataUrl(Base64)이 있는 경우 즉시 ArrayBuffer 변환
        if (dataUrl && dataUrl.startsWith('data:')) {
          const base64Data = dataUrl.split(',')[1];
          if (base64Data) {
            const binaryStr = atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            buffer = bytes.buffer;
          }
        }

        // 1-2. dataUrl이 없거나 실패한 경우 네트워크 fetch 시도
        if (!buffer) {
          const fetchUrl =
            fileUrl ||
            (fileId && !isNaN(Number(fileId)) && Number(fileId) > 0
              ? `/api/files/${fileId}`
              : null);

          if (!fetchUrl) {
            throw new Error('파일 접근 URL을 찾을 수 없습니다.');
          }

          const res = await fetch(fetchUrl);
          if (!res.ok) {
            throw new Error(`파일 다운로드 실패 (${res.status} ${res.statusText})`);
          }
          buffer = await res.arrayBuffer();
        }

        if (isCancelled) return;

        // 1-3. SheetJS 워크북 파싱
        const workbook = XLSX.read(buffer, {
          type: 'array',
          cellDates: true,
          raw: false, // 포맷팅된 문자열 반환 유지
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('엑셀 파일 내에 시트가 존재하지 않습니다.');
        }

        const parsedSheets: ParsedWorksheet[] = [];

        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          if (!ws) continue;

          // 2차원 배열로 변환
          const rawData: any[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: '',
            blankrows: true,
          });

          // 최대 열 개수 계산
          let maxCols = 0;
          rawData.forEach((row) => {
            if (Array.isArray(row) && row.length > maxCols) {
              maxCols = row.length;
            }
          });

          parsedSheets.push({
            name: sheetName,
            data: rawData,
            maxCols: Math.max(maxCols, 1),
            totalRows: rawData.length,
          });
        }

        if (!isCancelled) {
          setSheets(parsedSheets);
          setActiveSheetIdx(0);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[ExcelPreviewViewer] 파싱 에러:', err);
          setError(err?.message || '엑셀 파일을 읽는 중 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    }

    loadWorkbook();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, dataUrl, fileId]);

  const currentSheet = sheets[activeSheetIdx] || null;

  // 2. 검색어 필터링 및 하이라이트 매칭
  const filteredData = useMemo(() => {
    if (!currentSheet) return [];
    if (!searchQuery.trim()) return currentSheet.data;

    const query = searchQuery.trim().toLowerCase();
    return currentSheet.data.filter((row) =>
      row.some((cell) =>
        cell !== undefined && cell !== null && String(cell).toLowerCase().includes(query)
      )
    );
  }, [currentSheet, searchQuery]);

  // 로딩 상태 렌더링
  if (loading) {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-white/80 rounded-xl border border-slate-200 shadow-2xs">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">엑셀 원본 스프레드시트 불러오는 중...</p>
        <span className="text-xs text-slate-400 mt-1">{filename}</span>
      </div>
    );
  }

  // 에러 발생 시 fallback 안내 렌더링
  if (error || !currentSheet) {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-rose-200 shadow-2xs text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
        <h4 className="font-bold text-slate-800 text-sm mb-1">스프레드시트 프리뷰 로드 실패</h4>
        <p className="text-xs text-slate-500 mb-4 max-w-sm">{error || '시트 데이터를 파싱하지 못했습니다.'}</p>
        <a
          href={fileUrl}
          download={filename}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5" /> 원본 파일 다운로드
        </a>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden transition-all ${
        isFullScreen
          ? 'fixed inset-4 z-50 shadow-2xl border-slate-300'
          : 'w-full h-full min-h-0'
      }`}
    >
      {/* 🌟 1. 프리뷰 상단 서브 헤더 (시트 탭 + 검색창 + 전체화면 버튼) */}
      <div className="h-10 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 select-none text-xs">
        {/* 좌측: 시트 탭 목록 */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded text-[11px] shrink-0 mr-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">시트:</span>
          </div>
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSheetIdx(idx)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSheetIdx === idx
                  ? 'bg-white text-emerald-800 font-bold border border-slate-300/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <span>{sheet.name}</span>
              <span className="text-[10px] opacity-60 font-mono">({sheet.totalRows}행)</span>
            </button>
          ))}
        </div>

        {/* 우측: 검색창 및 컨트롤 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="셀 검색..."
              className="pl-7 pr-6 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-28 sm:w-36 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 전체화면 토글 */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title={isFullScreen ? '원래 크기로' : '전체화면'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 🌟 2. 엑셀 정통 2D 그리드 (A, B, C... / 1, 2, 3...) */}
      <div className="flex-1 overflow-auto bg-slate-50 relative select-text">
        <table className="border-collapse table-auto text-xs bg-white min-w-full">
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300">
              {/* 왼쪽 위 모서리 (Row index header) */}
              <th className="sticky left-0 z-30 w-12 min-w-[48px] bg-slate-200/90 text-slate-500 font-mono text-[11px] font-bold text-center border-r border-b border-slate-300 py-1.5 px-1 select-none">
                #
              </th>
              {/* 엑셀 열 알파벳 헤더 (A, B, C...) */}
              {Array.from({ length: currentSheet.maxCols }).map((_, colIdx) => (
                <th
                  key={colIdx}
                  className="bg-slate-100 text-slate-600 font-mono font-bold text-[11px] text-center border-r border-b border-slate-300 px-3 py-1.5 min-w-[90px] select-none hover:bg-slate-200 transition"
                >
                  {getColumnLetter(colIdx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIdx) => {
              // 행 번호 (1부터 시작하는 엑셀 표준)
              const excelRowNum = rowIdx + 1;
              const isEven = rowIdx % 2 === 0;

              return (
                <tr
                  key={rowIdx}
                  className={`hover:bg-emerald-50/50 transition border-b border-slate-200 ${
                    isEven ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  {/* 행 번호 컬럼 (고정 헤더) */}
                  <td className="sticky left-0 z-10 bg-slate-100 text-slate-500 font-mono text-[10.5px] font-medium text-center border-r border-slate-300 py-1 px-1.5 select-none">
                    {excelRowNum}
                  </td>

                  {/* 실제 셀 데이터들 */}
                  {Array.from({ length: currentSheet.maxCols }).map((_, colIdx) => {
                    const cellVal = row[colIdx];
                    const isBlank = cellVal === undefined || cellVal === null || cellVal === '';
                    const strVal = isBlank ? '' : String(cellVal).trim();

                    // 숫자 여부 판별 (단순 정수/실수/콤마 포함 숫자)
                    const cleanNumStr = strVal.replace(/,/g, '');
                    const isNum = strVal !== '' && !isNaN(Number(cleanNumStr)) && !strVal.startsWith('00') && cleanNumStr.length <= 15;

                    // 검색어 매칭 하이라이트 여부
                    const isMatched =
                      searchQuery.trim() !== '' &&
                      strVal.toLowerCase().includes(searchQuery.trim().toLowerCase());

                    return (
                      <td
                        key={colIdx}
                        className={`border-r border-slate-200 px-2.5 py-1 text-slate-700 whitespace-nowrap max-w-[280px] truncate ${
                          isNum ? 'text-right font-mono' : 'text-left'
                        } ${isMatched ? 'bg-amber-100/90 font-bold text-amber-900 ring-1 ring-amber-300' : ''}`}
                        title={strVal}
                      >
                        {isNum && !strVal.includes('-') && !strVal.includes(':') ? (
                          renderFormattedNumber(cleanNumStr)
                        ) : (
                          strVal
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            {searchQuery ? '검색어와 일치하는 셀 데이터가 없습니다.' : '시트에 데이터가 비어 있습니다.'}
          </div>
        )}
      </div>

      {/* 🌟 3. 하단 상태 바 (총 행 수, 열 수, 안내 문구) */}
      <div className="h-7 px-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>
            총 <b className="text-slate-700 font-mono">{currentSheet.totalRows}</b>행 × <b className="text-slate-700 font-mono">{currentSheet.maxCols}</b>열
          </span>
          {searchQuery && (
            <span className="text-emerald-700 font-medium">
              (검색 필터: {filteredData.length}행 일치)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px]">
            * 원본 엑셀 셀 내용 그대로 대조 가능
          </span>
        </div>
      </div>
    </div>
  );
}
