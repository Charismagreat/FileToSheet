import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '@/egdesk-helpers';

/**
 * 총괄 담당자 대상 시트 공유 및 수신함 조회 API
 * 사업소 담당자가 총괄 담당자의 휴대폰 번호로 시트를 공유하고,
 * 총괄 담당자는 본인에게 공유된 전사 사업소 시트들을 모아볼 수 있음.
 */

export async function POST(request: NextRequest) {
  try {
    const {
      senderPhone,
      senderBranch,
      receiverPhone,
      projectName,
      sheetName,
      headers,
      rows,
      originalFiles,
    } = await request.json();

    if (!receiverPhone || !projectName || !sheetName || !Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, error: '필수 공유 정보(수신자 번호, 사업소명, 시트 데이터)가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const cleanSenderPhone = (senderPhone || '').replace(/[^0-9]/g, '');
    const cleanReceiverPhone = receiverPhone.replace(/[^0-9]/g, '');
    const branchName = (senderBranch || '사업소').trim();

    if (cleanReceiverPhone.length < 10 || !cleanReceiverPhone.startsWith('010')) {
      return NextResponse.json(
        { success: false, error: '올바른 010 총괄 담당자 휴대폰 번호를 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (cleanSenderPhone && cleanSenderPhone === cleanReceiverPhone) {
      return NextResponse.json(
        { success: false, error: '본인 번호로는 공유할 수 없습니다. 총괄 담당자의 번호를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const now = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

    // 공유 페이로드 구성
    const sharePayload = {
      senderPhone: cleanSenderPhone,
      senderBranch: branchName,
      receiverPhone: cleanReceiverPhone,
      projectName,
      sheetName,
      headers: headers || [],
      rows,
      originalFiles: originalFiles || [],
      rowCount: rows.length,
      sharedAt: now,
    };

    // export_history 테이블에 target_title = receiverPhone, export_type = 'branch_share'로 안전하게 보관
    await insertRows('export_history', [
      {
        file_id: null,
        export_type: 'branch_share',
        target_title: cleanReceiverPhone, // 수신자 휴대폰 번호
        target_url: JSON.stringify(sharePayload),
        status: 'active',
        created_at: now,
      },
    ]);

    console.log(`[Branch Share] ${branchName}(${cleanSenderPhone}) -> 총괄(${cleanReceiverPhone}) : 시트 [${sheetName}] (${rows.length}행) 공유 완료`);

    return NextResponse.json({
      success: true,
      message: `'${branchName}'의 '${sheetName}' 시트가 총괄 담당자(${cleanReceiverPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')})에게 성공적으로 공유되었습니다.`,
    });
  } catch (error: any) {
    console.error('총괄 공유 등록 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '공유 등록에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const receiverPhone = request.nextUrl.searchParams.get('receiverPhone');
    if (!receiverPhone) {
      return NextResponse.json({ success: false, error: '총괄 담당자 휴대폰 번호가 필요합니다.' }, { status: 400 });
    }

    const cleanReceiverPhone = receiverPhone.replace(/[^0-9]/g, '');

    // 수신자의 공유 시트 목록 조회
    const res = await queryTable('export_history', {
      filters: { export_type: 'branch_share', target_title: cleanReceiverPhone },
      orderBy: 'id',
      orderDirection: 'DESC',
    });

    const rows = res?.rows || [];
    const sharedList = rows.map((r: any) => {
      try {
        const payload = JSON.parse(r.target_url);
        return {
          id: r.id,
          ...payload,
          dbCreatedAt: r.created_at,
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      count: sharedList.length,
      items: sharedList,
    });
  } catch (error: any) {
    console.error('공유 수신함 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '공유 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 공유 항목 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('export_history', {
      filters: { id },
    });

    return NextResponse.json({
      success: true,
      message: '공유 항목이 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('공유 항목 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '공유 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
