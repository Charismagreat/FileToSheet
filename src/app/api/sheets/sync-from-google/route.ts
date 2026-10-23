import { NextRequest, NextResponse } from 'next/server';
import { queryTable, updateRows } from '@/egdesk-helpers';
import { ProjectWorkspace, OriginalDocFile, ParsedSheet } from '@/types/workspace';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 🌟 구글 시트 Apps Script에서 호출하는 동기화 및 원본 파일 수신 엔드포인트
 * POST /api/sheets/sync-from-google
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const {
      syncToken,
      projectId,
      spreadsheetId,
      sheetName,
      headers = [],
      rows = [],
      files = [],
      syncMode = 'overwrite', // 'overwrite' | 'append'
    } = payload;

    if (!projectId && !spreadsheetId) {
      return NextResponse.json(
        { success: false, error: 'projectId 또는 spreadsheetId가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!sheetName) {
      return NextResponse.json(
        { success: false, error: '동기화할 sheetName(시트 탭 이름)이 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 대상 프로젝트 DB 조회
    let projectRow: any = null;

    if (projectId) {
      const res = await queryTable('user_projects', {
        filters: { id: String(projectId) },
        limit: 1,
      });
      projectRow = res?.rows?.[0];
    }

    if (!projectRow && spreadsheetId) {
      // spreadsheetId로 프로젝트 탐색
      const allRes = await queryTable('user_projects', { limit: 100 });
      for (const row of allRes?.rows || []) {
        try {
          const p = JSON.parse(row.project_json || '{}');
          if (p.googleSpreadsheetId === spreadsheetId) {
            projectRow = row;
            break;
          }
          if (Array.isArray(p.sheets) && p.sheets.some((s: any) => s.connectedGoogleSheet?.spreadsheetId === spreadsheetId)) {
            projectRow = row;
            break;
          }
        } catch (e) {}
      }
    }

    if (!projectRow) {
      return NextResponse.json(
        { success: false, error: '연결된 FileToSheet 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 프로젝트 파싱
    let project: ProjectWorkspace;
    try {
      project = typeof projectRow.project_json === 'string'
        ? JSON.parse(projectRow.project_json)
        : (projectRow.project_json || {});
    } catch (e) {
      return NextResponse.json(
        { success: false, error: '프로젝트 데이터 파싱에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(project.sheets)) {
      project.sheets = [];
    }
    if (!Array.isArray(project.originalFiles)) {
      project.originalFiles = [];
    }

    // 2. 동기화할 대상 시트 찾기 (없으면 새로 생성)
    let targetSheetIndex = project.sheets.findIndex((s) => s.name === sheetName);
    let targetSheet: ParsedSheet;

    if (targetSheetIndex >= 0) {
      targetSheet = project.sheets[targetSheetIndex];
    } else {
      // 신규 시트 생성
      targetSheet = {
        name: sheetName,
        headers: headers.length > 0 ? headers : ['일련번호', '등록일시'],
        rows: [],
        rawRows: [],
        originalFiles: [],
        connectedGoogleSheet: {
          spreadsheetId: spreadsheetId || project.googleSpreadsheetId || '',
          sheetTabName: sheetName,
          syncToken: syncToken || '',
          lastSyncedAt: new Date().toISOString(),
        },
      };
      project.sheets.push(targetSheet);
      targetSheetIndex = project.sheets.length - 1;
    }

    // 3. 🌟 원본 증빙 파일 수신 및 1:N 중복 제거 등록
    // fileKey -> fileName 매핑 테이블
    const fileKeyToFileNameMap = new Map<string, string>();
    let savedFilesCount = 0;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const nowIso = new Date().toISOString();

    for (const fileItem of files) {
      const { fileKey, fileName, mimeType, base64Data } = fileItem;
      if (!fileName || !base64Data) continue;

      // 이미 프로젝트에 동일한 이름 또는 fileKey로 등록된 파일이 있는지 확인
      const existingFile = project.originalFiles?.find(
        (f) => f.name === fileName || (fileKey && (f as any).fileKey === fileKey)
      );

      if (existingFile) {
        fileKeyToFileNameMap.set(fileKey || fileName, existingFile.name);
        continue;
      }

      // 새 파일 디스크 저장 및 등록
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // 해시가 같은 파일이 이미 존재하는지 확인
        const hashMatch = project.originalFiles?.find((f) => f.hash === hash || f.fileHash === hash);
        if (hashMatch) {
          fileKeyToFileNameMap.set(fileKey || fileName, hashMatch.name);
          continue;
        }

        const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = path.join(uploadsDir, safeFileName);
        fs.writeFileSync(filePath, buffer);

        const newDocFile: OriginalDocFile = {
          name: fileName,
          url: `/uploads/${safeFileName}`,
          dataUrl: `data:${mimeType || 'application/octet-stream'};base64,${base64Data.slice(0, 50000)}`, // 미리보기용
          hash,
          size: buffer.length,
          uploadedAt: nowIso,
          uploaderPhone: projectRow.phone_number,
        };
        (newDocFile as any).fileKey = fileKey;

        project.originalFiles.push(newDocFile);
        fileKeyToFileNameMap.set(fileKey || fileName, fileName);
        savedFilesCount++;
      } catch (fileErr) {
        console.warn(`파일 [${fileName}] 저장 중 오류 (무시하고 계속):`, fileErr);
      }
    }

    // 4. 데이터 행 가공 및 파일 1:N 자동 매핑
    const kstTime = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    const processedRows = rows.map((r: any, idx: number) => {
      const row = { ...r };
      if (!row['일련번호']) row['일련번호'] = idx + 1;
      if (!row['등록일시']) row['등록일시'] = kstTime;

      // 행에 연결된 _fileKey가 있으면 _fileName 매핑 주입
      const matchedFileName = row._fileKey ? fileKeyToFileNameMap.get(row._fileKey) : null;
      if (matchedFileName) {
        row._fileName = matchedFileName;
      }

      return row;
    });

    // 5. 동기화 모드 적용 (치환 vs 누적)
    if (syncMode === 'append') {
      const currentRowsCount = targetSheet.rows.length;
      const appendRows = processedRows.map((r: any, i: number) => ({
        ...r,
        일련번호: currentRowsCount + i + 1,
      }));
      targetSheet.rows = [...targetSheet.rows, ...appendRows];
    } else {
      // overwrite (거울 동기화)
      targetSheet.rows = processedRows;
    }

    // 헤더 갱신 (구글 시트 헤더가 있으면 병합)
    if (Array.isArray(headers) && headers.length > 0) {
      targetSheet.headers = headers;
    }

    // 동기화 시각 및 메타데이터 업데이트
    if (!targetSheet.connectedGoogleSheet) {
      targetSheet.connectedGoogleSheet = {
        spreadsheetId: spreadsheetId || project.googleSpreadsheetId || '',
        sheetTabName: sheetName,
        syncToken: syncToken || '',
      };
    }
    targetSheet.connectedGoogleSheet.lastSyncedAt = nowIso;

    project.sheets[targetSheetIndex] = targetSheet;

    // 6. DB 물리 저장 (user_projects 테이블 업데이트)
    await updateRows(
      'user_projects',
      {
        project_json: JSON.stringify(project),
        sheets_data: JSON.stringify(project.sheets),
        original_files: JSON.stringify({ files: project.originalFiles }),
        updated_at: nowIso,
      },
      { filters: { id: String(projectRow.id) } }
    );

    return NextResponse.json({
      success: true,
      message: `'${sheetName}' 시트에 ${processedRows.length}개 행이 동기화되었습니다.` +
        (savedFilesCount > 0 ? ` (증빙 파일 ${savedFilesCount}개 신규 등록)` : ''),
      syncedRowsCount: processedRows.length,
      syncedFilesCount: savedFilesCount,
      lastSyncedAt: nowIso,
    });
  } catch (error: any) {
    console.error('구글 시트 수신 동기화 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '동기화 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
