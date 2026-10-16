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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* 모달 헤더 */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 text-sm">적재된 데이터 조회</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <FileText className="w-3 h-3" />
              <span className="max-w-[200px] truncate">{fileName}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
              총 {rows.length}행
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 테이블 */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Table className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-600">이 원본 파일에서 적재된 데이터 행이 없습니다.</p>
              <p className="mt-1">표 데이터에서 행이 삭제되었거나 아직 파싱되지 않았습니다.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="w-10 px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                      #
                    </th>
                    {displayHeaders.map((header, idx) => (
                      <th key={idx} className="px-3.5 py-2 border-r border-slate-200 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-indigo-50/30 transition">
                      <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200 bg-slate-50/50">
                        {rowIdx + 1}
                      </td>
                      {displayHeaders.map((header, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-3.5 py-2 border-r border-slate-200 text-slate-700 max-w-xs truncate"
                          title={String(row[header] ?? '')}
                        >
                          {String(row[header] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 모달 풋터 */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            * 이 표는 원본 파일에서 추출되어 현재 시트에 보관된 데이터의 실시간 상태입니다.
          </span>
          <div className="flex items-center gap-2">
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
