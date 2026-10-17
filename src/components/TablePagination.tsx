'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TablePagination({
  currentPage,
  totalRows,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  if (totalRows === 0) return null;

  const isAll = pageSize >= 999999;
  const totalPages = isAll ? 1 : Math.ceil(totalRows / pageSize);
  const startRow = isAll ? 1 : (currentPage - 1) * pageSize + 1;
  const endRow = isAll ? totalRows : Math.min(currentPage * pageSize, totalRows);

  // 보여줄 페이지 번호 계산 (현재 페이지 기준 최대 5개)
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
      {/* 1. 페이지당 개수 선택기 및 범위 표시 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">보기:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value={25}>25개씩</option>
            <option value={50}>50개씩 (기본)</option>
            <option value={100}>100개씩</option>
            <option value={200}>200개씩</option>
            <option value={999999}>전체 보기</option>
          </select>
        </div>

        <span className="text-slate-300">|</span>

        <span className="text-slate-500 font-mono">
          총 <strong className="text-slate-800 font-semibold">{totalRows.toLocaleString()}</strong>건 중{' '}
          <strong className="text-blue-600 font-semibold">{startRow}</strong> -{' '}
          <strong className="text-blue-600 font-semibold">{endRow}</strong>건
        </span>
      </div>

      {/* 2. 페이지 이동 내비게이션 바 */}
      {!isAll && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-600"
            title="첫 페이지"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-600"
            title="이전 페이지"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 mx-1">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-600"
            title="다음 페이지"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition text-slate-600"
            title="마지막 페이지"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
