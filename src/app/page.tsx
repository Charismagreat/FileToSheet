'use client';

import React, { useState } from 'react';
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
  AccountTransferModal,
} from '@/components/modals';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileExport } from '@/hooks/useFileExport';
import { getSheetOriginalFiles } from '@/lib/sheet-helpers';

export default function FileToSheetApp() {
  const auth = useAuth();
  const [limitNotice, setLimitNotice] = useState<{ title: string; reason: string } | null>(null);
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
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


  const [activeSubTab, setActiveSubTab] = useState<'table' | 'original' | 'summary'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 최신순 기본값
  const [isTableDragging, setIsTableDragging] = useState<boolean>(false);
  const [showOriginalModal, setShowOriginalModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const currentProject = ws.currentProject;
  const currentSheet = ws.currentSheet;
  const sheetOriginalFiles = getSheetOriginalFiles(currentProject, currentSheet);

  const rawRowsWithOrigin = currentSheet ? currentSheet.rows.map((r, i) => ({ ...r, _originIdx: i })) : [];
  const searchedRows = rawRowsWithOrigin.filter((row) =>
    !searchQuery.trim() || Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredRows = sortOrder === 'desc' ? [...searchedRows].reverse() : searchedRows;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header
        currentUser={auth.currentUser}
        currentProject={currentProject}
        onOpenLoginModal={() => auth.setShowPhoneAuthModal(true)}
        onLogout={auth.handleLogout}
        onUploadFile={upload.handleFileDropOrSelect}
        onDownloadXlsx={fileExport.handleDownloadXlsx}
        onDownloadSqlite={fileExport.handleDownloadSqlite}
        onOpenPricingModal={() => setShowPricingModal(true)}
        onOpenTransferModal={() => setShowTransferModal(true)}
        onOpenPlanModal={() => setLimitNotice({
          title: 'PRO 전용 기능',
          reason: 'SQLite DB 직접 다운로드 및 데이터 행 수 무제한 처리는 PRO 플랜 회원 혜택입니다.'
        })}
        onExportGoogleSheets={fileExport.handleExportGoogleSheets}
        onOpenOriginalModal={() => setShowOriginalModal(true)}
        onOpenShareModal={() => setShowShareModal(true)}
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
                  plan={auth.currentUser?.plan}
                />

                <SubTabBar
                  activeSubTab={activeSubTab}
                  setActiveSubTab={setActiveSubTab}
                  rowsCount={filteredRows.length}
                  hasOriginalFile={sheetOriginalFiles.length > 0}
                  originalFilesCount={sheetOriginalFiles.length}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onAddRow={ws.handleAddRow}
                  onOpenAddColumn={() => ws.setIsAddingColumn(true)}
                  sortOrder={sortOrder}
                  onToggleSort={() => setSortOrder((prev) => prev === 'desc' ? 'asc' : 'desc')}
                />

                {activeSubTab === 'table' && (
                  <TableView
                    sheet={currentSheet}
                    filteredRows={filteredRows}
                    docFilename={currentProject.name}
                    isTableDragging={isTableDragging}
                    setIsTableDragging={setIsTableDragging}
                    onDropDirectlyToTable={upload.handleDropDirectlyToTable}
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
                  />
                )}

                {activeSubTab === 'original' && <OriginalDocView project={currentProject} onDeleteFile={ws.handleDeleteOriginalFile} onGoToTableTab={() => setActiveSubTab('table')} />}
                {activeSubTab === 'summary' && <SummaryView sheet={currentSheet} />}
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
      />

      {/* 2. 파일 업로드 옵션 선택 모달 (새 문서 / 새 시트 / 행 추가) */}
      <UploadOptionModal
        pendingFile={upload.pendingUploadFile}
        onClose={() => upload.setPendingUploadFile(null)}
        onSelectOption={upload.processFile}
        hasExistingProject={ws.projects.length > 0}
        initialPrompt={upload.initialPrompt}
      />

      {/* 3. 원본 증빙 파일 미리보기 모달 */}
      <OriginalFileModal
        show={showOriginalModal}
        onClose={() => setShowOriginalModal(false)}
        project={currentProject}
      />

      {/* 4. 새 열(Header) 추가 모달 */}
      <AddColumnModal
        show={ws.isAddingColumn}
        onClose={() => ws.setIsAddingColumn(false)}
        newColumnName={ws.newColumnName}
        setNewColumnName={ws.setNewColumnName}
        onAddColumn={ws.handleAddColumn}
      />

      {/* 5. Google 시트 내보내기 옵션 모달 */}
      <ExportOptionModal
        isOpen={fileExport.isExportOptionModalOpen}
        onClose={() => fileExport.setIsExportOptionModalOpen(false)}
        onSelectOption={(mode) => fileExport.executeExportGoogleSheets(mode)}
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
    </div>
  );
}
