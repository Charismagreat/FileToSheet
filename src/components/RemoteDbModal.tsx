'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Globe, Database, Key, CheckCircle, AlertCircle, RefreshCw,
  Sparkles, Download, Layers, ShieldCheck, ArrowRight, Eye, Table as TableIcon
} from 'lucide-react';
import {
  RemoteDbConfig,
  getRemoteDbConfig,
  saveRemoteDbConfig,
  testRemoteDbConnection,
  fetchRemoteTableData,
  DEFAULT_REMOTE_CONFIG,
} from '@/lib/remote-db';

interface RemoteDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportToSheet?: (sheet: { name: string; headers: string[]; rows: Record<string, any>[] }) => void;
  onOpenAiChatWithScope?: (scope: 'remote_db') => void;
}

export function RemoteDbModal({
  isOpen,
  onClose,
  onImportToSheet,
  onOpenAiChatWithScope,
}: RemoteDbModalProps) {
  const [config, setConfig] = useState<RemoteDbConfig>(DEFAULT_REMOTE_CONFIG);
  const [testing, setTesting] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    const current = getRemoteDbConfig();
    setConfig(current);
    if (current.cachedRows && current.cachedRows.length > 0) {
      setPreviewRows(current.cachedRows);
      setPreviewCols(current.cachedColumns || []);
      setTotalRows(current.cachedRowCount || current.cachedRows.length);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. 연결 테스트
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const res = await testRemoteDbConnection(config);
    setTesting(false);

    if (res.success) {
      setTestResult({ success: true, message: `연결 성공! 원격 My DB에 ${res.tables?.length || 0}개 테이블 감지` });
      const updated: RemoteDbConfig = {
        ...config,
        isConnected: true,
        lastConnectedAt: new Date().toISOString(),
        availableTables: res.tables || [],
      };
      setConfig(updated);
      saveRemoteDbConfig(updated);

      // 자동으로 Product 테이블 데이터 가져오기 시도
      handleFetchData(updated);
    } else {
      setTestResult({ success: false, error: res.error || '연결 실패' });
    }
  };

  // 2. 원격 테이블 데이터 조회
  const handleFetchData = async (activeConfig: RemoteDbConfig = config) => {
    setFetching(true);
    const res = await fetchRemoteTableData(activeConfig, 200);
    setFetching(false);

    if (res.success && res.rows) {
      setPreviewRows(res.rows);
      setPreviewCols(res.columns || []);
      setTotalRows(res.totalRows || res.rows.length);
      const updated: RemoteDbConfig = {
        ...activeConfig,
        isConnected: true,
        lastConnectedAt: new Date().toISOString(),
        cachedColumns: res.columns || [],
        cachedRows: res.rows,
        cachedRowCount: res.totalRows || res.rows.length,
      };
      setConfig(updated);
      saveRemoteDbConfig(updated);
    } else {
      alert(`데이터 조회 실패: ${res.error || '테이블 데이터를 가져올 수 없습니다.'}`);
    }
  };

  // 3. FileToSheet 새 시트로 복사 가져오기
  const handleImportToSheet = () => {
    if (previewRows.length === 0 || previewCols.length === 0) {
      alert('가져올 원격 데이터가 없습니다. 먼저 [연결 및 데이터 조회]를 실행해 주세요.');
      return;
    }

    if (onImportToSheet) {
      const sheetName = `원격_${config.tableName}_DB`;
      onImportToSheet({
        name: sheetName,
        headers: previewCols,
        rows: previewRows,
      });
      alert(`원격 [${config.tableName}] 테이블 데이터(${previewRows.length}행)가 새로운 시트 ['${sheetName}']로 추가되었습니다!`);
      onClose();
    }
  };

  // 4. AI 비서로 분석 모드 전환
  const handleAnalyzeWithAi = () => {
    if (onOpenAiChatWithScope) {
      onClose();
      onOpenAiChatWithScope('remote_db');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden text-slate-800 relative">
        {/* 헤더 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">원격지 이지데스크 My DB 연동</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  config.isConnected
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${config.isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {config.isConnected ? `연결됨 (${config.tableName})` : '미연결'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                터널링 서비스를 통해 원격 서버의 <strong>Product</strong> 데이터베이스에 접속하여 실시간 조회 및 AI 분석
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40 text-xs">
          {/* 1. 연결 설정 섹션 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-600" />
                원격 이지데스크 터널링 접속 정보
              </span>
              {config.lastConnectedAt && (
                <span className="text-[11px] text-slate-400">
                  마지막 통신: {new Date(config.lastConnectedAt).toLocaleTimeString('ko-KR')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 터널 URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  원격 터널링 URL (Public Tunnel)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.tunnelUrl}
                    onChange={(e) => setConfig({ ...config, tunnelUrl: e.target.value })}
                    placeholder="https://tunneling-service.onrender.com/t/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  원격 X-Api-Key (이지데스크 공용키)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="a67ddc0f-..."
                    className="w-full pl-3 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-2 px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded transition"
                  >
                    {showApiKey ? '숨김' : '표시'}
                  </button>
                </div>
              </div>
            </div>

            {/* 대상 테이블명 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700">대상 테이블:</span>
                <input
                  type="text"
                  value={config.tableName}
                  onChange={(e) => setConfig({ ...config, tableName: e.target.value })}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-700 focus:bg-white focus:outline-hidden w-36"
                />
                <span className="text-[11px] text-slate-400">
                  (기본값: Product / products)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? '터널 연결 확인 중...' : '원격 터널 연결 테스트'}</span>
                </button>
              </div>
            </div>

            {/* 테스트 결과 메시지 */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.success ? testResult.message : testResult.error}</span>
              </div>
            )}

            {/* 원격지 감지된 테이블 목록 태그 */}
            {config.availableTables && config.availableTables.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold">감지된 테이블:</span>
                {config.availableTables.map((t) => (
                  <button
                    key={t.tableName}
                    type="button"
                    onClick={() => {
                      const next = { ...config, tableName: t.tableName };
                      setConfig(next);
                      handleFetchData(next);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition ${
                      config.tableName.toLowerCase() === t.tableName.toLowerCase()
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t.tableName} {t.rowCount != null ? `(${t.rowCount})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. 원격 데이터 실시간 프리뷰 섹션 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-sm text-slate-900">
                  원격 [{config.tableName}] 테이블 실시간 데이터
                </span>
                <span className="text-[11px] font-mono bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  총 {totalRows.toLocaleString()}건
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFetchData()}
                  disabled={fetching}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                  title="원격 데이터 새로고침"
                >
                  <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>
            </div>

            {/* 표 영역 */}
            <div className="max-h-[300px] overflow-auto">
              {previewRows.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Database className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">조회된 데이터가 없습니다.</p>
                  <p className="text-[11px] text-slate-400">
                    상단 [원격 터널 연결 테스트] 버튼을 클릭하여 원격 Product 테이블 데이터를 불러오세요.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center text-slate-400">#</th>
                      {previewCols.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-semibold uppercase text-slate-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                    {previewRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition">
                        <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                        {previewCols.map((col) => (
                          <td key={col} className="py-2 px-3 whitespace-nowrap max-w-[200px] truncate" title={String(row[col] ?? '')}>
                            {String(row[col] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 액션 바 */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>X-Api-Key 기반 종단간 암호화 터널로 안전하게 데이터가 중계됩니다.</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 1. 시트로 가져오기 버튼 */}
            <button
              type="button"
              onClick={handleImportToSheet}
              disabled={previewRows.length === 0}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 active:scale-95"
              title="원격 데이터를 새로운 시트로 추가합니다"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>새 시트로 가져오기</span>
            </button>

            {/* 2. AI 비서로 분석하기 버튼 */}
            <button
              type="button"
              onClick={handleAnalyzeWithAi}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
              title="AI 비서 대화창을 열고 원격 Product DB 분석을 시작합니다"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI 비서로 Product 분석하기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
