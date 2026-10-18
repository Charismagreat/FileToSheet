'use client';

import React, { useState, useEffect } from 'react';
import { Columns, Link2, X, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { ParsedSheet, SheetRelation } from '@/lib/parser';

interface AddColumnModalProps {
  show: boolean;
  onClose: () => void;
  newColumnName: string;
  setNewColumnName: (name: string) => void;
  onAddColumn: (customName?: string, relation?: SheetRelation) => void;
  sheets?: ParsedSheet[];
  activeSheetIndex?: number;
}

export function AddColumnModal({
  show,
  onClose,
  newColumnName,
  setNewColumnName,
  onAddColumn,
  sheets = [],
  activeSheetIndex = 0,
}: AddColumnModalProps) {
  const [mode, setMode] = useState<'normal' | 'foreign_key'>('normal');

  // 외래키 설정 상태
  const currentSheet = sheets[activeSheetIndex];
  const targetSheets = sheets.filter((_, idx) => idx !== activeSheetIndex);

  const [selectedTargetSheet, setSelectedTargetSheet] = useState<string>('');
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>('');
  const [selectedDisplayCols, setSelectedDisplayCols] = useState<string[]>([]);
  const [fkColName, setFkColName] = useState<string>('');

  // 대상 시트 변경 시 초기화
  useEffect(() => {
    if (targetSheets.length > 0 && !selectedTargetSheet) {
      setSelectedTargetSheet(targetSheets[0].name);
    }
  }, [targetSheets, selectedTargetSheet]);

  const targetSheetObj = targetSheets.find((s) => s.name === selectedTargetSheet);

  useEffect(() => {
    if (targetSheetObj && targetSheetObj.headers.length > 0) {
      const defaultKey = targetSheetObj.headers[0];
      setSelectedTargetKey(defaultKey);
      setFkColName(`fk_${targetSheetObj.name}_${defaultKey}`);
      setSelectedDisplayCols(targetSheetObj.headers.slice(1, 3));
    } else {
      setSelectedTargetKey('');
      setFkColName('');
      setSelectedDisplayCols([]);
    }
  }, [selectedTargetSheet, targetSheetObj]);

  if (!show) return null;

  const handleTargetKeyChange = (key: string) => {
    setSelectedTargetKey(key);
    if (targetSheetObj) {
      setFkColName(`fk_${targetSheetObj.name}_${key}`);
    }
  };

  const toggleDisplayCol = (col: string) => {
    setSelectedDisplayCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleConfirm = () => {
    if (mode === 'normal') {
      const name = newColumnName.trim();
      if (!name) return;
      onAddColumn(name);
    } else {
      const colName = (fkColName || `fk_${selectedTargetSheet}_${selectedTargetKey}`).trim();
      if (!colName || !selectedTargetSheet || !selectedTargetKey) return;

      const relation: SheetRelation = {
        foreignKey: colName,
        targetSheetName: selectedTargetSheet,
        targetKey: selectedTargetKey,
        displayColumns: selectedDisplayCols,
      };

      onAddColumn(colName, relation);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              {mode === 'normal' ? <Columns className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {mode === 'normal' ? '새 열(컬럼) 추가' : '외래키(FK) 참조 열 추가'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentSheet ? `현재 시트: [${currentSheet.name}]` : '시트 데이터 확장'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 전환 버튼 */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('normal')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              mode === 'normal'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            일반 열 추가
          </button>
          <button
            type="button"
            onClick={() => setMode('foreign_key')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              mode === 'foreign_key'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-indigo-500" />
            🔗 외래키(조인 열)
          </button>
        </div>

        {mode === 'normal' ? (
          <div>
            <p className="text-xs text-slate-500 mb-3">
              추가할 열의 이름을 입력해 주세요. (예: 비고, 담당자, 승인여부)
            </p>

            <input
              autoFocus
              type="text"
              placeholder="열 이름 입력..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') onClose();
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white mb-4"
            />
          </div>
        ) : (
          <div className="space-y-3.5">
            {targetSheets.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">참조할 다른 시트가 없습니다.</p>
                  <p className="text-[11px] text-amber-700">
                    외래키 조인을 사용하려면 프로젝트 내에 2개 이상의 시트(예: 거래처마스터, 발주내역 등)가 필요합니다. 상단에서 새 문서를 추가해 보세요.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-800 flex items-start gap-2">
                  <Database className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                  <div>
                    <span className="font-bold">외래키(Foreign Key) 적재 원리</span>
                    <p className="text-[10.5px] text-indigo-700 mt-0.5">
                      이 열에 입력된 키(예: 사업자번호, 주문번호)를 기준으로 다른 시트의 데이터를 1:1 실시간 조인하여 대조할 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* 1. 참조 대상 시트 선택 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    참조 대상 시트 (Target Sheet)
                  </label>
                  <select
                    value={selectedTargetSheet}
                    onChange={(e) => setSelectedTargetSheet(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {targetSheets.map((s) => (
                      <option key={s.name} value={s.name}>
                        📑 {s.name} ({s.rows.length}행)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. 대상 시트의 기준 키(Primary Key) 열 선택 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    조인 기준 열 (Primary Key)
                  </label>
                  <select
                    value={selectedTargetKey}
                    onChange={(e) => handleTargetKeyChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {targetSheetObj?.headers.map((h) => (
                      <option key={h} value={h}>
                        🔑 {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. 생성될 외래키 열 이름 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    현재 시트에 추가될 열 이름
                  </label>
                  <input
                    type="text"
                    value={fkColName}
                    onChange={(e) => setFkColName(e.target.value)}
                    placeholder="예: 사업자등록번호 또는 fk_vendor_code"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                  />
                </div>

                {/* 4. 조인 시 함께 가져올 표시 열 선택 */}
                {targetSheetObj && targetSheetObj.headers.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      조인 뷰에서 함께 대조할 보조 열 선택
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                      {targetSheetObj.headers
                        .filter((h) => h !== selectedTargetKey)
                        .map((h) => {
                          const isChecked = selectedDisplayCols.includes(h);
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => toggleDisplayCol(h)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                                isChecked
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-3 h-3" />}
                              {h}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            취소
          </button>
          <button
            disabled={mode === 'foreign_key' && targetSheets.length === 0}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition active:scale-98 ${
              mode === 'foreign_key' && targetSheets.length === 0
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {mode === 'normal' ? '열 추가하기' : '🔗 외래키 열 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
