// c:\dev\FileToSheet\src\app\api\antigravity\query\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryTable } from '@/egdesk-helpers';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { syncProjectToSqlite } from '@/lib/sqlite-engine';

const SQLITE_DIR = path.join(process.cwd(), 'data', 'sqlite');

/**
 * POST /api/antigravity/query
 * 안티그라비티(Antigravity) 스킬 및 에이전트 전용 초고속 데이터 쿼리 엔드포인트
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phoneNumber, projectId, sql, sheetName, limit = 100 } = body;

    const cookiePhone = request.cookies.get('fts_user_phone')?.value;
    const headerPhone = request.headers.get('x-user-phone');
    const cleanNumber = (phoneNumber || headerPhone || cookiePhone || '').replace(/[^0-9]/g, '');

    // 1. 프로젝트 목록 조회
    if (action === 'list_projects') {
      const filters: Record<string, string> = {};
      if (cleanNumber) filters.phone_number = cleanNumber;

      const pRes = await queryTable('user_projects', {
        filters,
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 50,
      });

      const projects = (pRes?.rows || []).map((r: any) => {
        let sheetNames: string[] = [];
        try {
          const parsed = typeof r.sheets_data === 'string' ? JSON.parse(r.sheets_data) : r.sheets_data;
          sheetNames = Array.isArray(parsed) ? parsed.map((s: any) => s.name) : [];
        } catch {}

        return {
          id: r.id,
          name: r.project_name || '이름 없는 장부',
          category: r.category || '일반',
          sheetCount: sheetNames.length,
          sheets: sheetNames,
          updatedAt: r.updated_at,
        };
      });

      return NextResponse.json({ success: true, projects });
    }

    // 대상 프로젝트 식별
    let targetProjectRow: any = null;
    if (projectId) {
      const pRes = await queryTable('user_projects', {
        filters: { id: String(projectId) },
        limit: 1,
      });
      targetProjectRow = pRes?.rows?.[0];
    } else if (cleanNumber) {
      // 프로젝트 ID 미지정 시 사용자의 최신 프로젝트
      const pRes = await queryTable('user_projects', {
        filters: { phone_number: cleanNumber },
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 1,
      });
      targetProjectRow = pRes?.rows?.[0];
    }

    if (!targetProjectRow) {
      return NextResponse.json(
        { success: false, error: '대상 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    let parsedSheets: any[] = [];
    try {
      parsedSheets = typeof targetProjectRow.sheets_data === 'string'
        ? JSON.parse(targetProjectRow.sheets_data)
        : (targetProjectRow.sheets_data || []);
    } catch {
      parsedSheets = [];
    }

    // 2. 시트 목록 및 컬럼 스키마 조회
    if (action === 'list_sheets') {
      const sheetsMeta = parsedSheets.map((s: any) => ({
        name: s.name,
        headers: s.headers || [],
        rowCount: Array.isArray(s.rows) ? s.rows.length : 0,
      }));

      return NextResponse.json({
        success: true,
        projectId: targetProjectRow.id,
        projectName: targetProjectRow.project_name,
        sheets: sheetsMeta,
      });
    }

    // 3. SQL 쿼리 실행
    // 우선 최신 데이터를 SQLite 파일에 동기화 보장
    const workspaceObj = {
      id: targetProjectRow.id,
      name: targetProjectRow.project_name,
      category: targetProjectRow.category,
      sheets: parsedSheets,
      activeSheetIndex: 0,
      originalFiles: [],
    };
    const sqlitePath = syncProjectToSqlite(workspaceObj as any);

    if (action === 'query_sql' || sql) {
      const querySql = (sql || '').trim();
      if (!querySql) {
        return NextResponse.json({ success: false, error: '실행할 SQL 쿼리가 없습니다.' }, { status: 400 });
      }

      // 보안 가드: 데이터 조작(INSERT, UPDATE, DELETE, DROP, ALTER) 방지 및 읽기 전용 보장
      const forbiddenKeywords = [/^\s*DROP/i, /^\s*ALTER/i, /^\s*TRUNCATE/i, /^\s*ATTACH/i, /^\s*DETACH/i];
      for (const pattern of forbiddenKeywords) {
        if (pattern.test(querySql)) {
          return NextResponse.json({ success: false, error: '보안 정책상 읽기 전용 쿼리(SELECT)만 허용됩니다.' }, { status: 403 });
        }
      }

      const db = new DatabaseSync(sqlitePath);
      try {
        const stmt = db.prepare(querySql);
        const rows = stmt.all();
        return NextResponse.json({
          success: true,
          projectId: targetProjectRow.id,
          projectName: targetProjectRow.project_name,
          sql: querySql,
          rowCount: rows.length,
          rows: rows.slice(0, Number(limit) || 100),
        });
      } finally {
        db.close();
      }
    }

    // 4. 단순 시트 행 전체 조회 (sheetName 지정 시)
    if (action === 'get_sheet' || sheetName) {
      const sheet = parsedSheets.find((s: any) => s.name === sheetName) || parsedSheets[0];
      if (!sheet) {
        return NextResponse.json({ success: false, error: '시트를 찾을 수 없습니다.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        projectId: targetProjectRow.id,
        projectName: targetProjectRow.project_name,
        sheetName: sheet.name,
        headers: sheet.headers || [],
        rowCount: (sheet.rows || []).length,
        rows: (sheet.rows || []).slice(0, Number(limit) || 100),
      });
    }

    return NextResponse.json({
      success: false,
      error: '지원되지 않는 action입니다. (list_projects, list_sheets, query_sql, get_sheet 중 선택)',
    }, { status: 400 });
  } catch (error: any) {
    console.error('[API /api/antigravity/query] 오류:', error);
    return NextResponse.json({ success: false, error: error.message || '쿼리 처리 실패' }, { status: 500 });
  }
}
