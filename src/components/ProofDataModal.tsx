'use client';

import React from 'react';
import { Table, X, FileText, Database, ArrowRight } from 'lucide-react';

interface ProofDataModalProps {
  show: boolean;
  onClose: () => void;
  fileName: string;
  headers: string[];
  rows: Record<string, any>[];
  onGoToTableTab?: () => void;
}

export function ProofDataModal({
  show,
  onClose,
  fileName,
  headers,
  rows,
  onGoToTableTab,
}: ProofDataModalProps) {
  if (!show) return null;

  const displayHeaders = headers.filter((h) => !h.startsWith('_'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* 🌟 가로폭을 화면의 96~98%까지 최대로 사용하는 넓은 와이드 팝업 컨테이너 */}
      <div className="bg-white rounded-2xl w-full max-w-[96vw] xl:max-w-[98vw] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[92vh]">
        {/* 모달 헤더 */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Database className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-800 text-sm shrink-0">적재된 데이터 조회</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold truncate max-w-sm sm:max-w-md">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold shrink-0">
              총 {rows.length}행 적재됨
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition shrink-0"
            title="창 닫기 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 테이블 (가로/세로 전체 100% 뷰포트 활용) */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50/50">
          {rows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <Table className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-600 text-sm">이 원본 파일에서 적재된 데이터 행이 없습니다.</p>
              <p className="mt-1">표 데이터에서 행이 삭제되었거나 아직 추출되지 않았습니다.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs min-w-full inline-block align-middle">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 select-none shadow-2xs">
                  <tr>
                    <th className="w-12 px-3 py-2.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200 bg-slate-100">
                      #
                    </th>
                    {displayHeaders.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap bg-slate-100/90 tracking-wide"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-indigo-50/40 transition">
                      <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200 bg-slate-50/60 select-none">
                        {rowIdx + 1}
                      </td>
                      {displayHeaders.map((header, colIdx) => {
                        const val = row[header] ?? '';
                        return (
                          <td
                            key={colIdx}
                            className="px-4 py-2 border-r border-slate-200 text-slate-700 min-w-[120px] max-w-md truncate"
                            title={String(val)}
                          >
                            {String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 모달 풋터 */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            💡 이 원본 파일에서 추출되어 현재 시트에 보관된 실제 데이터 행 목록입니다.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {onGoToTableTab && (
              <button
                onClick={() => {
                  onClose();
                  onGoToTableTab();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl transition"
              >
                <span>표 데이터 탭으로 이동</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition shadow-xs"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
