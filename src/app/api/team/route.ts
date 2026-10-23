import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '@/egdesk-helpers';
import { DEFAULT_MEMBER_PERMISSIONS, MemberPermissions } from '@/types/workspace';

/**
 * 전화번호 정규화 헬퍼 (숫자 11자리 추출)
 */
function cleanPhone(phone?: string | null): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

/**
 * 1. GET: 팀원 목록 및 내가 참여 중인 워크스페이스 목록 조회
 * Query: ?phone=01012345678
 */
export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone');
    const myPhone = cleanPhone(phone);

    if (!myPhone) {
      return NextResponse.json({ success: false, error: '전화번호가 필요합니다.' }, { status: 400 });
    }

    // 1. 내가 소유자로서 초대한 팀원 목록 조회
    const membersRes = await queryTable('workspace_members', {
      filters: { owner_phone: myPhone },
      orderBy: 'id',
      orderDirection: 'DESC',
    });

    const myMembers = (membersRes?.rows || []).map((row: any) => {
      let permissions: MemberPermissions = DEFAULT_MEMBER_PERMISSIONS;
      try {
        permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
      } catch (e) {
        // fallback
      }
      return {
        id: row.id,
        ownerPhone: row.owner_phone,
        memberPhone: row.member_phone,
        memberNickname: row.member_nickname || '팀원',
        status: row.status || 'invited',
        permissions,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    // 2. 내가 초대받은 워크스페이스 목록 조회
    const invitedRes = await queryTable('workspace_members', {
      filters: { member_phone: myPhone },
      orderBy: 'id',
      orderDirection: 'DESC',
    });

    // 소유자 정보(이름 등) 조회를 위해 users 테이블 대조
    const invitedSpaces = await Promise.all(
      (invitedRes?.rows || []).map(async (row: any) => {
        let permissions: MemberPermissions = DEFAULT_MEMBER_PERMISSIONS;
        try {
          permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
        } catch (e) {}

        // 소유자 닉네임 조회
        let ownerName = '대표님';
        try {
          const ownerUserRes = await queryTable('users', {
            filters: { phone_number: row.owner_phone },
            limit: 1,
          });
          if (ownerUserRes?.rows?.[0]?.nickname) {
            ownerName = ownerUserRes.rows[0].nickname;
          }
        } catch (e) {}

        return {
          id: row.id,
          ownerPhone: row.owner_phone,
          ownerName,
          status: row.status,
          permissions,
          createdAt: row.created_at,
        };
      })
    );

    return NextResponse.json({
      success: true,
      myMembers,
      invitedSpaces,
    });
  } catch (error: any) {
    console.error('팀 멤버십 조회 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * 2. POST: 새 팀원 초대 또는 권한 갱신
 * Body: { ownerPhone, memberPhone, memberNickname, permissions }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerPhone = cleanPhone(body.ownerPhone);
    const memberPhone = cleanPhone(body.memberPhone);
    const memberNickname = body.memberNickname?.trim() || '팀원';
    const permissions: MemberPermissions = {
      ...DEFAULT_MEMBER_PERMISSIONS,
      ...(body.permissions || {}),
    };

    if (!ownerPhone || !memberPhone) {
      return NextResponse.json({ success: false, error: '소유자 및 초대할 회원 번호가 올바르지 않습니다.' }, { status: 400 });
    }

    if (ownerPhone === memberPhone) {
      return NextResponse.json({ success: false, error: '본인 번호는 초대할 수 없습니다.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 기존 초대 여부 확인
    const existing = await queryTable('workspace_members', {
      filters: { owner_phone: ownerPhone, member_phone: memberPhone },
      limit: 1,
    });

    if (existing?.rows && existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      await updateRows(
        'workspace_members',
        {
          member_nickname: memberNickname,
          permissions: JSON.stringify(permissions),
          updated_at: now,
        },
        { ids: [existingId] }
      );
      return NextResponse.json({
        success: true,
        message: '팀원 권한이 성공적으로 수정되었습니다.',
        memberId: existingId,
      });
    }

    // 신규 초대 레코드 생성
    const insertRes = await insertRows('workspace_members', [
      {
        owner_phone: ownerPhone,
        member_phone: memberPhone,
        member_nickname: memberNickname,
        status: 'invited',
        permissions: JSON.stringify(permissions),
        created_at: now,
        updated_at: now,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: '성공적으로 초대를 보냈습니다.',
      memberId: insertRes?.ids?.[0],
    });
  } catch (error: any) {
    console.error('팀원 초대 처리 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * 3. PATCH: 초대 수락/거절 또는 특정 권한 수정
 * Body: { id, status?, permissions? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: '멤버 ID가 필요합니다.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      updatePayload.status = body.status;
    }

    if (body.permissions) {
      updatePayload.permissions = typeof body.permissions === 'string'
        ? body.permissions
        : JSON.stringify(body.permissions);
    }

    await updateRows('workspace_members', updatePayload, { ids: [id] });

    return NextResponse.json({ success: true, message: '업데이트되었습니다.' });
  } catch (error: any) {
    console.error('멤버 상태 수정 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * 4. DELETE: 팀원 추방 또는 초대 취소
 * Query: ?id=123
 */
export async function DELETE(request: NextRequest) {
  try {
    const idStr = request.nextUrl.searchParams.get('id');
    const id = idStr ? parseInt(idStr, 10) : null;

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 멤버 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteRows('workspace_members', { ids: [id] });

    return NextResponse.json({ success: true, message: '팀원이 성공적으로 삭제/회수되었습니다.' });
  } catch (error: any) {
    console.error('팀원 삭제 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
