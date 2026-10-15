'use client';

import React from 'react';
import { Columns, X } from 'lucide-react';

interface AddColumnModalProps {
  show: boolean;
  onClose: () => void;
  newColumnName: string;
  setNewColumnName: (name: string) => void;
  onAddColumn: () => void;
}

export function AddColumnModal({
  show,
  onClose,
  newColumnName,
  setNewColumnName,
  onAddColumn,
}: AddColumnModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Columns className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">새 열(컬럼) 추가</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          추가할 열의 이름을 입력해 주세요. (예: 비고, 확인자, 거래처코드)
        </p>

        <input
          autoFocus
          type="text"
          placeholder="열 이름 입력..."
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddColumn();
            if (e.key === 'Escape') onClose();
          }}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white mb-4"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            취소
          </button>
          <button
            onClick={onAddColumn}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-98"
          >
            추가하기
          </button>
        </div>
      </div>
    </div>
  );
}
