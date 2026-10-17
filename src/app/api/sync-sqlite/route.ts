import { NextRequest, NextResponse } from 'next/server';
import { syncProjectToSqlite } from '@/lib/sqlite-engine';
import { ProjectWorkspace } from '@/types/workspace';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const project: ProjectWorkspace = body.project;

    if (!project || !project.sheets) {
      return NextResponse.json({ error: '유효한 프로젝트 데이터가 없습니다.' }, { status: 400 });
    }

    const savedPath = syncProjectToSqlite(project);

    return NextResponse.json({
      success: true,
      path: savedPath,
      message: 'SQLite 데이터베이스에 성공적으로 동기화되었습니다.',
    });
  } catch (error: any) {
    console.error('[API sync-sqlite] 오류:', error);
    return NextResponse.json(
      { error: error?.message || 'SQLite 동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
