// query.mjs - FileToSheet Antigravity Query Runner
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// config.json 로드
let config = {
  phoneNumber: '01072165884',
  defaultProjectId: '22',
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
    const url = `${config.apiBaseUrl}/api/antigravity/query`;
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
