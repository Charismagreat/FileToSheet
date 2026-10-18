'use client';

import React, { useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { WelcomeDropzone } from '@/components/WelcomeDropzone';
import { ProjectBar } from '@/components/ProjectBar';
import { SheetBar } from '@/components/SheetBar';
import { SubTabBar } from '@/components/SubTabBar';
import { TableView } from '@/components/TableView';
import { OriginalDocView } from '@/components/OriginalDocView';
import { SummaryView } from '@/components/SummaryView';
import {
  PhoneAuthModal, UploadOptionModal, OriginalFileModal, AddColumnModal,
  ExportOptionModal, ShareModal, PlanLimitModal, PricingModal, EnterpriseInquiryModal, DuplicateFileModal,
  AccountTransferModal, ShareToManagerModal, ConsolidatedStatsModal, EmergencyRecoveryModal,
  ShareManagementModal, ExportScopeModal, SheetRuleModal, ScheduleModal, MobileIngestModal,
} from '@/components/modals';
import { UploadUndoToast } from '@/components/UploadUndoToast';
import { AiChatDrawer, ChatScope } from '@/components/AiChatDrawer';
import { BillingHistoryModal } from '@/components/BillingHistoryModal';
import { RemoteDbModal } from '@/components/RemoteDbModal';
import { BatchUploadMonitor } from '@/components/BatchUploadMonitor';
import { Sparkles, Upload } from 'lucide-react';
import { ExportTargetType } from '@/components/ExportScopeModal';
import { FilterState } from '@/components/DataFilterPopover';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileExport } from '@/hooks/useFileExport';
import { useBatchUploadQueue } from '@/hooks/useBatchUploadQueue';
import { getSheetOriginalFiles } from '@/lib/sheet-helpers';
import { ProjectWorkspace } from '@/types/workspace';
import { insertRows } from '@/egdesk-helpers';

export default function FileToSheetApp() {
  const auth = useAuth();
  const [limitNotice, setLimitNotice] = useState<{ title: string; reason: string } | null>(null);
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [showBillingHistoryModal, setShowBillingHistoryModal] = useState<boolean>(false);
  const [showRemoteDbModal, setShowRemoteDbModal] = useState<boolean>(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showShareToManagerModal, setShowShareToManagerModal] = useState<boolean>(false);
  const [showConsolidatedModal, setShowConsolidatedModal] = useState<boolean>(false);
  const [showEmergencyRecoveryModal, setShowEmergencyRecoveryModal] = useState<boolean>(false);
  const [showShareManagementModal, setShowShareManagementModal] = useState<boolean>(false);
  const [showAiChatDrawer, setShowAiChatDrawer] = useState<boolean>(false);
  const [aiChatInitialScope, setAiChatInitialScope] = useState<ChatScope>('current_sheet');
  const [ruleModalSheetIdx, setRuleModalSheetIdx] = useState<number | null>(null);
  const fabFileInputRef = useRef<HTMLInputElement>(null);
  const handlePlanLimit = (title: string, reason: string) => setLimitNotice({ title, reason });

  const ws = useWorkspace({
    phoneNumber: auth.currentUser?.phoneNumber,
    plan: auth.currentUser?.plan, onPlanLimit: handlePlanLimit,
  });
  const upload = useFileUpload({
    projects: ws.projects, setProjects: ws.setProjects,
    activeProjectIndex: ws.activeProjectIndex, setActiveProjectIndex: ws.setActiveProjectIndex,
    plan: auth.currentUser?.plan, onPlanLimit: handlePlanLimit,
  });
  const fileExport = useFileExport({
    currentProject: ws.currentProject, setProjects: ws.setProjects, activeProjectIndex: ws.activeProjectIndex,
  });

  // 🌟 다중 파일 스마트 시트 일괄 적재 큐 훅
  const batchQueue = useBatchUploadQueue({
    project: ws.currentProject,
    plan: auth.currentUser?.plan,
    onPlanLimit: handlePlanLimit,
    onItemAppended: (targetSheetIndex, newRows, docItem) => {
      ws.setProjects((prev) =>
        prev.map((proj, pIdx) => {
          if (pIdx !== ws.activeProjectIndex) return proj;
          const nextSheets = proj.sheets.map((sh, sIdx) => {
            if (sIdx !== targetSheetIndex) return sh;
            const existingOriginalFiles = sh.originalFiles || [];
            const nextRows = [...sh.rows, ...newRows].map((r, i) => ({ ...r, 일련번호: i + 1 }));
            return {
              ...sh,
              rows: nextRows,
              originalFiles: [...existingOriginalFiles, docItem],
            };
          });
          const nextOriginalFiles = [...(proj.originalFiles || []), docItem];
          return {
            ...proj,
            sheets: nextSheets,
            originalFiles: nextOriginalFiles,
          };
        })
      );
    },
    onNewSheetCreated: (newSheet, docItem) => {
      ws.setProjects((prev) =>
        prev.map((proj, pIdx) => {
          if (pIdx !== ws.activeProjectIndex) return proj;
          const nextSheets = [...proj.sheets, newSheet];
          const nextOriginalFiles = [...(proj.originalFiles || []), docItem];
          return {
            ...proj,
            sheets: nextSheets,
            activeSheetIndex: nextSheets.length - 1,
            originalFiles: nextOriginalFiles,
          };
        })
      );
    },
  });

  const handleBatchOrSingleUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (ws.projects.length === 0) {
      upload.handleFileDropOrSelect(fileArray[0]);
      return;
    }

    if (fileArray.length > 1) {
      batchQueue.enqueueFiles(fileArray);
    } else {
      upload.handleFileDropOrSelect(fileArray[0]);
    }
  };


  const [activeSubTab, setActiveSubTab] = useState<'table' | 'original' | 'summary'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 최신순 기본값
  const [isTableDragging, setIsTableDragging] = useState<boolean>(false);
  const [showOriginalModal, setShowOriginalModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showMobileIngestModal, setShowMobileIngestModal] = useState<boolean>(false);

  // 조회 필터 상태 (기간/날짜, 건수 제한, 다중 조건 규칙)
  const [filterState, setFilterState] = useState<FilterState>({
    dateConfig: { column: '', startDate: '', endDate: '', preset: 'all' },
    limit: 0,
    rules: [],
  });

  // 열 헤더 클릭 정렬 상태 (null이면 기본 등록순)
  const [columnSort, setColumnSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // 내보내기 범위 선택 모달 상태
  const [showExportScopeModal, setShowExportScopeModal] = useState<boolean>(false);
  const [exportScopeTarget, setExportScopeTarget] = useState<ExportTargetType>('xlsx');
  const [pendingScopeChoice, setPendingScopeChoice] = useState<'filtered' | 'all'>('all');

  const currentProject = ws.currentProject;
  const currentSheet = ws.currentSheet;
  const sheetOriginalFiles = getSheetOriginalFiles(currentProject, currentSheet);

  // 1. 원본 행 데이터 (고유 index 보존)
  const rawRowsWithOrigin = currentSheet ? currentSheet.rows.map((r, i) => ({ ...r, _originIdx: i })) : [];

  // 2. 실시간 텍스트 검색 필터
  const searchedRows = rawRowsWithOrigin.filter((row) =>
    !searchQuery.trim() || Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 3. 날짜/기간 필터
  const dateFilteredRows = searchedRows.filter((row) => {
    const { column, startDate, endDate } = filterState.dateConfig;
    if (!startDate && !endDate) return true;
    const colKey = column || (currentSheet?.headers[0] ?? '');
    const colVal = String(row[colKey] ?? '');
    const match = colVal.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}/);
    if (!match) return true;
    const normalized = match[0].replace(/[./]/g, '-').split('-').map((p, idx) => idx > 0 ? p.padStart(2, '0') : p).join('-');
    if (startDate && normalized < startDate) return false;
    if (endDate && normalized > endDate) return false;
    return true;
  });

  // 4. 다중 열 조건 멀티 필터 (AND 결합)
  const ruleFilteredRows = dateFilteredRows.filter((row) => {
    const rules = filterState.rules || [];
    if (rules.length === 0) return true;
    return rules.every((rule) => {
      if (!rule.value.trim()) return true;
      const cellVal = String(row[rule.column] ?? '');
      const searchVal = rule.value.trim();
      const numCell = Number(cellVal.replace(/,/g, '').trim());
      const numSearch = Number(searchVal.replace(/,/g, '').trim());
      const isBothNumeric = !isNaN(numCell) && !isNaN(numSearch) && cellVal.trim() !== '' && searchVal !== '';

      switch (rule.operator) {
        case 'contains':
          return cellVal.toLowerCase().includes(searchVal.toLowerCase());
        case 'equals':
          return isBothNumeric ? numCell === numSearch : cellVal.toLowerCase() === searchVal.toLowerCase();
        case 'not_equals':
          return isBothNumeric ? numCell !== numSearch : cellVal.toLowerCase() !== searchVal.toLowerCase();
        case 'greater_than':
          return isBothNumeric ? numCell >= numSearch : cellVal >= searchVal;
        case 'less_than':
          return isBothNumeric ? numCell <= numSearch : cellVal <= searchVal;
        default:
          return true;
      }
    });
  });

  // 5. 정렬 처리 (컬럼 클릭 정렬 우선, 없을 시 최신순/과거순)
  const sortedRows = [...ruleFilteredRows].sort((a, b) => {
    if (columnSort) {
      const valA = a[columnSort.column] ?? '';
      const valB = b[columnSort.column] ?? '';
      const numA = Number(String(valA).replace(/,/g, '').trim());
      const numB = Number(String(valB).replace(/,/g, '').trim());
      if (!isNaN(numA) && !isNaN(numB) && String(valA).trim() !== '' && String(valB).trim() !== '') {
        return columnSort.direction === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const comp = strA.localeCompare(strB, 'ko', { numeric: true });
      return columnSort.direction === 'asc' ? comp : -comp;
    }
    // 기본 등록순/최신순
    return sortOrder === 'desc' ? (b._originIdx ?? 0) - (a._originIdx ?? 0) : (a._originIdx ?? 0) - (b._originIdx ?? 0);
  });

  // 6. 건수 제한 필터
  const filteredRows = filterState.limit > 0 ? sortedRows.slice(0, filterState.limit) : sortedRows;

  // 필터 활성화 여부 계산
  const activeRulesCount = (filterState.rules || []).filter((r) => r.value.trim()).length;
  const isFilterActive = Boolean(
    filterState.dateConfig.startDate ||
    filterState.dateConfig.endDate ||
    filterState.limit > 0 ||
    activeRulesCount > 0
  );
  const activeFilterCount =
    (filterState.dateConfig.startDate || filterState.dateConfig.endDate ? 1 : 0) +
    (filterState.limit > 0 ? 1 : 0) +
    activeRulesCount;

  const handleResetFilter = () => {
    setFilterState({
      dateConfig: { column: '', startDate: '', endDate: '', preset: 'all' },
      limit: 0,
      rules: [],
    });
    setColumnSort(null);
  };

  const handleToggleColSort = (colName: string) => {
    setColumnSort((prev) => {
      if (!prev || prev.column !== colName) {
        return { column: colName, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: colName, direction: 'desc' };
      }
      return null;
    });
  };

  // 엑셀 다운로드 클릭 핸들러 (필터 시 범위 선택)
  const handleDownloadXlsxClick = () => {
    if (!currentSheet || currentSheet.rows.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    if (filteredRows.length !== rawRowsWithOrigin.length) {
      setExportScopeTarget('xlsx');
      setShowExportScopeModal(true);
    } else {
      fileExport.downloadXlsx('all', filteredRows);
    }
  };

  // SQLite DB 다운로드 클릭 핸들러 (필터 시 범위 선택)
  const handleDownloadSqliteClick = () => {
    if (!currentSheet || currentSheet.rows.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    if (filteredRows.length !== rawRowsWithOrigin.length) {
      setExportScopeTarget('sqlite');
      setShowExportScopeModal(true);
    } else {
      fileExport.downloadSqlite('all', filteredRows);
    }
  };

  // 구글 시트 내보내기 클릭 핸들러 (필터 시 범위 선택)
  const handleExportGoogleSheetsClick = () => {
    if (!currentSheet || currentSheet.rows.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    if (filteredRows.length !== rawRowsWithOrigin.length) {
      setExportScopeTarget('sheets');
      setShowExportScopeModal(true);
    } else {
      proceedGoogleSheetsExport('all');
    }
  };

  const proceedGoogleSheetsExport = (scope: 'filtered' | 'all') => {
    setPendingScopeChoice(scope);
    if (currentProject?.googleSpreadsheetId) {
      fileExport.setIsExportOptionModalOpen(true);
    } else {
      fileExport.executeExportGoogleSheets('create', scope, filteredRows);
    }
  };

  // 범위 선택 모달 확정 핸들러
  const handleConfirmScope = (scope: 'filtered' | 'all') => {
    setShowExportScopeModal(false);
    if (exportScopeTarget === 'xlsx') {
      fileExport.downloadXlsx(scope, filteredRows);
    } else if (exportScopeTarget === 'sqlite') {
      fileExport.downloadSqlite(scope, filteredRows);
    } else if (exportScopeTarget === 'sheets') {
      proceedGoogleSheetsExport(scope);
    }
  };

  // AI 답변 표를 새 시트로 추가하는 핸들러
  const handleAddNewSheetFromAi = (newSheet: { name: string; headers: string[]; rows: Record<string, any>[] }) => {
    if (!currentProject) return;
    ws.setProjects((prev) => {
      const next = [...prev];
      if (!next[ws.activeProjectIndex]) return prev;
      const proj = { ...next[ws.activeProjectIndex] };
      proj.sheets = [
        ...proj.sheets,
        {
          name: newSheet.name,
          headers: newSheet.headers,
          rows: newSheet.rows,
        },
      ];
      proj.activeSheetIndex = proj.sheets.length - 1;
      next[ws.activeProjectIndex] = proj;
      return next;
    });
  };

  // [방안 1 핵심] 원격 DB의 모든(또는 선택된) 테이블을 각각 시트로 갖는 새 전용 프로젝트 열기
  const handleImportTablesToNewProject = (newProjectData: {
    name: string;
    sheets: Array<{ name: string; headers: string[]; rows: Record<string, any>[] }>;
  }) => {
    const newProj: ProjectWorkspace = {
      id: null,
      name: newProjectData.name,
      filename: `${newProjectData.name}.db`,
      category: '원격 데이터베이스',
      sheets: newProjectData.sheets.length > 0
        ? newProjectData.sheets.map((s) => ({
            name: s.name,
            headers: s.headers,
            rows: s.rows,
            rawRows: [],
          }))
        : [{ name: '기본시트', headers: ['id', 'name'], rows: [], rawRows: [] }],
      activeSheetIndex: 0,
      activeSubTab: 'table',
      uploadedAt: new Date().toLocaleString('ko-KR'),
    };

    ws.setProjects((prev) => {
      const next = [...prev, newProj];
      ws.setActiveProjectIndex(next.length - 1);
      return next;
    });
    setActiveSubTab('table');
  };

  // [방안 1 확장] 현재 열려 있는 프로젝트에 선택된 원격 테이블들을 시트로 일괄 추가
  const handleImportMultipleSheetsToCurrentProject = (
    newSheets: Array<{ name: string; headers: string[]; rows: Record<string, any>[] }>
  ) => {
    if (!currentProject) {
      handleImportTablesToNewProject({
        name: '🚀 운용 My DB (이지데스크)',
        sheets: newSheets,
      });
      return;
    }

    ws.setProjects((prev) => {
      const next = [...prev];
      if (!next[ws.activeProjectIndex]) return prev;
      const proj = { ...next[ws.activeProjectIndex] };
      const formattedSheets = newSheets.map((s) => ({
        name: s.name,
        headers: s.headers,
        rows: s.rows,
        rawRows: [],
      }));
      const startIndex = proj.sheets.length;
      proj.sheets = [...proj.sheets, ...formattedSheets];
      proj.activeSheetIndex = startIndex;
      next[ws.activeProjectIndex] = proj;
      return next;
    });
    setActiveSubTab('table');
  };

  // 🌟 시트별 AI 분석·적재 자연어 규칙 저장 (로컬 워크스페이스 및 sheet_rules 물리 테이블 동기화)
  const handleSaveSheetRule = async (sheetIndex: number, rule: string) => {
    const targetProj = currentProject;
    const targetSheet = targetProj?.sheets[sheetIndex];
    const sheetName = targetSheet?.name || 'Sheet1';

    ws.setProjects((prev) =>
      prev.map((proj, pIdx) => {
        if (pIdx !== ws.activeProjectIndex) return proj;
        const nextSheets = proj.sheets.map((sh, sIdx) => {
          if (sIdx !== sheetIndex) return sh;
          return { ...sh, customPrompt: rule || undefined };
        });
        return { ...proj, sheets: nextSheets };
      })
    );

    // 물리 DB (sheet_rules)에도 안전하게 영구 저장
    try {
      const now = new Date().toISOString();
      await insertRows('sheet_rules', [
        {
          project_id: targetProj?.id ? Number(targetProj.id) : null,
          sheet_name: sheetName,
          rule_text: rule || '',
          rule_type: 'manual',
          is_active: rule ? 1 : 0,
          created_at: now,
          updated_at: now,
        },
      ]);
    } catch (e) {
      console.warn('sheet_rules 물리 테이블 동기화 예외 (로컬 워크스페이스는 보존됨):', e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header
        currentUser={auth.currentUser}
        currentProject={currentProject}
        onOpenLoginModal={() => auth.setShowPhoneAuthModal(true)}
        onLogout={auth.handleLogout}
        onUploadFile={upload.handleFileDropOrSelect}
        onDownloadXlsx={handleDownloadXlsxClick}
        onDownloadSqlite={handleDownloadSqliteClick}
        onOpenPricingModal={() => setShowPricingModal(true)}
        onOpenBillingHistory={() => setShowBillingHistoryModal(true)}
        onOpenRemoteDbModal={() => setShowRemoteDbModal(true)}
        onOpenScheduleModal={() => setShowScheduleModal(true)}
        onOpenMobileIngestModal={() => setShowMobileIngestModal(true)}
        onOpenTransferModal={() => setShowTransferModal(true)}
        onOpenShareToManagerModal={() => setShowShareToManagerModal(true)}
        onOpenConsolidatedModal={() => setShowConsolidatedModal(true)}
        onOpenPlanModal={() => setLimitNotice({
          title: 'PRO 전용 기능',
          reason: 'SQLite DB 직접 다운로드 및 데이터 행 수 무제한 처리는 PRO 플랜 회원 혜택입니다.'
        })}
        onExportGoogleSheets={handleExportGoogleSheetsClick}
        onOpenOriginalModal={() => setShowOriginalModal(true)}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenShareManagementModal={() => setShowShareManagementModal(true)}
        onOpenAiChat={() => setShowAiChatDrawer(true)}
        hasOriginalFile={Boolean(currentProject?.originalFileUrl)}
        hasSheetData={Boolean(currentSheet && currentSheet.rows.length > 0)}
        exportLoading={fileExport.exportLoading}
      />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
        {ws.projects.length === 0 ? (
          <WelcomeDropzone
            isProcessing={upload.isProcessing}
            processStatus={upload.processStatus}
            storageProgress={upload.storageProgress}
            onFileSelect={upload.handleFileDropOrSelect}
          />
        ) : (
          <>
            <ProjectBar
              projects={ws.projects}
              activeProjectIndex={ws.activeProjectIndex}
              setActiveProjectIndex={ws.setActiveProjectIndex}
              editingProjectIdx={ws.editingProjectIdx}
              setEditingProjectIdx={ws.setEditingProjectIdx}
              editingProjectName={ws.editingProjectName}
              setEditingProjectName={ws.setEditingProjectName}
              onSaveProjectName={ws.saveProjectName}
              onAddNewProject={ws.handleAddNewProject}
              onCloseProject={ws.handleCloseProject}
            />

            {currentProject && currentSheet && (
              <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <SheetBar
                  sheets={currentProject.sheets}
                  activeSheetIndex={currentProject.activeSheetIndex}
                  category={currentProject.category}
                  editingSheetIdx={ws.editingSheetIdx}
                  setEditingSheetIdx={ws.setEditingSheetIdx}
                  editingSheetName={ws.editingSheetName}
                  setEditingSheetName={ws.setEditingSheetName}
                  onSelectSheet={ws.handleSelectSheet}
                  onSaveSheetName={ws.saveSheetName}
                  onAddNewSheet={ws.handleAddNewSheet}
                  onDeleteSheet={ws.handleDeleteSheet}
                  onOpenSheetRule={(idx) => setRuleModalSheetIdx(idx)}
                  plan={auth.currentUser?.plan}
                />

                <SubTabBar
                  activeSubTab={activeSubTab}
                  setActiveSubTab={setActiveSubTab}
                  rowsCount={filteredRows.length}
                  totalRowsCount={rawRowsWithOrigin.length}
                  hasOriginalFile={sheetOriginalFiles.length > 0}
                  originalFilesCount={sheetOriginalFiles.length}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onAddRow={ws.handleAddRow}
                  onOpenAddColumn={() => ws.setIsAddingColumn(true)}
                  sortOrder={sortOrder}
                  activeSortLabel={columnSort ? `${columnSort.column} ${columnSort.direction === 'asc' ? '▲' : '▼'}` : undefined}
                  onToggleSort={() => {
                    if (columnSort) {
                      if (columnSort.direction === 'asc') {
                        setColumnSort({ column: columnSort.column, direction: 'desc' });
                      } else {
                        setColumnSort(null);
                      }
                    } else {
                      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                    }
                  }}
                  headers={currentSheet.headers}
                  filterState={filterState}
                  onFilterChange={setFilterState}
                  onResetFilter={handleResetFilter}
                  isFilterActive={isFilterActive}
                  activeFilterCount={activeFilterCount}
                />

                {activeSubTab === 'table' && (
                  <TableView
                    sheet={currentSheet}
                    filteredRows={filteredRows}
                    docFilename={currentProject.name}
                    isTableDragging={isTableDragging}
                    setIsTableDragging={setIsTableDragging}
                    onDropDirectlyToTable={(file, allFiles) => {
                      if (allFiles && allFiles.length > 1) {
                        batchQueue.enqueueFiles(allFiles);
                      } else {
                        upload.handleDropDirectlyToTable(file);
                      }
                    }}
                    isProcessing={upload.isProcessing}
                    processStatus={upload.processStatus}
                    storageProgress={upload.storageProgress}
                    editingCell={ws.editingCell}
                    setEditingCell={ws.setEditingCell}
                    editValue={ws.editValue}
                    setEditValue={ws.setEditValue}
                    onSaveCellEdit={ws.saveCellEdit}
                    editingHeaderIdx={ws.editingHeaderIdx}
                    setEditingHeaderIdx={ws.setEditingHeaderIdx}
                    editingHeaderValue={ws.editingHeaderValue}
                    setEditingHeaderValue={ws.setEditingHeaderValue}
                    onSaveHeaderEdit={ws.saveHeaderEdit}
                    onDeleteColumn={ws.handleDeleteColumn}
                    onReorderColumns={ws.handleReorderColumns}
                    onDeleteRow={ws.handleDeleteRow}
                    sortCol={columnSort?.column || null}
                    sortDir={columnSort?.direction || null}
                    onToggleColSort={handleToggleColSort}
                    projectSheets={currentProject.sheets}
                    isJoinViewActive={ws.isJoinViewActive}
                    setIsJoinViewActive={ws.setIsJoinViewActive}
                  />
                )}

                {activeSubTab === 'original' && (
                  <OriginalDocView
                    project={currentProject}
                    onDeleteFile={ws.handleDeleteOriginalFile}
                    onGoToTableTab={() => setActiveSubTab('table')}
                    filteredRows={filteredRows}
                    isFiltered={filteredRows.length !== rawRowsWithOrigin.length}
                  />
                )}
                {activeSubTab === 'summary' && (
                  <SummaryView
                    sheet={currentSheet}
                    filteredRows={filteredRows}
                    totalRowsCount={rawRowsWithOrigin.length}
                    isFiltered={filteredRows.length !== rawRowsWithOrigin.length}
                    onResetFilter={handleResetFilter}
                    searchQuery={searchQuery}
                    onClearSearch={() => setSearchQuery('')}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* 1. 휴대폰 간편 인증 모달 */}
      <PhoneAuthModal
        show={auth.showPhoneAuthModal}
        onClose={() => auth.setShowPhoneAuthModal(false)}
        authStep={auth.authStep}
        setAuthStep={auth.setAuthStep}
        authPhoneNumber={auth.authPhoneNumber}
        setAuthPhoneNumber={auth.setAuthPhoneNumber}
        authCode={auth.authCode}
        setAuthCode={auth.setAuthCode}
        authLoading={auth.authLoading}
        authError={auth.authError}
        setAuthError={auth.setAuthError}
        timerSeconds={auth.timerSeconds}
        testCodeHint={auth.testCodeHint}
        onSendCode={auth.handleSendAuthCode}
        onVerifyCode={auth.handleVerifyAuthCode}
        onOpenEmergencyRecovery={() => setShowEmergencyRecoveryModal(true)}
      />

      {/* 2. 파일 업로드 옵션 선택 모달 (새 문서 / 새 시트 / 행 추가) */}
      <UploadOptionModal
        pendingFile={upload.pendingUploadFile}
        onClose={() => upload.setPendingUploadFile(null)}
        onSelectOption={upload.processFile}
        hasExistingProject={ws.projects.length > 0}
        initialPrompt={upload.initialPrompt}
        currentProject={currentProject}
      />

      {/* 3. 원본 증빙 파일 미리보기 모달 */}
      <OriginalFileModal
        show={showOriginalModal}
        onClose={() => setShowOriginalModal(false)}
        project={currentProject}
      />

      {/* 4. 새 열(Header) 추가 모달 (외래키 참조 열 지원) */}
      <AddColumnModal
        show={ws.isAddingColumn}
        onClose={() => ws.setIsAddingColumn(false)}
        newColumnName={ws.newColumnName}
        setNewColumnName={ws.setNewColumnName}
        onAddColumn={ws.handleAddColumn}
        sheets={currentProject?.sheets || []}
        activeSheetIndex={currentProject?.activeSheetIndex || 0}
      />

      {/* 5. Google 시트 내보내기 옵션 모달 */}
      <ExportOptionModal
        isOpen={fileExport.isExportOptionModalOpen}
        onClose={() => fileExport.setIsExportOptionModalOpen(false)}
        onSelectOption={(mode) => fileExport.executeExportGoogleSheets(mode, pendingScopeChoice, filteredRows)}
        spreadsheetUrl={currentProject?.googleSpreadsheetUrl}
        loading={fileExport.exportLoading}
      />

      {/* 6. 선택적 시트/탭 읽기 전용 보안 공유 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        projects={ws.projects}
        initialProjectIndex={ws.activeProjectIndex}
      />

      {/* 7. 플랜 한도 초과 안내 및 PRO 유도 모달 */}
      <PlanLimitModal
        isOpen={Boolean(limitNotice)}
        onClose={() => setLimitNotice(null)}
        title={limitNotice?.title}
        reason={limitNotice?.reason || ''}
        plan={auth.currentUser?.plan}
      />

      {/* 8. 상시 요금제 및 기능 비교 모달 (Free vs PRO vs Enterprise) */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentUser={auth.currentUser}
        onUpgrade={() => {
          setShowPricingModal(false);
          setLimitNotice({
            title: 'PRO 플랜 업그레이드',
            reason: '월 9,900원에 500장 AI 파싱과 무제한 데이터 행을 누려보세요.',
          });
        }}
        onOpenEnterpriseInquiry={() => setShowEnterpriseModal(true)}
        onOpenBillingHistory={() => setShowBillingHistoryModal(true)}
      />

      {/* 9. B2B 사내 구축형(Enterprise On-Premise) 견적 및 도입 상담 모달 */}
      <EnterpriseInquiryModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
      />

      {/* 10. 동일 내용 파일(SHA-256) 중복 업로드 방지 및 AI 크레딧 보호 모달 */}
      <DuplicateFileModal
        isOpen={Boolean(upload.duplicateWarning)}
        onClose={() => upload.setDuplicateWarning(null)}
        existingFile={upload.duplicateWarning?.existingFile || null}
        newFile={upload.duplicateWarning?.newFile || null}
        onProceed={upload.confirmProceedDuplicate}
      />

      {/* 11. 담당자 인수인계 및 휴대폰 번호 데이터 승계 모달 */}
      <AccountTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        currentUser={auth.currentUser}
        onTransferSuccess={(newUser) => {
          auth.setCurrentUser(newUser);
          alert(`새로운 담당자(${newUser.phoneNumber})로 성공적으로 승계되었습니다!`);
        }}
      />

      {/* 12. 사업소 시트 -> 본사 총괄 담당자에게 공유 전송 모달 */}
      <ShareToManagerModal
        isOpen={showShareToManagerModal}
        onClose={() => setShowShareToManagerModal(false)}
        currentProject={currentProject}
        currentUser={auth.currentUser}
      />

      {/* 13. 본사 총괄 전사용 사업소 공유 수신함 & 롤업 통계 대시보드 모달 */}
      <ConsolidatedStatsModal
        isOpen={showConsolidatedModal}
        onClose={() => setShowConsolidatedModal(false)}
        currentUser={auth.currentUser}
      />

      {/* 14. 대표자 2차 인증 기반 비상 계정 강제 회수 모달 */}
      <EmergencyRecoveryModal
        isOpen={showEmergencyRecoveryModal}
        onClose={() => setShowEmergencyRecoveryModal(false)}
        onRecoverySuccess={(newUser) => {
          auth.setCurrentUser(newUser);
          alert(`비상 회수가 안전하게 승인되었습니다. 새 담당자(${newUser.phoneNumber}) 계정으로 정상 전환되었습니다.`);
        }}
      />

      {/* 15. 외부에 공유된 프로젝트/시트/탭 통합 관리 센터 모달 */}
      <ShareManagementModal
        isOpen={showShareManagementModal}
        onClose={() => setShowShareManagementModal(false)}
        currentUser={auth.currentUser}
      />

      {/* 16. 내보내기 범위 (필터된 결과 vs 전체 원본) 선택 모달 */}
      <ExportScopeModal
        isOpen={showExportScopeModal}
        onClose={() => setShowExportScopeModal(false)}
        targetType={exportScopeTarget}
        filteredCount={filteredRows.length}
        totalCount={rawRowsWithOrigin.length}
        onConfirm={handleConfirmScope}
        loading={fileExport.exportLoading}
      />

      {/* 17. 파일 업로드 직후 1-Click 실행 취소 (Undo) 토스트 알림 */}
      <UploadUndoToast
        uploadInfo={upload.lastUploadAction}
        onUndo={upload.undoLastUpload}
        onDismiss={upload.dismissUndoToast}
      />

      {/* 18-A. 하단 중앙 플로팅 파일 업로드 FAB 버튼 (다중 파일 지원) */}
      {ws.projects.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <input
            type="file"
            ref={fabFileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleBatchOrSingleUpload(e.target.files);
                e.target.value = '';
              }
            }}
            accept=".xlsx,.xls,.csv,.pdf,image/*"
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fabFileInputRef.current?.click()}
            className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-extrabold text-xs shadow-xl shadow-slate-900/15 border border-slate-200 transition transform hover:scale-105 active:scale-95 group cursor-pointer"
            title="새 파일 업로드 (다중 파일 선택 가능, AI 스마트 시트 자동 분류)"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <span>파일 업로드</span>
          </button>
        </div>
      )}

      {/* 18-B. 우측 하단 플로팅 실시간 다중 업로드 큐 모니터링 창 */}
      <BatchUploadMonitor
        isOpen={batchQueue.isQueueOpen}
        isMinimized={batchQueue.isMinimized}
        setIsMinimized={batchQueue.setIsMinimized}
        onClose={batchQueue.closeQueue}
        queue={batchQueue.queue}
        totalCount={batchQueue.totalCount}
        completedCount={batchQueue.completedCount}
        mismatchedCount={batchQueue.mismatchedCount}
        failedCount={batchQueue.failedCount}
        inProgressCount={batchQueue.inProgressCount}
        waitingCount={batchQueue.waitingCount}
        totalAddedRows={batchQueue.totalAddedRows}
        isAllFinished={batchQueue.isAllFinished}
        onRetryItem={batchQueue.retryItem}
        onCreateSheetFromMismatched={batchQueue.createSheetFromMismatched}
        onClearFinished={batchQueue.clearFinished}
      />

      {/* 18-B. 우측 하단 플로팅 AI 데이터 비서 퀵 버튼 */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setShowAiChatDrawer(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-xl shadow-indigo-500/25 border border-white/20 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          title="자연어로 모든 시트와 프로젝트에 대해 질문하고 답변 받기"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          <span>AI 데이터 비서</span>
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            PRO
          </span>
        </button>
      </div>

      {/* 19. 자연어 시트 질의응답 AI Chat Drawer */}
      <AiChatDrawer
        isOpen={showAiChatDrawer}
        onClose={() => setShowAiChatDrawer(false)}
        projects={ws.projects}
        activeProjectIndex={ws.activeProjectIndex}
        onAddNewSheetFromAi={handleAddNewSheetFromAi}
        onOpenPricingModal={() => setShowPricingModal(true)}
        initialScope={aiChatInitialScope}
      />

      {/* 20. 결제/충전 및 이용 내역 통합 모달 (영수증 인쇄 / 세금계산서 발행 / 엑셀 다운로드) */}
      <BillingHistoryModal
        isOpen={showBillingHistoryModal}
        onClose={() => setShowBillingHistoryModal(false)}
        currentUser={auth.currentUser}
        currentProject={currentProject}
        onOpenPricingModal={() => setShowPricingModal(true)}
      />

      {/* 21. 원격지 이지데스크 터널링 My DB(Product 등) 연동 모달 */}
      <RemoteDbModal
        isOpen={showRemoteDbModal}
        onClose={() => setShowRemoteDbModal(false)}
        onImportToSheet={handleAddNewSheetFromAi}
        onImportTablesToNewProject={handleImportTablesToNewProject}
        onImportMultipleSheetsToCurrentProject={handleImportMultipleSheetsToCurrentProject}
        onOpenAiChatWithScope={(scope) => {
          setAiChatInitialScope(scope);
          setShowAiChatDrawer(true);
        }}
      />

      {/* 22. 시트별 AI 분석·적재 자연어 규칙 설정 모달 */}
      {ruleModalSheetIdx !== null && currentProject?.sheets[ruleModalSheetIdx] && (
        <SheetRuleModal
          isOpen={true}
          onClose={() => setRuleModalSheetIdx(null)}
          sheetIndex={ruleModalSheetIdx}
          sheetName={currentProject.sheets[ruleModalSheetIdx].name}
          sheetHeaders={currentProject.sheets[ruleModalSheetIdx].headers || []}
          sheetRowCount={(currentProject.sheets[ruleModalSheetIdx].rows || []).length}
          sampleRows={currentProject.sheets[ruleModalSheetIdx].rows || []}
          initialRule={currentProject.sheets[ruleModalSheetIdx].customPrompt || ''}
          onSaveRule={handleSaveSheetRule}
        />
      )}

      {/* 23. 정기 스케줄 & 무인 파이프라인 관리 모달 */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        project={currentProject}
      />

      {/* 24. 시트봇 모바일앱 직결 연동 (QR코드 & 토큰) 모달 */}
      <MobileIngestModal
        isOpen={showMobileIngestModal}
        onClose={() => setShowMobileIngestModal(false)}
        project={currentProject}
        activeSheetName={currentSheet?.name || '기본 시트'}
      />
    </div>
  );
}
