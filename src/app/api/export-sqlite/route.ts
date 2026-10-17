import { NextRequest, NextResponse } from 'next/server';
import { exportProjectAsSqliteBuffer } from '@/lib/sqlite-engine';
import { ProjectWorkspace } from '@/types/workspace';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const project: ProjectWorkspace = body.project;

    if (!project || !project.sheets) {
      return NextResponse.json({ error: '유효한 프로젝트 데이터가 없습니다.' }, { status: 400 });
    }

    const buffer = exportProjectAsSqliteBuffer(project);
    const rawName = project.name ? project.name.trim() : 'Project';
    const safeName = encodeURIComponent(rawName.replace(/[^\w\s\uAC00-\uD7A3.-]/g, '_'));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="${safeName}.sqlite"; filename*=UTF-8''${safeName}.sqlite`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[API export-sqlite] 오류:', error);
    return NextResponse.json(
      { error: error?.message || 'SQLite 내보내기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
