'use client';

import React, { useState } from 'react';
import { FolderOpen, FileText, Download, Trash2, Eye, X, FileSpreadsheet } from 'lucide-react';
import { downloadFile } from '@/egdesk-helpers';

interface RecentFilesModalProps {
  show: boolean;
  onClose: () => void;
  recentFiles: any[];
  onDeleteFile: (fileId: number, filename: string) => Promise<void>;
}

export function RecentFilesModal({
  show,
  onClose,
  recentFiles,
  onDeleteFile,
}: RecentFilesModalProps) {
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  if (!show) return null;

  const handleDownload = async (file: any) => {
    try {
      setDownloadingId(file.id);
      const res = await downloadFile({
        tableName: 'uploaded_files',
        rowId: file.id,
        columnName: 'file_data',
      });
      if (res && res.data) {
        const link = document.createElement('a');
        link.href = res.data.startsWith('data:') ? res.data : `data:${file.file_type || 'application/octet-stream'};base64,${res.data}`;
        link.download = file.filename;
        link.click();
      } else {
        alert('스토리지에 원본 바이너리가 없는 이전 테스트 항목입니다.\n삭제 후 새로 파일을 업로드해 주세요.');
      }
    } catch (e: any) {
      alert('스토리지에 원본 파일이 존재하지 않는 이전 테스트 레코드입니다.\n휴지통 아이콘을 눌러 삭제 후 새로 업로드해 주세요.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (file: any) => {
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].some((ext) => file.filename.toLowerCase().endsWith(ext));
    const isPdf = file.filename.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) return handleDownload(file);

    try {
      setDownloadingId(file.id);
      const res = await downloadFile({
        tableName: 'uploaded_files',
        rowId: file.id,
        columnName: 'file_data',
      });
      if (res && res.data) {
        const dataUrl = res.data.startsWith('data:')
          ? res.data
          : `data:${isPdf ? 'application/pdf' : 'image/jpeg'};base64,${res.data}`;
        setPreviewFile({ url: dataUrl, name: file.filename });
      } else {
        alert('스토리지에 원본 이미지가 없는 이전 테스트 항목입니다.\n삭제 후 새로 파일을 업로드해 주세요.');
      }
    } catch (e: any) {
      alert('스토리지에 원본 파일이 존재하지 않는 이전 테스트 레코드입니다.\n휴지통 아이콘을 눌러 삭제 후 새로 업로드해 주세요.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-xl w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">보관함 (업로드 파일 목록)</h3>
                <p className="text-[11px] text-slate-400">업로드했던 원본 파일을 보거나 다운로드, 삭제할 수 있습니다.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5">
            {recentFiles.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">보관된 파일이 없습니다.</div>
            ) : (
              recentFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50/50 transition gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {f.filename.match(/\.(xlsx|xls|csv)$/i) ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="truncate min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate" title={f.filename}>{f.filename}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        {f.file_size ? <span>{Math.round(f.file_size / 1024)} KB</span> : null}
                        <span>•</span>
                        <span>{f.created_at ? new Date(f.created_at).toLocaleDateString('ko-KR') : '날짜 없음'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3대 핵심 액션 버튼: 보기, 다운로드, 삭제 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleView(f)}
                      disabled={downloadingId === f.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition"
                      title="브라우저에서 파일 보기"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">보기</span>
                    </button>

                    <button
                      onClick={() => handleDownload(f)}
                      disabled={downloadingId === f.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      title="내 컴퓨터로 다운로드"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">다운로드</span>
                    </button>

                    <button
                      onClick={() => onDeleteFile(f.id, f.filename)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="보관함에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 이미지/PDF 미리보기 라이트박스 */}
      {previewFile && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800 truncate">{previewFile.name}</span>
              <button onClick={() => setPreviewFile(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewFile.url} alt={previewFile.name} className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
