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
  PhoneAuthModal, UploadOptionModal, OriginalFileModal,
  AddColumnModal, ExportOptionModal, ShareModal, PlanLimitModal,
} from '@/components/modals';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileExport } from '@/hooks/useFileExport';
import { getSheetOriginalFiles } from '@/lib/sheet-helpers';


export default function FileToSheetApp() {
  const auth = useAuth();
  const [limitNotice, setLimitNotice] = useState<{ title: string; reason: string } | null>(null);
  const handlePlanLimit = (title: string, reason: string) => setLimitNotice({ title, reason });

  const ws = useWorkspace({
    phoneNumber: auth.currentUser?.phoneNumber,
    plan: auth.currentUser?.plan,
    onPlanLimit: handlePlanLimit,
  });
  const upload = useFileUpload({
    projects: ws.projects,
    setProjects: ws.setProjects,
    activeProjectIndex: ws.activeProjectIndex,
    setActiveProjectIndex: ws.setActiveProjectIndex,
    plan: auth.currentUser?.plan,
    onPlanLimit: handlePlanLimit,
  });
  const fileExport = useFileExport({
    currentProject: ws.currentProject,
    setProjects: ws.setProjects,
    activeProjectIndex: ws.activeProjectIndex,
  });

  const [activeSubTab, setActiveSubTab] = useState<'table' | 'original' | 'summary'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTableDragging, setIsTableDragging] = useState<boolean>(false);
  const [showOriginalModal, setShowOriginalModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const currentProject = ws.currentProject;
  const currentSheet = ws.currentSheet;
  const sheetOriginalFiles = getSheetOriginalFiles(currentProject, currentSheet);

  const filteredRows = currentSheet
    ? currentSheet.rows.filter((row) =>
        !searchQuery.trim() || Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header
        currentUser={auth.currentUser}
        onOpenLoginModal={() => auth.setShowPhoneAuthModal(true)}
        onLogout={auth.handleLogout}
        onUploadFile={upload.handleFileDropOrSelect}
        onDownloadXlsx={fileExport.handleDownloadXlsx}
        onDownloadSqlite={fileExport.handleDownloadSqlite}
        onOpenPlanModal={() => setLimitNotice({
          title: 'PRO 전용 기능',
          reason: 'SQLite DB 직접 다운로드 및 10,000건 초과 대용량 데이터 처리는 PRO 플랜 회원 혜택입니다.'
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

      <PhoneAuthModal
        show={auth.showPhoneAuthModal} onClose={() => auth.setShowPhoneAuthModal(false)}
        authStep={auth.authStep} setAuthStep={auth.setAuthStep}
        authPhoneNumber={auth.authPhoneNumber} setAuthPhoneNumber={auth.setAuthPhoneNumber}
        authCode={auth.authCode} setAuthCode={auth.setAuthCode}
        authLoading={auth.authLoading} authError={auth.authError} setAuthError={auth.setAuthError}
        timerSeconds={auth.timerSeconds} testCodeHint={auth.testCodeHint}
        onSendCode={auth.handleSendAuthCode} onVerifyCode={auth.handleVerifyAuthCode}
      />

      <UploadOptionModal

        pendingFile={upload.pendingUploadFile}
        onClose={() => upload.setPendingUploadFile(null)}
        onSelectOption={upload.processFile}
        hasExistingProject={ws.projects.length > 0}
        initialPrompt={upload.initialPrompt}
      />

      <OriginalFileModal show={showOriginalModal} onClose={() => setShowOriginalModal(false)} project={currentProject} />
      <AddColumnModal show={ws.isAddingColumn} onClose={() => ws.setIsAddingColumn(false)} newColumnName={ws.newColumnName} setNewColumnName={ws.setNewColumnName} onAddColumn={ws.handleAddColumn} />
      <ExportOptionModal isOpen={fileExport.isExportOptionModalOpen} onClose={() => fileExport.setIsExportOptionModalOpen(false)} onSelectOption={(mode) => fileExport.executeExportGoogleSheets(mode)} spreadsheetUrl={currentProject?.googleSpreadsheetUrl} loading={fileExport.exportLoading} />
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} projects={ws.projects} initialProjectIndex={ws.activeProjectIndex} />
      <PlanLimitModal isOpen={Boolean(limitNotice)} onClose={() => setLimitNotice(null)} title={limitNotice?.title} reason={limitNotice?.reason || ''} plan={auth.currentUser?.plan} />
    </div>
  );
}
