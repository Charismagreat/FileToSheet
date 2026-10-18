'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  X,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Calendar,
  Moon,
  ShoppingCart,
  Briefcase,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ProjectWorkspace } from '@/types/workspace';

interface ScheduleTask {
  id: number;
  project_id: string;
  title: string;
  cron_expression: string;
  preset_name: string;
  source_type: string;
  source_path: string;
  target_sheet: string;
  is_active: number;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_result: string | null;
  created_at: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWorkspace | null;
}

export function ScheduleModal({ isOpen, onClose, project }: ScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [runningId, setRunningId] = useState<number | null>(null);

  // 신규 등록 폼 상태
  const [title, setTitle] = useState<string>('심야 영수증 무인 파싱');
  const [preset, setPreset] = useState<string>('overnight');
  const [cronExpression, setCronExpression] = useState<string>('0 0 * * *');
  const [sourceType, setSourceType] = useState<string>('google_drive');
  const [sourcePath, setSourcePath] = useState<string>('Receipts_Inbox');
  const [targetSheet, setTargetSheet] = useState<string>('자동 라우팅');

  const projectId = project?.id ? String(project.id) : 'default';

  // 스케줄 목록 불러오기
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scheduler?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        if (data.tasks.length === 0) {
          setActiveTab('create');
        }
      }
    } catch (err) {
      console.error('Failed to fetch schedule tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, projectId]);

  // 프리셋 선택 핸들러
  const handlePresetChange = (presetKey: string) => {
    setPreset(presetKey);
    if (presetKey === 'overnight') {
      setTitle('심야 영수증 무인 일괄 파싱');
      setCronExpression('0 0 * * *');
      setSourcePath('Receipts_Inbox');
    } else if (presetKey === 'closing') {
      setTitle('택배 마감 발주서 자동 취합');
      setCronExpression('0 10,16 * * 1-5');
      setSourcePath('Orders_Daily');
    } else if (presetKey === 'weekly') {
      setTitle('주간 통장 입출금 & 미수금 대조');
      setCronExpression('0 8 * * 1');
      setSourcePath('Bank_Statements');
    } else if (presetKey === 'branch') {
      setTitle('전국 매장 마감 매출 동기화');
      setCronExpression('0 23 * * *');
      setSourcePath('Branch_Inboxes');
    }
  };

  // 신규 스케줄 등록
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !cronExpression.trim()) return;

    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          cronExpression,
          presetName: preset,
          sourceType,
          sourcePath,
          targetSheet,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
        setActiveTab('list');
      } else {
        alert(data.error || '스케줄 등록 실패');
      }
    } catch (err: any) {
      alert(err.message || '오류가 발생했습니다.');
    }
  };

  // 즉시 1회 실행 (Run Now)
  const handleRunNow = async (id: number) => {
    setRunningId(id);
    try {
      const res = await fetch('/api/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'run_now' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Run now failed:', err);
    } finally {
      setRunningId(null);
    }
  };

  // 활성/비활성 토글
  const handleToggleActive = async (id: number, currentActive: number) => {
    try {
      const res = await fetch('/api/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: currentActive === 1 ? false : true }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Toggle active failed:', err);
    }
  };

  // 스케줄 삭제
  const handleDeleteTask = async (id: number) => {
    if (!confirm('이 스케줄을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/scheduler?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Delete task failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <span>정기 스케줄 & 무인 파이프라인</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  Cron Engine
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {project ? `현재 프로젝트: [${project.name}]` : '무인 자동화 배치 설정'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 my-3">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            예약된 스케줄 ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            새 스케줄 등록
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'list' ? (
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  스케줄 목록을 불러오는 중...
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">등록된 정기 스케줄이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    [새 스케줄 등록] 버튼을 눌러 심야 영수증 파싱이나 마감 발주서 취합을 예약해 보세요.
                  </p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition ${
                      task.is_active === 1
                        ? 'bg-slate-50/80 border-slate-200'
                        : 'bg-slate-100/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              task.is_active === 1 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          주기: {task.cron_expression} • 감시경로: {task.source_path} ➔ {task.target_sheet}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(task.id, task.is_active)}
                          className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition ${
                            task.is_active === 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {task.is_active === 1 ? '가동 중' : '일시정지'}
                        </button>
                        <button
                          type="button"
                          disabled={runningId === task.id}
                          onClick={() => handleRunNow(task.id)}
                          className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs"
                          title="스케줄 시간에 관계없이 지금 1회 즉시 실행합니다"
                        >
                          {runningId === task.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          즉시실행
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-[10.5px] text-slate-500 flex items-center justify-between">
                      <span>최근 실행: {task.last_run_at ? task.last_run_at.slice(0, 19).replace('T', ' ') : '기록 없음'}</span>
                      <span className="font-medium text-slate-600 truncate max-w-[240px]">
                        {task.last_run_result || '대기 중'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              {/* 1. 프리셋 선택 버튼 그룹 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">자주 쓰는 실무 프리셋</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetChange('overnight')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      preset === 'overnight'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-[11px]">심야 영수증 파싱</div>
                      <div className="text-[10px] text-slate-400 font-mono">매일 밤 00:00</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange('closing')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      preset === 'closing'
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-[11px]">택배 마감 발주서</div>
                      <div className="text-[10px] text-slate-400 font-mono">평일 10:00/16:00</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange('weekly')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      preset === 'weekly'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[11px]">주간 통장 & 미수금</div>
                      <div className="text-[10px] text-slate-400 font-mono">매주 월요일 08:00</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange('branch')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      preset === 'branch'
                        ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div className="text-[11px]">전국 매장 마감 매출</div>
                      <div className="text-[10px] text-slate-400 font-mono">매일 밤 23:00</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. 스케줄 제목 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">스케줄 작업명</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* 3. Cron 주기 설정 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  실행 주기 (Cron Expression)
                </label>
                <input
                  type="text"
                  required
                  value={cronExpression}
                  onChange={(e) => {
                    setCronExpression(e.target.value);
                    setPreset('custom');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  표준 5단위 크론식 (분 시 일 월 요일) • 예: 0 0 * * * (매일 자정)
                </p>
              </div>

              {/* 4. 감시 소스 선택 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">입력 소스</label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="google_drive">Google Drive 지정 폴더</option>
                    <option value="local_folder">로컬/서버 공유 폴더</option>
                    <option value="share_inbox">지점 수신함 (share_links)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">감시 폴더명/경로</label>
                  <input
                    type="text"
                    value={sourcePath}
                    onChange={(e) => setSourcePath(e.target.value)}
                    placeholder="Inbox"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 5. 적재 타깃 시트 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">적재할 타깃 시트</label>
                <select
                  value={targetSheet}
                  onChange={(e) => setTargetSheet(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="자동 라우팅">✨ 스마트 AI 자동 라우팅</option>
                  {project?.sheets.map((s) => (
                    <option key={s.name} value={s.name}>
                      📑 {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                >
                  스케줄 예약 등록
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
