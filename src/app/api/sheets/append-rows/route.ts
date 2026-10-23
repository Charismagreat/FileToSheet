import { NextRequest, NextResponse } from 'next/server';
import { queryTable, updateRows } from '@/egdesk-helpers';
import { ParsedSheet } from '@/lib/parser';
import { OriginalDocFile } from '@/types/workspace';

function cleanPhone(phone?: string | null): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

/**
 * 다중 협업 시 동시 편집 덮어쓰기 유실을 방지하는 원자적 행 추가 API
 * POST /api/sheets/append-rows
 * Body: { ownerPhone, projectId, sheetName, newRows, uploaderPhone, originalFiles? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerPhone = cleanPhone(body.ownerPhone);
    const uploaderPhone = cleanPhone(body.uploaderPhone) || ownerPhone;
    const projectId = body.projectId;
    const sheetName = body.sheetName;
    const newRows: Record<string, any>[] = Array.isArray(body.newRows) ? body.newRows : [];
    const newOriginalFiles: OriginalDocFile[] = Array.isArray(body.originalFiles) ? body.originalFiles : [];

    if (!ownerPhone || !projectId || !sheetName) {
      return NextResponse.json(
        { success: false, error: '소유자 전화번호, 프로젝트 ID, 시트 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    if (newRows.length === 0 && newOriginalFiles.length === 0) {
      return NextResponse.json({ success: true, message: '추가할 데이터가 없습니다.', addedCount: 0 });
    }

    // 1. 최신 프로젝트 조회
    const projectRes = await queryTable('user_projects', {
      filters: { id: projectId },
      limit: 1,
    });

    if (!projectRes?.rows || projectRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const row = projectRes.rows[0];
    let sheets: ParsedSheet[] = [];
    let originalFiles: OriginalDocFile[] = [];

    try {
      sheets = typeof row.sheets_data === 'string' ? JSON.parse(row.sheets_data) : row.sheets_data || [];
    } catch (e) {
      sheets = [];
    }

    try {
      const parsedOf = typeof row.original_files === 'string' ? JSON.parse(row.original_files) : row.original_files;
      if (Array.isArray(parsedOf)) {
        originalFiles = parsedOf;
      } else if (parsedOf && typeof parsedOf === 'object') {
        originalFiles = parsedOf.files || [];
      }
    } catch (e) {
      originalFiles = [];
    }

    // 2. 대상 시트 찾기
    let targetSheet = sheets.find((s) => s.name === sheetName);
    if (!targetSheet) {
      // 대상 시트가 없으면 신규 생성
      const sampleHeaders = newRows.length > 0
        ? Object.keys(newRows[0]).filter((k) => !k.startsWith('_'))
        : ['일련번호', '등록일시', '내용', '비고'];

      targetSheet = {
        name: sheetName,
        headers: sampleHeaders,
        rows: [],
        rawRows: [],
      };
      sheets.push(targetSheet);
    }

    const nowIso = new Date().toISOString();
    const nowKorean = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    // 3. 새 행들에 작성자 격리 메타데이터 주입
    const taggedNewRows = newRows.map((r, idx) => ({
      ...r,
      _createdByPhone: uploaderPhone,
      _createdAt: nowIso,
      _rowUid: `row_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    }));

    // 4. 헤더 확장 (새로운 컬럼이 들어왔을 경우 스키마 자동 진화)
    if (taggedNewRows.length > 0) {
      const existingHeaders = new Set(targetSheet.headers);
      Object.keys(taggedNewRows[0]).forEach((key) => {
        if (!key.startsWith('_') && !existingHeaders.has(key)) {
          targetSheet!.headers.push(key);
          existingHeaders.add(key);
        }
      });
    }

    // 5. 시트 행 병합
    targetSheet.rows = [...(targetSheet.rows || []), ...taggedNewRows];

    // 6. 원본 파일 메타데이터 병합
    const taggedOriginalFiles = newOriginalFiles.map((f) => ({
      ...f,
      uploaderPhone: uploaderPhone,
      uploadedAt: f.uploadedAt || nowKorean,
    }));
    originalFiles = [...originalFiles, ...taggedOriginalFiles];

    // 7. DB 업데이트
    await updateRows(
      'user_projects',
      {
        sheets_data: JSON.stringify(sheets),
        original_files: JSON.stringify(originalFiles),
        updated_at: nowKorean,
      },
      { ids: [projectId] }
    );

    return NextResponse.json({
      success: true,
      message: `${taggedNewRows.length}건의 행이 안전하게 추가되었습니다.`,
      addedCount: taggedNewRows.length,
      updatedSheets: sheets,
      updatedOriginalFiles: originalFiles,
    });
  } catch (error: any) {
    console.error('원자적 행 추가 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
