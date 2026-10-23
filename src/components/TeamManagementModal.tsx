'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, X, Plus, ShieldCheck, Trash2, CheckCircle2,
  Lock, Unlock, Eye, FileSpreadsheet, Download, FileText, BarChart3, AlertCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  UserSession, ProjectWorkspace, MemberPermissions,
  DEFAULT_MEMBER_PERMISSIONS, WorkspaceMember
} from '@/types/workspace';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  projects: ProjectWorkspace[];
  activeProjectIndex: number;
}

export function TeamManagementModal({
  isOpen,
  onClose,
  currentUser,
  projects,
  activeProjectIndex,
}: TeamManagementModalProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'list' | 'invite'>('list');

  // 초대 폼 상태
  const [phone, setPhone] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [permissions, setPermissions] = useState<MemberPermissions>({
    ...DEFAULT_MEMBER_PERMISSIONS,
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const currentProject = projects[activeProjectIndex] || projects[0] || null;
  const currentSheetNames = currentProject?.sheets?.map((s) => s.name) || [];

  // 팀원 목록 불러오기
  const fetchMembers = async () => {
    if (!currentUser?.phoneNumber) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/team?phone=${currentUser.phoneNumber}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.myMembers)) {
        setMembers(data.myMembers);
      }
    } catch (e) {
      console.error('팀원 목록 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setActiveTab('list');
      setPhone('');
      setNickname('');
      setPermissions({ ...DEFAULT_MEMBER_PERMISSIONS });
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, currentUser?.phoneNumber]);

  if (!isOpen) return null;

  // 시트 토글
  const toggleSheet = (sheetName: string) => {
    setPermissions((prev) => {
      const allowed = prev.allowedSheets || [];
      if (allowed.includes(sheetName)) {
        return { ...prev, allowedSheets: allowed.filter((s) => s !== sheetName) };
      } else {
        return { ...prev, allowedSheets: [...allowed, sheetName] };
      }
    });
  };

  // 초대 제출
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.phoneNumber) return;

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('유효한 휴대폰 번호를 입력해 주세요.');
      return;
    }
    if (cleanPhone === currentUser.phoneNumber.replace(/[^0-9]/g, '')) {
      setErrorMessage('본인의 번호는 초대할 수 없습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const res = await apiFetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerPhone: currentUser.phoneNumber,
          memberPhone: cleanPhone,
          memberNickname: nickname.trim() || '팀원',
          permissions,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '팀원 초대에 실패했습니다.');
      }

      setSuccessMessage(`${cleanPhone} 님을 성공적으로 팀원으로 등록했습니다.`);
      fetchMembers();
      setTimeout(() => {
        setActiveTab('list');
        setSuccessMessage('');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || '초대 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 팀원 삭제 / 추방
  const handleDeleteMember = async (id: number, memberName: string) => {
    if (!confirm(`'${memberName}' 팀원을 내 워크스페이스에서 제거(추방)하시겠습니까?\n모든 접근 권한이 즉시 회수됩니다.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/team?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert(data.error || '삭제 처리에 실패했습니다.');
      }
    } catch (e) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">팀 협업 & 권한 관리</h2>
              <p className="text-xs text-slate-500">다른 회원을 초대하고 시트 및 작업 권한을 지정합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-200 px-5 pt-2 bg-white gap-4">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'list'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            참여 중인 팀원 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-1 ${
              activeTab === 'invite'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            새 팀원 초대
          </button>
        </div>

        {/* 컨텐츠 본문 */}
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          {activeTab === 'list' ? (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-10 text-slate-400">팀원 목록을 불러오는 중...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                  <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">초대된 팀원이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    직원이나 파트너를 초대하여 함께 시트를 관리해 보세요.
                  </p>
                  <button
                    onClick={() => setActiveTab('invite')}
                    className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 새 팀원 초대하기
                  </button>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-all bg-white shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">
                          {member.memberNickname || '팀원'}
                        </span>
                        <span className="text-slate-400 text-xs font-mono">
                          {member.memberPhone}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                          {member.status === 'accepted' ? '참여중' : '초대완료'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteMember(member.id, member.memberNickname || member.memberPhone)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="팀원 제거"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 권한 뱃지들 */}
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        시트: {member.permissions.allowedSheets?.length > 0 ? `${member.permissions.allowedSheets.length}개 허용` : '전체 시트'}
                      </span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                        {member.permissions.rowEditScope === 'own_only' ? '본인 등록 데이터만 수정/삭제' : '전체 수정 허용'}
                      </span>
                      {member.permissions.canExportData ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">엑셀 다운로드 허용</span>
                      ) : (
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded">다운로드 차단(DLP)</span>
                      )}
                      {member.permissions.canAccessOriginal && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">원본 증빙 열람</span>
                      )}
                      {member.permissions.canAccessSummary && (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">요약 통계 열람</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* 입력 폼 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    팀원 휴대폰 번호 *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    팀원 별칭 / 직책
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김대리, 강남점 매니저"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 1. 시트 접근 범위 선택 */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <label className="block text-slate-800 font-bold mb-2 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  접근 허용 시트 (선택 시 해당 시트만 노출)
                </label>
                {currentSheetNames.length === 0 ? (
                  <p className="text-slate-400">현재 등록된 시트가 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentSheetNames.map((sName) => {
                      const isChecked = permissions.allowedSheets.includes(sName);
                      return (
                        <button
                          key={sName}
                          type="button"
                          onClick={() => toggleSheet(sName)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isChecked ? `✓ ${sName}` : sName}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-2">
                  * 시트를 하나도 선택하지 않으면 전체 시트 접근이 허용됩니다.
                </p>
              </div>

              {/* 2. 세부 권한 토글 */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-white">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  세부 작업 권한 제어
                </p>

                {/* 행 편집 범위 */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="font-semibold text-slate-700 block">데이터 수정 및 삭제 범위</span>
                    <span className="text-[11px] text-slate-400">
                      {permissions.rowEditScope === 'own_only'
                        ? '보안 권장: 자신이 업로드한 데이터만 수정/삭제 허용'
                        : '전체 데이터 수정/삭제 허용'}
                    </span>
                  </div>
                  <select
                    value={permissions.rowEditScope}
                    onChange={(e: any) =>
                      setPermissions((prev) => ({ ...prev, rowEditScope: e.target.value }))
                    }
                    className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-slate-50 font-medium"
                  >
                    <option value="own_only">본인 업로드분만</option>
                    <option value="all">전체 수정 허용</option>
                    <option value="none">수정 불가(읽기 전용)</option>
                  </select>
                </div>

                {/* 파일 업로드 허용 */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700 block">파일 업로드 및 데이터 추가</span>
                    <span className="text-[11px] text-slate-400">새 엑셀/증빙 파일 업로드 허용</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.canUpload}
                    onChange={(e) =>
                      setPermissions((prev) => ({ ...prev, canUpload: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>

                {/* 엑셀 다운로드 허용 (DLP) */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700 block">데이터 다운로드 (DLP)</span>
                    <span className="text-[11px] text-slate-400">엑셀/CSV 다운로드 및 시트 연동 허용 여부</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.canExportData}
                    onChange={(e) =>
                      setPermissions((prev) => ({ ...prev, canExportData: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>

                {/* 원본 증빙 대조 탭 */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700 block">원본 증빙 대조 탭</span>
                    <span className="text-[11px] text-slate-400">스캔 영수증 및 증빙 파일 열람 허용</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.canAccessOriginal}
                    onChange={(e) =>
                      setPermissions((prev) => ({ ...prev, canAccessOriginal: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>

                {/* 요약 통계 탭 */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700 block">요약 통계 탭</span>
                    <span className="text-[11px] text-slate-400">데이터 통계 및 피벗 요약 열람 허용</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.canAccessSummary}
                    onChange={(e) =>
                      setPermissions((prev) => ({ ...prev, canAccessSummary: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? '초대 등록 중...' : '팀원 초대하기'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
