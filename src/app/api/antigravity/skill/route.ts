// c:\dev\FileToSheet\src\app\api\antigravity\skill\route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const SKILL_MD_CONTENT = (userPhone: string, defaultProjectId: string) => `---
name: filetosheet
description: 파일투시트(FileToSheet) 프로젝트 및 시트 데이터에 대해 자연어로 질의, 집계, 통계 분석, 검색, 또는 SQL 쿼리를 수행할 때 사용합니다. 사용자가 파일투시트 장부(영수증대장, 배송대장, 통화녹음대장, 결제내역 등)의 데이터를 조회하거나 요약해달라고 할 때 활성화됩니다.
---

# FileToSheet 안티그라비티 데이터 쿼리 스킬

파일투시트에 보관된 스프레드시트 장부 데이터를 자연어 질문을 바탕으로 SQLite RDBMS에 실시간 조회·집계하여 사용자에게 명확한 마크다운 표와 분석 요약으로 제공합니다.

## 1. 지원 기능 및 쿼리 방식
1. **프로젝트 목록 조회**: 사용자가 소유한 장부 프로젝트 목록 확인
2. **시트 및 스키마 검사**: 특정 프로젝트 내의 시트 목록과 컬럼 헤더 파악
3. **고성능 Text-to-SQL 쿼리**: 복잡한 조건 필터링, GROUP BY 통계, SUM/AVG/COUNT 집계 수행

## 2. 쿼리 실행 방법

스킬에 포함된 초경량 실행 스크립트([query.mjs](./scripts/query.mjs))를 \`run_command\` 도구로 실행합니다.

\`\`\`powershell
# 1. 내 장부 프로젝트 목록 확인
node "<skill_path>/scripts/query.mjs" --projects

# 2. 특정 프로젝트의 시트 탭 목록 및 컬럼 헤더 확인
node "<skill_path>/scripts/query.mjs" --sheets --project "${defaultProjectId || '최신'}"

# 3. 고성능 SQLite SQL 실행 (Text-to-SQL)
node "<skill_path>/scripts/query.mjs" --sql "SELECT 상호, SUM(합계금액) as 총액 FROM \\"영수증대장\\" GROUP BY 상호 ORDER BY 총액 DESC LIMIT 5"
\`\`\`

## 3. 대표적인 Text-to-SQL 쿼리 예시

- **영수증대장 지출 상위 5개 처**:
  \`\`\`sql
  SELECT 상호, SUM(합계금액) AS 지출총액 FROM "영수증대장" GROUP BY 상호 ORDER BY 지출총액 DESC LIMIT 5;
  \`\`\`
- **화물배송대장 미배송 목록**:
  \`\`\`sql
  SELECT 일련번호, 운송장번호, 수하인, 연락처, 배송상태 FROM "화물배송대장" WHERE 배송상태 NOT LIKE '%완료%';
  \`\`\`
- **결제입금내역 입출금 합계**:
  \`\`\`sql
  SELECT 입출구분, count(*) AS 거래건수, sum(거래금액) AS 총금액 FROM "결제입금내역" GROUP BY 입출구분;
  \`\`\`
- **통화녹음대장 최근 통화 요약**:
  \`\`\`sql
  SELECT 통화일시, 상대방이름, 상대방번호, 통화시간, AI요약 FROM "통화녹음대장" ORDER BY 통화일시 DESC LIMIT 10;
  \`\`\`

## 4. 응답 가이드라인
- 쿼리 결과를 반드시 한국어로 친절하고 전문적으로 설명합니다.
- 데이터가 있는 경우 깔끔한 마크다운 표(\`| 컬럼 | ... |\`)로 렌더링하고, 핵심 수치(총액, 건수 등)는 굵은 글씨로 요약합니다.
`;

const QUERY_MJS_CONTENT = (userPhone: string, defaultProjectId: string) => `// query.mjs - FileToSheet Antigravity Query Runner
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// config.json 로드
let config = {
  phoneNumber: '${userPhone}',
  defaultProjectId: '${defaultProjectId}',
  apiBaseUrl: 'http://localhost:4007',
};

const configPath = path.join(__dirname, '..', 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...raw };
  } catch {}
}

const args = process.argv.slice(2);
let action = 'query_sql';
let sql = '';
let projectId = config.defaultProjectId;
let sheetName = '';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--projects') action = 'list_projects';
  else if (arg === '--sheets') action = 'list_sheets';
  else if (arg === '--project' && args[i + 1]) { projectId = args[++i]; }
  else if (arg === '--sheet' && args[i + 1]) { sheetName = args[++i]; action = 'get_sheet'; }
  else if (arg === '--sql' && args[i + 1]) { sql = args[++i]; action = 'query_sql'; }
}

async function run() {
  try {
    const url = \`\${config.apiBaseUrl}/api/antigravity/query\`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-phone': config.phoneNumber,
      },
      body: JSON.stringify({
        action,
        phoneNumber: config.phoneNumber,
        projectId,
        sql,
        sheetName,
      }),
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

run();
`;

const CONFIG_JSON_CONTENT = (userPhone: string, defaultProjectId: string) => JSON.stringify({
  phoneNumber: userPhone,
  defaultProjectId: defaultProjectId || 'latest',
  apiBaseUrl: 'http://localhost:4007',
  installedAt: new Date().toISOString(),
}, null, 2);

import { createZipBuffer } from '@/lib/simple-zip';

/**
 * GET /api/antigravity/skill
 * 스킬 파일 번들 내용 반환 또는 .zip 바이너리 다운로드
 */
export async function GET(request: NextRequest) {
  const cookiePhone = request.cookies.get('fts_user_phone')?.value;
  const userPhone = cookiePhone || '01000000000';
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') || '';
  const isZipDownload = url.searchParams.get('download') === 'zip';

  const skillMd = SKILL_MD_CONTENT(userPhone, projectId);
  const queryMjs = QUERY_MJS_CONTENT(userPhone, projectId);
  const configJson = CONFIG_JSON_CONTENT(userPhone, projectId);

  if (isZipDownload) {
    const zipBuffer = createZipBuffer([
      { path: 'filetosheet/SKILL.md', content: skillMd },
      { path: 'filetosheet/scripts/query.mjs', content: queryMjs },
      { path: 'filetosheet/config.json', content: configJson },
    ]);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="filetosheet-skill.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    skillName: 'filetosheet',
    files: {
      'SKILL.md': skillMd,
      'scripts/query.mjs': queryMjs,
      'config.json': configJson,
    },
  });
}

/**
 * POST /api/antigravity/skill
 * 원클릭 로컬 설치: 안티그라비티 글로벌 및 워크스페이스 스킬 디렉토리에 자동 설치
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const cookiePhone = request.cookies.get('fts_user_phone')?.value;
    const userPhone = body.phoneNumber || cookiePhone || '01000000000';
    const projectId = body.projectId || '';

    const homeDir = os.homedir();
    
    // 설치 대상 디렉토리 1: 글로벌 안티그라비티 스킬 (~/.gemini/antigravity/skills/filetosheet)
    const globalSkillDir = path.join(homeDir, '.gemini', 'antigravity', 'skills', 'filetosheet');
    // 설치 대상 디렉토리 2: 글로벌 제미나 스킬 (~/.gemini/skills/filetosheet)
    const geminiSkillDir = path.join(homeDir, '.gemini', 'skills', 'filetosheet');
    // 설치 대상 디렉토리 3: 현재 프로젝트 워크스페이스 (.agents/skills/filetosheet)
    const workspaceSkillDir = path.join(process.cwd(), '.agents', 'skills', 'filetosheet');

    const targetDirs = [globalSkillDir, geminiSkillDir, workspaceSkillDir];
    const installedPaths: string[] = [];

    const skillMd = SKILL_MD_CONTENT(userPhone, projectId);
    const queryMjs = QUERY_MJS_CONTENT(userPhone, projectId);
    const configJson = CONFIG_JSON_CONTENT(userPhone, projectId);

    for (const dir of targetDirs) {
      try {
        const scriptsDir = path.join(dir, 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });

        fs.writeFileSync(path.join(dir, 'SKILL.md'), skillMd, 'utf8');
        fs.writeFileSync(path.join(scriptsDir, 'query.mjs'), queryMjs, 'utf8');
        fs.writeFileSync(path.join(dir, 'config.json'), configJson, 'utf8');

        installedPaths.push(dir);
      } catch (err) {
        console.warn(`[Install Skill] 디렉토리 생성 실패: ${dir}`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: '안티그라비티 스킬이 성공적으로 설치되었습니다!',
      installedPaths,
      skillName: 'filetosheet',
    });
  } catch (error: any) {
    console.error('[API /api/antigravity/skill POST] 오류:', error);
    return NextResponse.json({ success: false, error: error.message || '스킬 설치 실패' }, { status: 500 });
  }
}
