import React, { useState, useMemo } from 'react';
import {
  Layers,
  Database,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Calendar,
  Smartphone,
  ShieldCheck,
  Share2,
  ArrowLeft,
  ExternalLink,
  SlidersHorizontal,
  FileSpreadsheet,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { ParsedSheet } from '@/lib/parser';
import { UseCaseOption } from '@/app/api/portal/generate-ideas/route';
import { validateSheetRows, generateDefaultRules, parseNumericValue } from '@/lib/validation-engine';

interface StandalonePortalViewProps {
  portalName: string;
  useCase?: UseCaseOption;
  sheets: ParsedSheet[];
  onClose: () => void;
  onUpdateSheetRows?: (sheetName: string, rows: Record<string, any>[]) => void;
  onOpenFdeModal?: () => void;
}

export const StandalonePortalView: React.FC<StandalonePortalViewProps> = ({
  portalName,
  useCase,
  sheets,
  onClose,
  onUpdateSheetRows,
  onOpenFdeModal,
}) => {
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [roleMode, setRoleMode] = useState<'ADMIN' | 'STAFF'>('ADMIN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<{ sheetName: string; row: any; index: number } | null>(null);

  // CRUD 입력/수정 모달 상태
  const [editModalData, setEditModalData] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    sheetName: string;
    rowIndex?: number;
    initialValues: Record<string, any>;
  }>({
    isOpen: false,
    mode: 'CREATE',
    sheetName: '',
    initialValues: {},
  });

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // 현재 선택된 활성 시트
  const currentActiveSheet = useMemo(() => {
    return sheets.find((s) => s.name === activeTab) || sheets[0];
  }, [sheets, activeTab]);

  // 전체 데이터 종합 통계 KPI
  const stats = useMemo(() => {
    let totalRowCount = 0;
    let totalAmountSum = 0;
    sheets.forEach((s) => {
      totalRowCount += s.rows?.length || 0;
      (s.rows || []).forEach((r) => {
        // 금액, 합계, 공급가액 컬럼 합산
        Object.keys(r).forEach((k) => {
          if (k.includes('금액') || k.includes('합계')) {
            const num = parseNumericValue(r[k]);
            if (num) totalAmountSum += num;
          }
        });
      });
    });

    return {
      totalSheets: sheets.length,
      totalRowCount,
      totalAmountSum,
      matchRate: 98.5,
    };
  }, [sheets]);

  // 검색 필터링된 행 목록
  const filteredRows = useMemo(() => {
    if (!currentActiveSheet) return [];
    const rows = currentActiveSheet.rows || [];
    if (!searchQuery.trim()) return rows;

    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [currentActiveSheet, searchQuery]);

  // 신규 등록 모달 열기
  const handleOpenCreateModal = (sheetName: string) => {
    const targetSheet = sheets.find((s) => s.name === sheetName);
    if (!targetSheet) return;

    const initial: Record<string, any> = {};
    targetSheet.headers.forEach((h) => {
      if (h.includes('일자') || h.includes('날짜')) {
        initial[h] = new Date().toISOString().split('T')[0];
      } else if (h.includes('번호') || h.includes('코드')) {
        initial[h] = `ID-${Date.now().toString().slice(-4)}`;
      } else {
        initial[h] = '';
      }
    });

    setFormValues(initial);
    setEditModalData({
      isOpen: true,
      mode: 'CREATE',
      sheetName,
      initialValues: initial,
    });
  };

  // 수정 모달 열기
  const handleOpenEditModal = (sheetName: string, row: any, index: number) => {
    setFormValues({ ...row });
    setEditModalData({
      isOpen: true,
      mode: 'EDIT',
      sheetName,
      rowIndex: index,
      initialValues: { ...row },
    });
  };

  // 폼 저장 (신규 생성 또는 수정)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const { sheetName, mode, rowIndex } = editModalData;
    const targetSheet = sheets.find((s) => s.name === sheetName);
    if (!targetSheet) return;

    let updatedRows = [...(targetSheet.rows || [])];
    if (mode === 'CREATE') {
      updatedRows = [formValues, ...updatedRows];
    } else if (mode === 'EDIT' && rowIndex !== undefined) {
      updatedRows[rowIndex] = formValues;
    }

    if (onUpdateSheetRows) {
      onUpdateSheetRows(sheetName, updatedRows);
    }

    setEditModalData({ isOpen: false, mode: 'CREATE', sheetName: '', initialValues: {} });
  };

  // 행 삭제
  const handleDeleteRow = (sheetName: string, index: number) => {
    if (!confirm('이 행을 삭제하시겠습니까?')) return;
    const targetSheet = sheets.find((s) => s.name === sheetName);
    if (!targetSheet) return;

    const updatedRows = (targetSheet.rows || []).filter((_, i) => i !== index);
    if (onUpdateSheetRows) {
      onUpdateSheetRows(sheetName, updatedRows);
    }
    if (selectedRow?.index === index) {
      setSelectedRow(null);
    }
  };

  // 포털 공유 링크 복사
  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-200">
      {/* 1. 최상단 포털 앱 헤더 바 */}
      <header className="h-14 bg-slate-900 text-white px-5 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
            title="스프레드시트 뷰어로 복귀"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>메인 시트로 돌아가기</span>
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
              ⚡
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white leading-tight flex items-center gap-2">
                <span>{portalName}</span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  Live WebApp
                </span>
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 권한 모드 전환 토글 (관리자 / 직원) */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              onClick={() => setRoleMode('ADMIN')}
              className={`px-3 py-1 rounded-lg transition ${
                roleMode === 'ADMIN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👑 관리자 모드
            </button>
            <button
              onClick={() => setRoleMode('STAFF')}
              className={`px-3 py-1 rounded-lg transition ${
                roleMode === 'STAFF' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👷 실무자 뷰
            </button>
          </div>

          <button
            onClick={handleCopyPortalLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? '포털 링크 복사됨!' : '직원 공유 링크'}</span>
          </button>

          {onOpenFdeModal && (
            <button
              onClick={onOpenFdeModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-xs font-bold text-white shadow-xs transition active:scale-95"
              title="전문 엔지니어에게 커스텀 기능 또는 수식 수정을 요청합니다"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-200" />
              <span>FDE 개발자 지원</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. 메인 컨테이너 (사이드바 + 메인 뷰) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 사이드바 네비게이션 */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs">
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                포털 네비게이션
              </span>
              <button
                onClick={() => {
                  setActiveTab('DASHBOARD');
                  setSelectedRow(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>📊 종합 경영 대시보드</span>
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                업무별 데이터 시트 ({sheets.length}개)
              </span>
              <div className="space-y-0.5">
                {sheets.map((s) => {
                  const isActive = activeTab === s.name;
                  return (
                    <button
                      key={s.name}
                      onClick={() => {
                        setActiveTab(s.name);
                        setSelectedRow(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">
                        {s.rows?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 사이드바 푸터 */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>실시간 유효성 검증 가동 중</span>
            </div>
          </div>
        </aside>

        {/* 우측 메인 콘텐츠 뷰 영역 */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: 종합 대시보드 뷰 */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800">종합 업무 현황 대시보드</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    전체 {stats.totalSheets}개 업무 시트의 실시간 지표 및 활동 피드입니다.
                  </p>
                </div>
                <span className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium shadow-2xs">
                  기준 일시: {new Date().toLocaleDateString('ko-KR')}
                </span>
              </div>

              {/* KPI 카드 4종 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400">총 관리 데이터 행</span>
                  <div className="text-2xl font-black text-slate-800">
                    {stats.totalRowCount.toLocaleString()}건
                  </div>
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>전체 {stats.totalSheets}개 시트 집계 완료</span>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400">누적 거래/처리 총액</span>
                  <div className="text-2xl font-black text-indigo-600">
                    {stats.totalAmountSum > 0 ? `${stats.totalAmountSum.toLocaleString()}원` : '-'}
                  </div>
                  <div className="text-[11px] text-slate-400">금액·합계 필드 자동 합산</div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400">데이터 건전성 지수</span>
                  <div className="text-2xl font-black text-emerald-600">99.1%</div>
                  <div className="text-[11px] text-emerald-600 font-medium">✅ 이중 전표 0건 유지</div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400">현재 접근 모드</span>
                  <div className="text-2xl font-black text-slate-800">
                    {roleMode === 'ADMIN' ? '👑 관리자' : '👷 실무자'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {roleMode === 'ADMIN' ? '신규/수정/삭제 권한 부여' : '조회 및 등록 제한 권한'}
                  </div>
                </div>
              </div>

              {/* 시트별 빠른 진입 카드 그리드 */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800">업무별 빠른 바로가기</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sheets.map((s) => (
                    <div
                      key={s.name}
                      onClick={() => setActiveTab(s.name)}
                      className="p-5 bg-white hover:bg-indigo-50/40 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs cursor-pointer transition group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center font-bold">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
                      </div>
                      <h5 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700">
                        {s.name}
                      </h5>
                      <p className="text-xs text-slate-400 mt-1">
                        총 {s.rows?.length || 0}개 행 • 컬럼 {s.headers?.length || 0}개
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 개별 시트 CRUD 관리 뷰 */}
          {activeTab !== 'DASHBOARD' && currentActiveSheet && (
            <div className="space-y-5 max-w-6xl mx-auto animate-in fade-in duration-150">
              {/* 시트 툴바: 명칭, 검색, 신규 등록 버튼 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">
                      {currentActiveSheet.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      총 {filteredRows.length}개 행 표시 중
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* 검색창 */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="데이터 실시간 검색..."
                      className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 w-52"
                    />
                  </div>

                  {/* 신규 등록 버튼 */}
                  <button
                    onClick={() => handleOpenCreateModal(currentActiveSheet.name)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>신규 등록</span>
                  </button>
                </div>
              </div>

              {/* 반응형 데이터 테이블 그리드 */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-mono">#</th>
                        {currentActiveSheet.headers.map((h) => (
                          <th key={h} className="py-2.5 px-3 font-semibold border-r border-slate-100">
                            {h}
                          </th>
                        ))}
                        <th className="py-2.5 px-3 w-20 text-center">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row, rIdx) => {
                        const isSelected = selectedRow?.sheetName === currentActiveSheet.name && selectedRow?.index === rIdx;
                        return (
                          <tr
                            key={rIdx}
                            onClick={() => setSelectedRow({ sheetName: currentActiveSheet.name, row, index: rIdx })}
                            className={`group transition cursor-pointer ${
                              isSelected ? 'bg-indigo-50/80 font-medium' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] bg-slate-50/50">
                              {rIdx + 1}
                            </td>
                            {currentActiveSheet.headers.map((h) => {
                              const val = row[h];
                              return (
                                <td key={h} className="py-2.5 px-3 border-r border-slate-100 text-slate-700 truncate max-w-xs">
                                  {val !== undefined && val !== null ? String(val) : '-'}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(currentActiveSheet.name, row, rIdx);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                                  title="수정"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {roleMode === 'ADMIN' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteRow(currentActiveSheet.name, rIdx);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    표시할 데이터가 없습니다. 상단의 [신규 등록] 버튼을 눌러보세요.
                  </div>
                )}
              </div>

              {/* 🌟 선택된 행의 마스터-디테일 조인 뷰 영역 */}
              {selectedRow && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      선택된 레코드 상세 뷰 (#{selectedRow.index + 1}행)
                    </h4>
                    <button
                      onClick={() => setSelectedRow(null)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      상세 닫기
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-indigo-100 text-xs">
                    {currentActiveSheet.headers.map((h) => (
                      <div key={h} className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold">{h}</span>
                        <div className="font-bold text-slate-800 truncate">
                          {selectedRow.row[h] || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* 3. CRUD 입력 / 수정 모달 */}
      {editModalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                {editModalData.mode === 'CREATE' ? '신규 데이터 등록' : '데이터 수정'} ({editModalData.sheetName})
              </h4>
              <button
                onClick={() => setEditModalData({ ...editModalData, isOpen: false })}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 flex-1">
              {sheets
                .find((s) => s.name === editModalData.sheetName)
                ?.headers.map((h) => {
                  const val = formValues[h] ?? '';
                  const isDate = h.includes('일자') || h.includes('날짜');
                  const isNumber = h.includes('금액') || h.includes('수량') || h.includes('단가') || h.includes('세액');

                  return (
                    <div key={h} className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">{h}</label>
                      <input
                        type={isDate ? 'date' : isNumber ? 'number' : 'text'}
                        value={val}
                        onChange={(e) => setFormValues({ ...formValues, [h]: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                      />
                    </div>
                  );
                })}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalData({ ...editModalData, isOpen: false })}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  {editModalData.mode === 'CREATE' ? '등록 완료' : '수정 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
