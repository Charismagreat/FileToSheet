import { NextRequest, NextResponse } from 'next/server';
import { queryTable, deleteRows, updateRows } from '@/egdesk-helpers';

/**
 * 외부에 공유된 프로젝트/시트/탭 통합 관리 API
 * 1. GET: 사용자가 발급한 웹 링크 공유 목록 및 상대방에게 보낸 시트 내역 일괄 조회
 * 2. DELETE: 특정 공유 링크 파기(공유 중단) 또는 보낸 시트 회수
 */

export async function GET(request: NextRequest) {
  try {
    const userPhone = request.nextUrl.searchParams.get('userPhone');
    const cleanUserPhone = (userPhone || '').replace(/[^0-9]/g, '');

    // 1. 웹 링크 공유 목록 조회 (export_type = 'share_link')
    const linkRes = await queryTable('export_history', {
      filters: { export_type: 'share_link' },
      orderBy: 'id',
      orderDirection: 'DESC',
      limit: 100,
    });

    const rawLinkRows = linkRes?.rows || [];
    const webLinks = rawLinkRows.map((r: any) => {
      try {
        const payload = JSON.parse(r.target_url);
        return {
          id: r.id,
          token: payload.token || r.target_title,
          projectName: payload.projectName || '프로젝트',
          allowedSheets: payload.allowedSheets || [],
          allowedTabs: payload.allowedTabs || ['table', 'original', 'summary'],
          allowDownload: payload.allowDownload ?? true,
          hasPassword: Boolean(payload.hasPassword || payload.password),
          createdAt: payload.createdAt || r.created_at,
          status: r.status || 'active',
          shareUrl: `/share/${payload.token || r.target_title}`,
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // 2. 상대방에게 직접 보낸 시트 내역 조회 (export_type = 'branch_share')
    let sentSheets: any[] = [];
    if (cleanUserPhone) {
      const shareRes = await queryTable('export_history', {
        filters: { export_type: 'branch_share' },
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 100,
      });

      const rawShareRows = shareRes?.rows || [];
      sentSheets = rawShareRows.map((r: any) => {
        try {
          const payload = JSON.parse(r.target_url);
          // 내가 발신자인 경우만 필터링
          if (payload.senderPhone === cleanUserPhone) {
            return {
              id: r.id,
              receiverPhone: payload.receiverPhone,
              senderBranch: payload.senderBranch,
              projectName: payload.projectName,
              sheetName: payload.sheetName,
              rowCount: payload.rowCount || (payload.rows ? payload.rows.length : 0),
              sharedAt: payload.sharedAt || r.created_at,
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }

    return NextResponse.json({
      success: true,
      webLinks,
      sentSheets,
      totalActiveShares: webLinks.length + sentSheets.length,
    });
  } catch (error: any) {
    console.error('공유 관리 목록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '공유 관리 목록을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: '삭제할 공유 항목의 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // export_history 테이블에서 해당 공유 항목 영구 삭제 (외부 접근 즉시 차단)
    await deleteRows('export_history', {
      filters: { id: String(id) },
    });

    console.log(`[Share Revoke] 공유 항목 ID ${id} 파기 및 회수 완료 (외부 접속 차단)`);

    return NextResponse.json({
      success: true,
      message: '공유가 성공적으로 중단 및 회수되었습니다. 외부 접근이 즉시 차단됩니다.',
    });
  } catch (error: any) {
    console.error('공유 중단/삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '공유 항목 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
