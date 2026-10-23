'use client';

import React, { useState } from 'react';
import {
  X, Check, ExternalLink, Copy, CheckCheck, Loader2,
  FileSpreadsheet, ArrowRight, ShieldAlert, Sparkles, Layers,
  Terminal, AlertCircle, RefreshCw, Paperclip
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ParsedSheet, ProjectWorkspace } from '@/types/workspace';

interface GoogleSheetTabInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  hasData: boolean;
}

interface GoogleSheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectWorkspace | null;
  onImportComplete: (importedSheets: ParsedSheet[], spreadsheetId: string) => void;
  currentUserPhone?: string;
}

export function GoogleSheetImportModal({
  isOpen,
  onClose,
  currentProject,
  onImportComplete,
  currentUserPhone,
}: GoogleSheetImportModalProps) {
  // 모달 단계: 'url' (입력) -> 'select_tabs' (탭 선택) -> 'script_guide' (Apps Script 코드 안내)
  const [step, setStep] = useState<'url' | 'select_tabs' | 'script_guide'>('url');

  const [urlInput, setUrlInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 검사된 구글 시트 정보
  const [inspectedData, setInspectedData] = useState<{
    spreadsheetId: string;
    title: string;
    url: string;
    tabs: GoogleSheetTabInfo[];
  } | null>(null);

  // 선택된 탭 이름 배열
  const [selectedTabNames, setSelectedTabNames] = useState<string[]>([]);

  // 가져오기 완료 후 발급된 syncToken 및 주입 코드
  const [syncToken, setSyncToken] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  // 1. 구글 시트 탭 목록 검사 실행
  const handleInspect = async () => {
    if (!urlInput.trim()) {
      setErrorMsg('구글 시트 URL을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/sheets/inspect-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrId: urlInput.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '구글 시트 탭 정보를 불러오지 못했습니다.');
      }

      setInspectedData(data);
      // 데이터가 있는 탭들을 기본 선택
      const defaultSelected = (data.tabs || [])
        .filter((t: GoogleSheetTabInfo) => t.hasData || t.headers.length > 0)
        .map((t: GoogleSheetTabInfo) => t.title);
      setSelectedTabNames(defaultSelected.length > 0 ? defaultSelected : (data.tabs?.[0]?.title ? [data.tabs[0].title] : []));
      setStep('select_tabs');
    } catch (err: any) {
      setErrorMsg(err.message || '스프레드시트 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2. 선택된 탭들 데이터 가져오기 실행
  const handleImport = async () => {
    if (!inspectedData || selectedTabNames.length === 0) {
      setErrorMsg('가져올 시트 탭을 1개 이상 선택해 주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/sheets/import-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: inspectedData.spreadsheetId,
          selectedTabNames,
          projectId: currentProject?.id,
          phoneNumber: currentUserPhone,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '시트 데이터 복사에 실패했습니다.');
      }

      setSyncToken(data.syncToken || '');
      onImportComplete(data.sheets || [], inspectedData.spreadsheetId);
      setStep('script_guide');
    } catch (err: any) {
      setErrorMsg(err.message || '가져오기 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 🌟 생성되는 Google Apps Script 코드 스니펫
  const generatedScriptCode = `/**
 * 📂 FileToSheet 자동 동기화 & 원본 증빙 링크 브릿지 스크립트
 * 구글 시트 상단 메뉴 [확장 프로그램] > [Apps Script] 에 붙여넣고 저장하세요.
 */
const FTS_CONFIG = {
  ENDPOINT: '${typeof window !== 'undefined' ? window.location.origin : 'https://file2sheet.cloud'}/api/sheets/sync-from-google',
  PROJECT_ID: '${currentProject?.id || 1}',
  SPREADSHEET_ID: '${inspectedData?.spreadsheetId || ''}',
  SYNC_TOKEN: '${syncToken}'
};

// 1. 구글 시트 열릴 때 상단 커스텀 메뉴 자동 생성
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📂 FileToSheet')
    .addItem('⚡ 현재 탭 최신 데이터 동기화 (덮어쓰기)', 'syncCurrentSheetOverwrite')
    .addItem('➕ 신규 행만 아래에 누적 전송 (Append)', 'syncCurrentSheetAppend')
    .addSeparator()
    .addItem('🌐 FileToSheet 대시보드 바로가기', 'openFileToSheetWeb')
    .addToUi();
}

// 2. 현재 탭 덮어쓰기 동기화
function syncCurrentSheetOverwrite() {
  executeSync('overwrite');
}

// 3. 신규 행만 누적 적재
function syncCurrentSheetAppend() {
  executeSync('append');
}

// 4. 핵심 동기화 및 1:N 원본 파일 사전 중복 제거 전송 엔진
function executeSync(syncMode) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    SpreadsheetApp.getUi().alert('전송할 데이터 행이 없습니다.');
    return;
  }

  const headers = values[0].map(function(h, idx) {
    var str = String(h || '').trim();
    return str || ('열_' + (idx + 1));
  });

  const uniqueFilesMap = {};
  const rows = [];

  for (var r = 1; r < values.length; r++) {
    var rowData = values[r];
    var isEmpty = rowData.every(function(cell) {
      return cell === undefined || cell === null || String(cell).trim() === '';
    });
    if (isEmpty) continue;

    var rowObj = {};
    var fileId = null;

    for (var c = 0; c < headers.length; c++) {
      var val = rowData[c];
      rowObj[headers[c]] = val !== undefined && val !== null ? val : '';

      // 셀 내용 또는 하이퍼링크에서 구글 드라이브 파일 ID 추출
      if (!fileId && val) {
        var strVal = String(val);
        var match = strVal.match(/[-\\w]{25,}/);
        if (strVal.indexOf('drive.google.com') !== -1 && match) {
          fileId = match[0];
        }
      }
    }

    // 🌟 원본 파일이 링크된 경우: 파일은 단 1번만 추출(1:N 중복 제거)
    if (fileId) {
      rowObj['_fileKey'] = fileId;
      if (!uniqueFilesMap[fileId]) {
        try {
          var driveFile = DriveApp.getFileById(fileId);
          uniqueFilesMap[fileId] = {
            fileKey: fileId,
            fileName: driveFile.getName(),
            mimeType: driveFile.getMimeType(),
            base64Data: Utilities.base64Encode(driveFile.getBlob().getBytes()),
            fileSize: driveFile.getSize()
          };
        } catch (e) {
          Logger.log('파일 추출 실패: ' + e);
        }
      }
    }

    rows.push(rowObj);
  }

  var filesPayload = Object.keys(uniqueFilesMap).map(function(k) {
    return uniqueFilesMap[k];
  });

  var payload = {
    syncToken: FTS_CONFIG.SYNC_TOKEN,
    projectId: FTS_CONFIG.PROJECT_ID,
    spreadsheetId: FTS_CONFIG.SPREADSHEET_ID,
    sheetName: sheetName,
    headers: headers,
    rows: rows,
    files: filesPayload,
    syncMode: syncMode
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var res = UrlFetchApp.fetch(FTS_CONFIG.ENDPOINT, options);
    var resJson = JSON.parse(res.getContentText());
    if (resJson.success) {
      var msg = '✅ [' + sheetName + '] ' + rows.length + '행 동기화 완료!';
      if (filesPayload.length > 0) {
        msg += ' (증빙 ' + filesPayload.length + '개 첨부)';
      }
      SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'FileToSheet', 6);
    } else {
      SpreadsheetApp.getUi().alert('동기화 실패: ' + (resJson.error || '알 수 없는 오류'));
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('네트워크 오류: ' + err.message);
  }
}

function openFileToSheetWeb() {
  var html = HtmlService.createHtmlOutput(
    '<script>window.open("' + FTS_CONFIG.ENDPOINT.replace('/api/sheets/sync-from-google', '') + '", "_blank");google.script.host.close();</script>'
  ).setWidth(100).setHeight(50);
  SpreadsheetApp.getUi().showModalDialog(html, '이동 중...');
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                내 구글 시트 연결 & 가져오기
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  양방향 브릿지
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                기존에 쓰던 구글 시트의 탭을 가져오고, 원클릭 동기화 메뉴를 주입합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 스텝별 렌더링 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1단계: URL 입력 단계 */}
          {step === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  사용 중인 Google 스프레드시트 주소(URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInspect();
                    }}
                  />
                  <button
                    onClick={handleInspect}
                    disabled={loading || !urlInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>탭 검사</span>
                  </button>
                </div>
              </div>

              {/* 안내 가이드 카드 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <span>시트 접근 권한 설정 안내</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  구글 시트 우측 상단의 <strong className="text-slate-700">[공유]</strong> 버튼을 누른 뒤, 일반 액세스를{' '}
                  <strong className="text-slate-700">&apos;링크가 있는 모든 사용자 (뷰어 또는 편집자)&apos;</strong>로 설정해
                  주시면 즉시 연결됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 2단계: 탭 선택 단계 */}
          {step === 'select_tabs' && inspectedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 truncate max-w-md" title={inspectedData.title}>
                    {inspectedData.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    가져올 탭을 선택하세요. 선택된 탭은 FileToSheet의 개별 시트로 복사됩니다.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (selectedTabNames.length === inspectedData.tabs.length) {
                      setSelectedTabNames([]);
                    } else {
                      setSelectedTabNames(inspectedData.tabs.map((t) => t.title));
                    }
                  }}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  {selectedTabNames.length === inspectedData.tabs.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>

              {/* 탭 목록 그리드 */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {inspectedData.tabs.map((tab) => {
                  const isSelected = selectedTabNames.includes(tab.title);
                  return (
                    <div
                      key={tab.title}
                      onClick={() => {
                        setSelectedTabNames((prev) =>
                          prev.includes(tab.title) ? prev.filter((t) => t !== tab.title) : [...prev, tab.title]
                        );
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center transition ${
                            isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="truncate flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{tab.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 overflow-x-auto no-scrollbar">
                            {tab.headers.slice(0, 5).map((h, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono"
                              >
                                {h}
                              </span>
                            ))}
                            {tab.headers.length > 5 && (
                              <span className="text-[10px] text-slate-400">외 {tab.headers.length - 5}개 열</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-[11px] font-mono font-semibold text-slate-500">
                          {tab.rowCount.toLocaleString()}행
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3단계: Apps Script 코드 복사 및 주입 가이드 단계 */}
          {step === 'script_guide' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    시트 데이터 가져오기가 완료되었습니다!
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    이제 구글 시트에 원클릭 동기화 메뉴를 주입하여 언제든 최신 데이터를 보낼 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 3단계 셋업 절차 안내 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Apps Script 열기
                  </div>
                  <p className="text-[11px] text-slate-500">
                    구글 시트 상단 메뉴에서 <strong>[확장 프로그램] → [Apps Script]</strong>를 클릭합니다.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    코드 붙여넣기 및 저장
                  </div>
                  <p className="text-[11px] text-slate-500">
                    아래 코드를 복사하여 편집기에 붙여넣고 <strong>[저장(Ctrl+S)]</strong>을 누릅니다.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    시트 새로고침 & 전송
                  </div>
                  <p className="text-[11px] text-slate-500">
                    구글 시트를 새로고침(F5)하면 상단에 <strong>[📂 FileToSheet]</strong> 메뉴가 생깁니다!
                  </p>
                </div>
              </div>

              {/* Apps Script 코드 블록 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-600" />
                    자동 생성된 Apps Script 코드
                  </label>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs"
                  >
                    {copiedCode ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? '복사 완료!' : '코드 복사'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono max-h-52 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                  {generatedScriptCode}
                </pre>
              </div>

              {/* 🌟 1:N 원본 파일 자동 동반 업로드 특징 강조 배너 */}
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
                <Paperclip className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">스마트 증빙 링크 자동 감지 & 1:N 중복 제거 내장:</strong>
                  <p className="text-blue-700 mt-0.5">
                    시트 셀에 구글 드라이브 영수증/PDF 링크가 있으면 스크립트가 파일을 자동으로 가져오며,
                    여러 행이 동일한 파일을 가리킬 경우 단 1번만 업로드하여 대역폭과 스토리지를 완벽히 절약합니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          {step === 'select_tabs' && (
            <button
              onClick={() => setStep('url')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
            >
              이전으로
            </button>
          )}

          {step === 'script_guide' ? (
            <div className="w-full flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <span>워크스페이스에서 확인하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
              >
                닫기
              </button>
              {step === 'select_tabs' && (
                <button
                  onClick={handleImport}
                  disabled={loading || selectedTabNames.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  <span>{selectedTabNames.length}개 시트 가져오기</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
