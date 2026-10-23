'use client';

import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check, User, Users, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { UserSession, WorkspaceContextInfo, MemberPermissions, DEFAULT_MEMBER_PERMISSIONS } from '@/types/workspace';

interface WorkspaceSwitcherProps {
  currentUser: UserSession | null;
  activeContext: WorkspaceContextInfo;
  onSwitchContext: (context: WorkspaceContextInfo) => void;
}

interface InvitedSpace {
  id: number;
  ownerPhone: string;
  ownerName: string;
  status: string;
  permissions: MemberPermissions;
  createdAt: string;
}

export function WorkspaceSwitcher({
  currentUser,
  activeContext,
  onSwitchContext,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [invitedSpaces, setInvitedSpaces] = useState<InvitedSpace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = async () => {
    if (!currentUser?.phoneNumber) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/team?phone=${currentUser.phoneNumber}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.invitedSpaces)) {
        setInvitedSpaces(data.invitedSpaces);
      }
    } catch (e) {
      console.error('워크스페이스 목록 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [currentUser?.phoneNumber]);

  if (!currentUser) return null;

  const handleSelectPersonal = () => {
    onSwitchContext({
      type: 'personal',
      ownerPhone: currentUser.phoneNumber,
      ownerName: currentUser.nickname || '나',
      isOwner: true,
      memberRole: 'owner',
    });
    setIsOpen(false);
  };

  const handleSelectTeam = (space: InvitedSpace) => {
    onSwitchContext({
      type: 'team',
      ownerPhone: space.ownerPhone,
      ownerName: space.ownerName,
      isOwner: false,
      memberRole: 'member',
      permissions: space.permissions,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchWorkspaces();
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs ${
          activeContext.isOwner
            ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/20'
        }`}
        title="작업 공간(워크스페이스) 전환"
      >
        {activeContext.isOwner ? (
          <>
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[120px]">내 워크스페이스</span>
          </>
        ) : (
          <>
            <Building2 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="truncate max-w-[130px] font-bold">
              {activeContext.ownerName} 팀
            </span>
            <span className="bg-amber-200 text-amber-800 text-[10px] px-1 py-0.2 rounded font-medium">
              팀원
            </span>
          </>
        )}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
            <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>작업 공간 전환</span>
              {loading && <span className="text-[10px] text-blue-500">동기화 중...</span>}
            </div>

            {/* 1. 내 개인 워크스페이스 */}
            <button
              onClick={handleSelectPersonal}
              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                activeContext.isOwner ? 'bg-blue-50/50 font-bold text-blue-600' : 'text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="truncate">
                  <p className="truncate">내 개인 워크스페이스</p>
                  <p className="text-[10px] text-slate-400 font-normal">
                    {currentUser.phoneNumber} (소유자)
                  </p>
                </div>
              </div>
              {activeContext.isOwner && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
            </button>

            {/* 2. 초대받은 팀 워크스페이스 목록 */}
            {invitedSpaces.length > 0 && (
              <div className="mt-1 border-t border-slate-100 pt-1">
                <div className="px-3 py-1 text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>초대받은 팀 워크스페이스</span>
                </div>
                {invitedSpaces.map((space) => {
                  const isSelected = !activeContext.isOwner && activeContext.ownerPhone === space.ownerPhone;
                  return (
                    <button
                      key={space.id}
                      onClick={() => handleSelectTeam(space)}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-amber-50/60 transition-colors ${
                        isSelected ? 'bg-amber-100/50 font-bold text-amber-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-amber-700" />
                        </div>
                        <div className="truncate">
                          <p className="truncate font-semibold">{space.ownerName} 대표팀</p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            소유자: {space.ownerPhone}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
