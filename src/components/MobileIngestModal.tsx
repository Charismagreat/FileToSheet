// c:\dev\FileToSheet\src\components\MobileIngestModal.tsx
'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
} from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';

const APK_DOWNLOAD_URL =
  'https://github.com/Charismagreat/SheetBot/releases/latest/download/SheetBotAgent.apk';

interface MobileIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWorkspace | null;
  activeSheetName: string;
}

export function MobileIngestModal({
  isOpen,
  onClose,
  project,
  activeSheetName,
}: MobileIngestModalProps) {
  const [token, setToken] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedApkUrl, setCopiedApkUrl] = useState<boolean>(false);
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const projectId = project?.id ? String(project.id) : 'default';
  const projectName = project?.name || 'File to Sheet 프로젝트';
  const targetSheet = activeSheetName || '기본 시트';

  const handleCopyApkUrl = async () => {
    try {
      await navigator.clipboard.writeText(APK_DOWNLOAD_URL);
      setCopiedApkUrl(true);
      setTimeout(() => setCopiedApkUrl(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // 토큰 조회 또는 자동 발급
  const fetchOrCreateToken = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      // 1. 기존 토큰 조회
      const queryRes = await apiFetch(`/api/inbox/token?projectId=${encodeURIComponent(projectId)}&sheetName=${encodeURIComponent(targetSheet)}`
      );
      const queryData = await queryRes.json();

      if (queryData.success && queryData.exists && queryData.token) {
        setToken(queryData.token);
        setWebhookUrl(queryData.webhookUrl);
        setLoading(false);
        return;
      }

      // 2. 없으면 신규 발급
      const createRes = await apiFetch('/api/inbox/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName,
          sheetName: targetSheet,
        }),
      });
      const createData = await createRes.json();
      if (createData.success && createData.token) {
        setToken(createData.token);
        setWebhookUrl(createData.webhookUrl);
      }
    } catch (err: any) {
      console.error('Failed to resolve mobile token:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrCreateToken();
    }
  }, [isOpen, projectId, targetSheet]);

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // 모바일 전송 시뮬레이션 테스트
  const handleSimulateSend = async () => {
    if (!token) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await apiFetch(`/api/inbox/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: '모바일_모의_영수증.jpg',
          memo: '시트봇 모바일앱 1초 연동 테스트',
          amount: 45000,
          rowData: {
            '일자': new Date().toISOString().slice(0, 10),
            '가맹점': '스타벅스 강남점 (시트봇 앱 전송)',
            '금액': 45000,
            '비고': '모바일 직결 적재 테스트 성공',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ 전송 성공! [${targetSheet}] 시트에 1건이 즉시 적재되었습니다.`);
      } else {
        setTestResult(`❌ 실패: ${data.error || '오류 발생'}`);
      }
    } catch (err: any) {
      setTestResult(`❌ 통신 실패: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  };

  if (!isOpen) return null;

  // 인라인 SVG 기반 표준 QR 코드 이미지 URL (안전한 외부 API 사용 또는 고정 QR 렌더링)
  const qrImageUrl = token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
        JSON.stringify({
          service: 'FileToSheet',
          action: 'sheet_ingest',
          token,
          sheetName: targetSheet,
          endpoint: webhookUrl,
        })
      )}`
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <span>시트봇 모바일앱 직결 연동</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                  Instant Pairing
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                연결 대상 시트: <strong className="text-indigo-600">{targetSheet}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              모바일 수신 토큰을 발급하는 중...
            </div>
          ) : (
            <>
              {/* 0. 시트봇 모바일 에이전트 앱 다운로드 카드 */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-slate-50 rounded-2xl border border-emerald-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-slate-900">
                          시트봇 모바일 에이전트 앱 설치
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-extrabold">
                          Android APK
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        스마트폰에 앱이 없다면 APK를 먼저 다운로드하여 설치해 주세요 (v1.0.0 / 5.2MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                  <a
                    href={APK_DOWNLOAD_URL}
                    download="SheetBotAgent.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>SheetBotAgent.apk 다운로드 받기</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyApkUrl}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs shrink-0"
                    title="APK 다운로드 URL 클립보드 복사"
                  >
                    {copiedApkUrl ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedApkUrl ? '주소 복사됨' : '다운로드 링크 복사'}</span>
                  </button>
                </div>
              </div>

              {/* 1. QR 코드 스캔 영역 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0">
                  {qrImageUrl ? (
                    <img
                      src={qrImageUrl}
                      alt="SheetBot Pairing QR"
                      className="w-32 h-32 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <QrCode className="w-10 h-10" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    1초 원클릭 페어링
                  </div>
                  <h4 className="font-extrabold text-slate-800">
                    스마트폰 시트봇 앱으로 QR을 스캔하세요
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    시트봇 모바일앱의 <strong>[목적지 추가]</strong>에서 카메라로 이 QR코드를 비추면, 스마트폰에서 촬영한 영수증/발주서가 이 <strong>[{targetSheet}]</strong> 시트로 즉시 전송됩니다.
                  </p>
                </div>
              </div>

              {/* 2. 수신 토큰 및 엔드포인트 복사 영역 */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    모바일 수신 고유 토큰 (Token)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={token}
                      className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        copiedToken
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-900 text-white shadow-2xs'
                      }`}
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? '복사됨' : '토큰 복사'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    인커밍 웹훅 엔드포인트 (Webhook URL)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 text-[11px] truncate select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        copiedUrl
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? '복사됨' : 'URL 복사'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. 모의 전송 테스트 시뮬레이터 */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    모바일앱 전송 모의 테스트
                  </span>
                  <button
                    type="button"
                    onClick={handleSimulateSend}
                    disabled={testSending || !token}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                  >
                    {testSending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>모바일 전송 시뮬레이션</span>
                  </button>
                </div>
                {testResult && (
                  <p className="text-[11px] font-medium text-slate-800 bg-white p-2 rounded-lg border border-indigo-200">
                    {testResult}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* 풋터 */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
