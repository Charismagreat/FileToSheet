import { NextRequest, NextResponse } from 'next/server';
import { insertRows, queryTable } from '@/egdesk-helpers';

function generateShareToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'shr_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      projectName,
      allowedSheets,
      allowedTabs,
      allowDownload,
      sheets,
      originalFiles,
    } = await request.json();

    if (!projectName || !Array.isArray(sheets)) {
      return NextResponse.json(
        { success: false, error: '프로젝트 데이터가 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    const token = generateShareToken();
    const now = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

    // 공유 스냅샷 페이로드 구성 (선택된 시트 및 탭만 필터링)
    const filteredSheets = sheets.filter((s: any) =>
      !allowedSheets || allowedSheets.length === 0 || allowedSheets.includes(s.name)
    );

    const sharePayload = {
      token,
      projectId,
      projectName,
      allowedSheets: allowedSheets || [],
      allowedTabs: allowedTabs || ['table', 'original', 'summary'],
      allowDownload: allowDownload ?? true,
      sheets: filteredSheets,
      originalFiles: (allowedTabs || []).includes('original') ? (originalFiles || []) : [],
      createdAt: now,
    };

    // export_history 테이블에 안전하게 영구 저장
    await insertRows('export_history', [
      {
        file_id: projectId ? Number(projectId) : null,
        export_type: 'share_link',
        target_title: token,
        target_url: JSON.stringify(sharePayload),
        status: 'active',
        created_at: now,
      },
    ]);

    return NextResponse.json({
      success: true,
      token,
      sharePath: `/share/${token}`,
      message: '공유 링크가 성공적으로 발급되었습니다.',
    });
  } catch (error: any) {
    console.error('공유 링크 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '공유 링크 생성 실패' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ success: false, error: '토큰이 필요합니다.' }, { status: 400 });
    }

    const res = await queryTable('export_history', {
      filters: { export_type: 'share_link', target_title: token },
      limit: 1,
    });

    const row = res?.rows?.[0];
    if (!row || !row.target_url) {
      return NextResponse.json({ success: false, error: '유효하지 않거나 만료된 공유 링크입니다.' }, { status: 404 });
    }

    const shareConfig = JSON.parse(row.target_url);
    return NextResponse.json({ success: true, shareConfig });
  } catch (error: any) {
    console.error('공유 링크 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '공유 링크 조회 실패' },
      { status: 500 }
    );
  }
}
