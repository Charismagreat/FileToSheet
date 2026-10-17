import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ProjectWorkspace } from '@/types/workspace';

const SQLITE_DIR = path.join(process.cwd(), 'data', 'sqlite');

function ensureDir() {
  if (!fs.existsSync(SQLITE_DIR)) {
    fs.mkdirSync(SQLITE_DIR, { recursive: true });
  }
}

function escapeSqlIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * 프로젝트 전체 데이터를 독립 SQLite 파일(project_{id}.sqlite)로 동기화 적재
 */
export function syncProjectToSqlite(project: ProjectWorkspace): string {
  ensureDir();
  const fileKey = project.id ? String(project.id) : 'draft';
  const filePath = path.join(SQLITE_DIR, `project_${fileKey}.sqlite`);

  // 기존 파일 초기화 후 새로 동기화
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }

  const db = new DatabaseSync(filePath);

  try {
    // 1. 프로젝트 메타데이터 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS _project_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    const insertMeta = db.prepare('INSERT INTO _project_meta (key, value) VALUES (?, ?)');
    insertMeta.run('id', String(project.id ?? ''));
    insertMeta.run('name', project.name || '');
    insertMeta.run('category', project.category || '');
    insertMeta.run('total_sheets', String(project.sheets.length));
    insertMeta.run('synced_at', new Date().toISOString());

    // 2. 각 시트(Sheet)를 실제 RDBMS 테이블로 구축
    for (const sheet of project.sheets) {
      const tableName = escapeSqlIdentifier(sheet.name || 'Sheet1');
      const headers = sheet.headers && sheet.headers.length > 0
        ? sheet.headers
        : ['일련번호', '등록일시', '내용'];

      // 테이블 생성 DDL
      const colDefs = headers.map((h) => `${escapeSqlIdentifier(h)} TEXT`).join(', ');
      db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs});`);

      // 행 데이터 트랜잭션 대량 삽입
      if (sheet.rows && sheet.rows.length > 0) {
        db.exec('BEGIN TRANSACTION;');
        const placeholders = headers.map(() => '?').join(', ');
        const insertStmt = db.prepare(`INSERT INTO ${tableName} VALUES (${placeholders})`);

        for (const row of sheet.rows) {
          const values = headers.map((h) => {
            const v = row[h];
            return v !== undefined && v !== null ? String(v) : '';
          });
          insertStmt.run(...values);
        }
        db.exec('COMMIT;');
      }
    }
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch {}
    throw err;
  } finally {
    db.close();
  }

  return filePath;
}

/**
 * 프로젝트 데이터를 다운로드 가능한 SQLite 바이너리 버퍼로 생성
 */
export function exportProjectAsSqliteBuffer(project: ProjectWorkspace): Buffer {
  const filePath = syncProjectToSqlite(project);
  return fs.readFileSync(filePath);
}

/**
 * 프로젝트 SQLite 파일에서 특정 시트의 데이터를 페이징 조회
 */
export function queryProjectSqliteSheet(
  projectId: number | string,
  sheetName: string,
  limit = 100,
  offset = 0
): { rows: any[]; totalCount: number } {
  ensureDir();
  const filePath = path.join(SQLITE_DIR, `project_${projectId}.sqlite`);
  if (!fs.existsSync(filePath)) return { rows: [], totalCount: 0 };

  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const table = escapeSqlIdentifier(sheetName);
    const countRow: any = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    const totalCount = countRow?.count ? Number(countRow.count) : 0;

    const rows: any[] = db.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`).all(limit, offset);
    return { rows, totalCount };
  } finally {
    db.close();
  }
}
