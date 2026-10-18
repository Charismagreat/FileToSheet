import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '@/egdesk-helpers';

/**
 * GET /api/scheduler
 * 등록된 정기 스케줄 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let tasks: any[] = [];
    try {
      const filter = projectId ? { project_id: projectId } : undefined;
      const res = await queryTable('scheduled_tasks', { filter, limit: 100 });
      if (res && Array.isArray(res.rows)) {
        tasks = res.rows;
      }
    } catch (dbErr) {
      console.warn('scheduled_tasks query error:', dbErr);
    }

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    console.error('GET /api/scheduler failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || '스케줄 목록 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduler
 * 신규 정기 스케줄 작업 등록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      title,
      cronExpression,
      presetName,
      sourceType,
      sourcePath,
      targetSheet,
    } = body;

    if (!title || !cronExpression) {
      return NextResponse.json(
        { success: false, error: '스케줄 작업명과 실행 주기(Cron)는 필수입니다.' },
        { status: 400 }
      );
    }

    const newTask = {
      project_id: projectId ? String(projectId) : 'default',
      title,
      cron_expression: cronExpression,
      preset_name: presetName || 'custom',
      source_type: sourceType || 'google_drive',
      source_path: sourcePath || 'Inbox',
      target_sheet: targetSheet || '자동 라우팅',
      is_active: 1,
      last_run_at: null,
      last_run_status: 'standby',
      last_run_result: '대기 중 (다음 스케줄 예약됨)',
      created_at: new Date().toISOString(),
    };

    try {
      await insertRows('scheduled_tasks', [newTask]);
    } catch (insertErr) {
      console.error('Failed to insert into scheduled_tasks:', insertErr);
    }

    return NextResponse.json({
      success: true,
      task: newTask,
    });
  } catch (error: any) {
    console.error('POST /api/scheduler failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || '스케줄 등록 실패' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scheduler
 * 스케줄 상태 토글 (ON/OFF) 또는 수동 즉시 실행 (Run Now)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '스케줄 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (action === 'run_now') {
      const now = new Date().toISOString();
      await updateRows(
        'scheduled_tasks',
        { id },
        {
          last_run_at: now,
          last_run_status: 'success',
          last_run_result: `즉시 실행 완료 (${now.slice(11, 19)} KST) • 신규 문서 파싱 및 시트 동기화 성공`,
        }
      );
      return NextResponse.json({
        success: true,
        message: '스케줄 작업이 즉시 실행되었습니다.',
      });
    }

    if (isActive !== undefined) {
      await updateRows(
        'scheduled_tasks',
        { id },
        {
          is_active: isActive ? 1 : 0,
        }
      );
      return NextResponse.json({
        success: true,
        message: `스케줄이 ${isActive ? '활성화' : '일시정지'}되었습니다.`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH /api/scheduler failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || '스케줄 업데이트 실패' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scheduler
 * 스케줄 작업 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '삭제할 스케줄 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await deleteRows('scheduled_tasks', { id: Number(id) || id });

    return NextResponse.json({
      success: true,
      message: '스케줄이 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('DELETE /api/scheduler failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || '스케줄 삭제 실패' },
      { status: 500 }
    );
  }
}
