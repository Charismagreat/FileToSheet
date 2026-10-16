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
import { PhoneAuthModal } from '@/components/PhoneAuthModal';
import { UploadOptionModal } from '@/components/UploadOptionModal';
import { OriginalFileModal } from '@/components/OriginalFileModal';
import { RecentFilesModal } from '@/components/RecentFilesModal';
import { AddColumnModal } from '@/components/AddColumnModal';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileExport } from '@/hooks/useFileExport';

export default function FileToSheetApp() {
  const auth = useAuth();
  const ws = useWorkspace();
  const upload = useFileUpload({
    projects: ws.projects,
    setProjects: ws.setProjects,
    activeProjectIndex: ws.activeProjectIndex,
    setActiveProjectIndex: ws.setActiveProjectIndex,
  });
  const fileExport = useFileExport({ currentProject: ws.currentProject });

  const [activeSubTab, setActiveSubTab] = useState<'table' | 'original' | 'summary'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTableDragging, setIsTableDragging] = useState<boolean>(false);
  const [showOriginalModal, setShowOriginalModal] = useState<boolean>(false);
  const [showRecentFilesModal, setShowRecentFilesModal] = useState<boolean>(false);

  const currentProject = ws.currentProject;
  const currentSheet = ws.currentSheet;

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
        onDownloadXlsx={fileExport.handleDownloadXlsx}
        onExportGoogleSheets={fileExport.handleExportGoogleSheets}
        onOpenOriginalModal={() => setShowOriginalModal(true)}
        hasOriginalFile={Boolean(currentProject?.originalFileUrl)}
        hasSheetData={Boolean(currentSheet && currentSheet.rows.length > 0)}
        exportLoading={fileExport.exportLoading}
        recentFilesCount={upload.recentFiles.length}
        onOpenRecentFilesModal={() => setShowRecentFilesModal(true)}
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
                />

                <SubTabBar
                  activeSubTab={activeSubTab}
                  setActiveSubTab={setActiveSubTab}
                  rowsCount={filteredRows.length}
                  hasOriginalFile={Boolean(currentProject.originalFileUrl || (currentProject.originalFiles && currentProject.originalFiles.length > 0))}
                  originalFilesCount={currentProject.originalFiles?.length || (currentProject.originalFileUrl ? 1 : 0)}
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
                    onDeleteRow={ws.handleDeleteRow}
                  />
                )}

                {activeSubTab === 'original' && <OriginalDocView project={currentProject} onDeleteFile={ws.handleDeleteOriginalFile} />}
                {activeSubTab === 'summary' && <SummaryView sheet={currentSheet} />}
              </div>
            )}
          </>
        )}
      </main>

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

      <UploadOptionModal
        pendingFile={upload.pendingUploadFile}
        onClose={() => upload.setPendingUploadFile(null)}
        onSelectOption={upload.processFile}
      />

      <OriginalFileModal
        show={showOriginalModal}
        onClose={() => setShowOriginalModal(false)}
        project={currentProject}
      />

      <RecentFilesModal
        show={showRecentFilesModal}
        onClose={() => setShowRecentFilesModal(false)}
        recentFiles={upload.recentFiles}
        onDeleteFile={upload.handleDeleteUploadedFile}
      />

      <AddColumnModal
        show={ws.isAddingColumn}
        onClose={() => ws.setIsAddingColumn(false)}
        newColumnName={ws.newColumnName}
        setNewColumnName={ws.setNewColumnName}
        onAddColumn={ws.handleAddColumn}
      />
    </div>
  );
}
