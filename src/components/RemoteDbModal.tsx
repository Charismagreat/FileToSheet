'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Globe, Database, Key, CheckCircle, AlertCircle, RefreshCw,
  Sparkles, Download, Layers, ShieldCheck, ArrowRight, Eye, Table as TableIcon,
  CheckSquare, Square, FolderPlus, Plus
} from 'lucide-react';
import {
  RemoteDbConfig,
  getRemoteDbConfig,
  saveRemoteDbConfig,
  testRemoteDbConnection,
  fetchRemoteTableData,
  fetchRemoteMultipleTables,
  DEFAULT_REMOTE_CONFIG,
} from '@/lib/remote-db';

export interface RemoteDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportToSheet?: (sheet: { name: string; headers: string[]; rows: Record<string, any>[] }) => void;
  onImportTablesToNewProject?: (project: { name: string; sheets: Array<{ name: string; headers: string[]; rows: Record<string, any>[] }> }) => void;
  onImportMultipleSheetsToCurrentProject?: (sheets: Array<{ name: string; headers: string[]; rows: Record<string, any>[] }>) => void;
  onOpenAiChatWithScope?: (scope: 'remote_db') => void;
}

export function RemoteDbModal({
  isOpen,
  onClose,
  onImportToSheet,
  onImportTablesToNewProject,
  onImportMultipleSheetsToCurrentProject,
  onOpenAiChatWithScope,
}: RemoteDbModalProps) {
  const [config, setConfig] = useState<RemoteDbConfig>(DEFAULT_REMOTE_CONFIG);
  const [testing, setTesting] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(false);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [batchStatusText, setBatchStatusText] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const current = getRemoteDbConfig();
    const effectiveConfig: RemoteDbConfig = {
      ...current,
      environment: current.environment || 'production',
    };
    setConfig(effectiveConfig);
    if (effectiveConfig.cachedRows && effectiveConfig.cachedRows.length > 0) {
      setPreviewRows(effectiveConfig.cachedRows);
      setPreviewCols(effectiveConfig.cachedColumns || []);
      setTotalRows(effectiveConfig.cachedRowCount || effectiveConfig.cachedRows.length);
    }
    // 실제 연결되어 테이블이 감지된 경우에만 기본 선택
    if (effectiveConfig.isConnected && effectiveConfig.availableTables && effectiveConfig.availableTables.length > 0) {
      setSelectedTables(effectiveConfig.availableTables.map((t) => t.tableName));
    } else {
      setSelectedTables([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. 원격 터널 연결 테스트 및 전체 테이블 목록 조회
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const res = await testRemoteDbConnection(config);
    setTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: `연결 성공! 원격 My DB(${config.environment === 'production' ? '운용' : '개발'})에 ${res.tables?.length || 0}개 테이블 감지 완료`,
      });
      const tableNames = (res.tables || []).map((t) => t.tableName);
      const updated: RemoteDbConfig = {
        ...config,
        isConnected: true,
        lastConnectedAt: new Date().toISOString(),
        availableTables: res.tables || [],
      };
      setConfig(updated);
      setSelectedTables(tableNames);
      saveRemoteDbConfig(updated);

      // 현재 선택된 테이블(Product 등) 데이터 프리뷰 자동 조회
      handleFetchData(updated);
    } else {
      setTestResult({ success: false, error: res.error || '연결 실패' });
    }
  };

  // 2. 단일 원격 테이블 데이터 조회 (미리보기)
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

  // 테이블 선택 토글
  const toggleTableSelection = (tName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tName) ? prev.filter((name) => name !== tName) : [...prev, tName]
    );
  };

  const selectAllTables = () => {
    if (!config.availableTables) return;
    setSelectedTables(config.availableTables.map((t) => t.tableName));
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  // [방안 1 핵심] 3. 선택된 모든 테이블을 새 전용 프로젝트로 열어 '표 데이터' 탭에 1:1 매핑
  const handleOpenAsNewProject = async () => {
    if (!config.isConnected) {
      alert('원격 터널링 서버에 아직 연결되지 않았습니다.\n먼저 상단의 [원격 터널 연결 및 전체 테이블 감지] 버튼을 눌러주세요.');
      return;
    }
    if (selectedTables.length === 0) {
      alert('가져올 테이블을 최소 1개 이상 선택해 주세요.');
      return;
    }

    setBatchLoading(true);
    setBatchStatusText(`원격 ${selectedTables.length}개 테이블 데이터를 일괄 조회하는 중...`);

    const res = await fetchRemoteMultipleTables(config, selectedTables, 200);
    setBatchLoading(false);

    if (!res.success || !res.tables || res.tables.length === 0) {
      alert(`테이블 데이터를 불러오지 못했습니다:\n${res.error || '원격 터널 연결 상태 및 API Key를 확인해 주세요.'}`);
      return;
    }

    const envLabel = config.environment === 'production' ? '운용' : '개발';
    const projectName = `🚀 ${envLabel} My DB (${res.tables.length}개 테이블)`;

    const sheets = res.tables.map((t) => ({
      name: t.tableName,
      headers: t.columns.length > 0 ? t.columns : ['id', 'name'],
      rows: t.rows || [],
    }));

    if (onImportTablesToNewProject) {
      onImportTablesToNewProject({
        name: projectName,
        sheets,
      });
      alert(`원격 [${envLabel} My DB] ${res.tables.length}개 테이블이 새 프로젝트로 열렸습니다!\n'표 데이터' 탭에서 모든 테이블을 자유롭게 탐색하고 분석할 수 있습니다.`);
      onClose();
    }
  };

  // [방안 1 확장] 4. 현재 작업 중인 프로젝트에 선택된 모든 테이블을 시트로 일괄 추가
  const handleImportToCurrentProject = async () => {
    if (!config.isConnected) {
      alert('원격 터널링 서버에 아직 연결되지 않았습니다.\n먼저 상단의 [원격 터널 연결 및 전체 테이블 감지] 버튼을 눌러주세요.');
      return;
    }
    if (selectedTables.length === 0) {
      alert('가져올 테이블을 최소 1개 이상 선택해 주세요.');
      return;
    }

    setBatchLoading(true);
    setBatchStatusText(`원격 ${selectedTables.length}개 테이블 데이터를 일괄 조회하는 중...`);

    const res = await fetchRemoteMultipleTables(config, selectedTables, 200);
    setBatchLoading(false);

    if (!res.success || !res.tables || res.tables.length === 0) {
      alert(`테이블 데이터를 불러오지 못했습니다:\n${res.error || '원격 터널 연결 상태 및 API Key를 확인해 주세요.'}`);
      return;
    }

    const envLabel = config.environment === 'production' ? '운용' : '개발';
    const sheets = res.tables.map((t) => ({
      name: `${envLabel}_${t.tableName}`,
      headers: t.columns.length > 0 ? t.columns : ['id', 'name'],
      rows: t.rows || [],
    }));

    if (onImportMultipleSheetsToCurrentProject) {
      onImportMultipleSheetsToCurrentProject(sheets);
      alert(`원격 [${envLabel} My DB] ${sheets.length}개 테이블이 현재 프로젝트의 시트로 추가되었습니다!`);
      onClose();
    } else if (onImportToSheet && sheets.length > 0) {
      // fallback
      sheets.forEach((s) => onImportToSheet(s));
      onClose();
    }
  };

  // 5. 단일 현재 테이블만 새 시트로 복사 가져오기
  const handleImportSingleSheet = () => {
    if (!config.isConnected) {
      alert('원격 터널링 서버에 아직 연결되지 않았습니다.\n먼저 상단의 [원격 터널 연결 및 전체 테이블 감지] 버튼을 눌러주세요.');
      return;
    }
    if (previewRows.length === 0 || previewCols.length === 0) {
      alert('가져올 원격 데이터가 없습니다. 먼저 [원격 터널 연결 테스트] 또는 [새로고침]을 실행해 주세요.');
      return;
    }

    if (onImportToSheet) {
      const envPrefix = config.environment === 'development' ? '개발' : '운용';
      const sheetName = `${envPrefix}_${config.tableName}_DB`;
      onImportToSheet({
        name: sheetName,
        headers: previewCols,
        rows: previewRows,
      });
      alert(`원격 [${envPrefix}서버 ${config.tableName}] 데이터(${previewRows.length}행)가 새로운 시트 ['${sheetName}']로 추가되었습니다!`);
      onClose();
    }
  };

  // 6. AI 비서로 분석 모드 전환
  const handleAnalyzeWithAi = () => {
    if (onOpenAiChatWithScope) {
      onClose();
      onOpenAiChatWithScope('remote_db');
    }
  };

  const allAvailableCount = config.availableTables?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[92vh] flex flex-col overflow-hidden text-slate-800 relative">
        {/* 헤더 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">원격지 이지데스크 My DB 연동</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  config.environment === 'production'
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {config.environment === 'production' ? '🚀 운용서버 (Production)' : '🛠️ 개발서버 (Development)'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  config.isConnected
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${config.isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {config.isConnected ? `연결됨 (${allAvailableCount}개 테이블)` : '미연결'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                원격지 컴퓨터의 터널링 서버에 접속하여 <strong>모든 테이블</strong>을 '표 데이터' 탭에 1:1 시트로 연결하고 조회 및 AI 분석
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40 text-xs">
          {/* 환경 선택 바 및 안내 */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/80 to-purple-50/80 border border-indigo-100 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600" />
                접속 대상 환경:
              </span>
              <div className="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    const updated: RemoteDbConfig = {
                      ...config,
                      environment: 'production',
                      isConnected: false,
                      availableTables: [],
                    };
                    setConfig(updated);
                    setSelectedTables([]);
                    setPreviewRows([]);
                    setPreviewCols([]);
                    setTestResult(null);
                    saveRemoteDbConfig(updated);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    config.environment === 'production'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🚀 운용서버 (Production)</span>
                  <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.2 rounded-full font-normal">권장</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated: RemoteDbConfig = {
                      ...config,
                      environment: 'development',
                      isConnected: false,
                      availableTables: [],
                    };
                    setConfig(updated);
                    setSelectedTables([]);
                    setPreviewRows([]);
                    setPreviewCols([]);
                    setTestResult(null);
                    saveRemoteDbConfig(updated);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    config.environment === 'development'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🛠️ 개발서버 (Development)</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-indigo-900 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {config.environment === 'production'
                  ? '※ 운용서버(Production) 실서비스 My DB에 직접 연결됩니다.'
                  : '※ 개발/테스트용 개발서버(Development) My DB에 연결됩니다.'}
              </span>
            </div>
          </div>

          {/* 1. 연결 설정 섹션 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
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
                <input
                  type="text"
                  value={config.tunnelUrl}
                  onChange={(e) => setConfig({ ...config, tunnelUrl: e.target.value })}
                  placeholder="https://tunneling-service.onrender.com/t/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
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

            {/* 버튼 영역 */}
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? '원격 DB 및 전체 테이블 감지 중...' : '원격 터널 연결 및 전체 테이블 감지'}</span>
              </button>
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
          </div>

          {/* 2. [방안 1 핵심] 감지된 전체 테이블 선택 및 탐색기 섹션 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-sm text-slate-800">
                  원격 DB 감지된 테이블 목록
                </span>
                <span className="text-[11px] font-mono bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                  선택 {selectedTables.length} / 총 {allAvailableCount}개
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllTables}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  전체 선택
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllTables}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  전체 해제
                </button>
              </div>
            </div>

            {/* 테이블 칩 목록 */}
            {config.availableTables && config.availableTables.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {config.availableTables.map((t) => {
                  const isChecked = selectedTables.includes(t.tableName);
                  const isCurrentActive = config.tableName.toLowerCase() === t.tableName.toLowerCase();

                  return (
                    <div
                      key={t.tableName}
                      onClick={() => {
                        const next = { ...config, tableName: t.tableName };
                        setConfig(next);
                        handleFetchData(next);
                      }}
                      className={`group cursor-pointer p-2.5 rounded-xl border transition flex items-center justify-between gap-2 select-none ${
                        isCurrentActive
                          ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTableSelection(t.tableName);
                          }}
                          className="text-slate-400 hover:text-indigo-600 transition shrink-0"
                          title="테이블 선택 토글"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                        <div className="truncate">
                          <div className="font-bold text-xs text-slate-800 truncate" title={t.tableName}>
                            {t.tableName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {t.rowCount != null ? `${t.rowCount.toLocaleString()}행` : '데이터 있음'}
                          </div>
                        </div>
                      </div>

                      {isCurrentActive && (
                        <span className="shrink-0 text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                          미리보기
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
                상단의 <strong>[원격 터널 연결 및 전체 테이블 감지]</strong> 버튼을 먼저 실행해 주세요.
              </div>
            )}
          </div>

          {/* 3. 원격 데이터 실시간 프리뷰 섹션 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-sm text-slate-900">
                  선택된 테이블 실시간 데이터: <span className="text-indigo-600">[{config.tableName}]</span>
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
                  title="현재 테이블 실시간 데이터 새로고침"
                >
                  <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>
            </div>

            {/* 표 영역 */}
            <div className="max-h-[220px] overflow-auto">
              {previewRows.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <Database className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">조회된 데이터가 없습니다.</p>
                  <p className="text-[11px] text-slate-400">
                    테이블 목록에서 테이블을 선택하여 실시간 데이터를 확인하세요.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center text-slate-400">#</th>
                      {previewCols.map((col) => (
                        <th key={col} className="py-2 px-3 font-semibold uppercase text-slate-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                    {previewRows.slice(0, 30).map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition">
                        <td className="py-1.5 px-3 text-center text-slate-400">{idx + 1}</td>
                        {previewCols.map((col) => (
                          <td key={col} className="py-1.5 px-3 whitespace-nowrap max-w-[200px] truncate" title={String(row[col] ?? '')}>
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

          {/* 일괄 작업 진행 상태 표시 */}
          {batchLoading && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 flex items-center justify-center gap-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="font-bold text-xs">{batchStatusText}</span>
            </div>
          )}
        </div>

        {/* 푸터 액션 바 (방안 1 핵심 액션 통합) */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>X-Api-Key 기반 종단간 암호화 터널로 안전하게 데이터가 중계됩니다.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. 현재 테이블만 단일 시트로 가져오기 */}
            <button
              type="button"
              onClick={handleImportSingleSheet}
              disabled={!config.isConnected || previewRows.length === 0 || batchLoading}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs transition flex items-center gap-1 active:scale-95"
              title={config.isConnected ? '현재 미리보기 중인 테이블만 1개 시트로 추가합니다' : '먼저 상단의 [원격 터널 연결 및 전체 테이블 감지]를 완료해 주세요'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>현재 테이블만 시트로</span>
            </button>

            {/* 2. 현재 프로젝트에 선택한 모든 테이블 시트로 일괄 추가 */}
            <button
              type="button"
              onClick={handleImportToCurrentProject}
              disabled={!config.isConnected || selectedTables.length === 0 || batchLoading || allAvailableCount === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition flex items-center gap-1.5 active:scale-95"
              title={config.isConnected ? '선택된 모든 테이블을 현재 프로젝트의 시트들로 일괄 추가합니다' : '먼저 상단의 [원격 터널 연결 및 전체 테이블 감지]를 완료해 주세요'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>선택 테이블 일괄 시트 추가 ({selectedTables.length})</span>
            </button>

            {/* 3. [방안 1 최우선 추천] 원격 My DB 전용 프로젝트로 열어 '표 데이터' 탭 매핑 */}
            <button
              type="button"
              onClick={handleOpenAsNewProject}
              disabled={!config.isConnected || selectedTables.length === 0 || batchLoading || allAvailableCount === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5 active:scale-95"
              title={config.isConnected ? '선택된 모든 테이블을 시트로 매핑하여 새 프로젝트를 열고 \'표 데이터\' 탭으로 탐색합니다' : '먼저 상단의 [원격 터널 연결 및 전체 테이블 감지]를 완료해 주세요'}
            >
              <FolderPlus className="w-4 h-4 text-amber-300" />
              <span>모든 테이블 새 프로젝트로 열기 ({selectedTables.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* 4. AI 비서 분석 */}
            <button
              type="button"
              onClick={handleAnalyzeWithAi}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition flex items-center gap-1 active:scale-95"
              title="AI 비서 대화창을 열고 원격 DB 분석을 시작합니다"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI 비서 분석</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
