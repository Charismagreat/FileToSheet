import { NextRequest, NextResponse } from 'next/server';

interface RemoteDbRequest {
  action: 'test-connection' | 'fetch-table' | 'list-tables' | 'fetch-multiple-tables';
  tunnelUrl: string;
  apiKey?: string;
  tableName?: string;
  tableNames?: string[];
  environment?: 'production' | 'development';
  limit?: number;
}

/**
 * 원격 이지데스크 터널링 서비스를 통해 운용서버 My DB(Product 등)에 안전하게 프록시 통신하는 백엔드 API
 */
export async function POST(req: NextRequest) {
  try {
    const body: RemoteDbRequest = await req.json();
    const { action, tunnelUrl, apiKey = '', tableName = 'Product', tableNames, environment = 'production', limit = 200 } = body;

    if (!tunnelUrl || typeof tunnelUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: '원격 이지데스크 터널링 URL을 입력해 주세요.' },
        { status: 400 }
      );
    }

    const cleanBaseUrl = tunnelUrl.trim().replace(/\/$/, '');
    const toolsCallUrl = cleanBaseUrl.endsWith('/user-data/tools/call')
      ? cleanBaseUrl
      : `${cleanBaseUrl}/user-data/tools/call`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-EGDesk-Env': environment, // 🚀 운용서버 (production) 우선 바인딩
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey.trim();
    }

    // 1. 연결 테스트 및 원격 테이블 목록 조회
    if (action === 'test-connection' || action === 'list-tables') {
      try {
        const remoteRes = await fetch(toolsCallUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tool: 'user_data_list_tables',
            arguments: {
              environment,
            },
          }),
          signal: AbortSignal.timeout(10000), // 10초 타임아웃
        });

        if (!remoteRes.ok) {
          const errText = await remoteRes.text();
          throw new Error(`원격 서버 응답 오류 (${remoteRes.status}): ${errText.slice(0, 150)}`);
        }

        const data = await remoteRes.json();
        const tablesResult = data.result || data;
        let tables: any[] = [];
        if (Array.isArray(tablesResult.tables)) {
          tables = tablesResult.tables;
        } else if (Array.isArray(tablesResult)) {
          tables = tablesResult;
        }

        const foundProductTable = tables.find(
          (t) => (t.tableName || t.name || '').toLowerCase() === tableName.toLowerCase()
        );

        return NextResponse.json({
          success: true,
          message: '원격 이지데스크 터널 연결 성공',
          totalTables: tables.length,
          tables: tables.map((t) => ({
            tableName: t.tableName || t.name,
            displayName: t.displayName || t.tableName || t.name,
            rowCount: t.rowCount || 0,
            columnCount: t.columnCount || 0,
          })),
          hasProductTable: Boolean(foundProductTable),
          productTableInfo: foundProductTable || null,
        });
      } catch (err: any) {
        console.warn('[Remote DB Test Failed]:', err?.message);
        // 원격 터널 오프라인 시 안내
        return NextResponse.json({
          success: false,
          error: `원격 이지데스크 터널 통신 실패: ${err?.message || '원격 서버에 접속할 수 없습니다.'}`,
          hint: '원격지 컴퓨터의 이지데스크 터널링 서비스 상태 및 X-Api-Key가 유효한지 확인해 주세요.',
        }, { status: 502 });
      }
    }

    // 2. 단일 원격 테이블 데이터 조회
    if (action === 'fetch-table') {
      try {
        const queryRes = await fetch(toolsCallUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tool: 'user_data_query',
            arguments: {
              tableName,
              limit,
              environment,
            },
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (!queryRes.ok) {
          const fallbackName = tableName.toLowerCase() === 'product' ? 'products' : 'Product';
          const retryRes = await fetch(toolsCallUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              tool: 'user_data_query',
              arguments: {
                tableName: fallbackName,
                limit,
                environment,
              },
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (!retryRes.ok) {
            const errText = await retryRes.text();
            throw new Error(`원격 테이블 조회 실패: ${errText.slice(0, 150)}`);
          }

          const retryData = await retryRes.json();
          const rows = retryData.result?.rows || retryData.rows || [];
          const columns = extractColumnsFromRows(rows);

          return NextResponse.json({
            success: true,
            tableName: fallbackName,
            columns,
            rows,
            totalRows: rows.length,
          });
        }

        const data = await queryRes.json();
        const rows = data.result?.rows || data.rows || [];
        const columns = extractColumnsFromRows(rows);

        return NextResponse.json({
          success: true,
          tableName,
          columns,
          rows,
          totalRows: rows.length,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `원격 데이터 읽기 실패: ${err?.message}`,
        }, { status: 500 });
      }
    }

    // 3. 복수 또는 전체 원격 테이블 데이터 일괄 조회 (방안 1: 모든 테이블 시트 매핑 지원)
    if (action === 'fetch-multiple-tables') {
      try {
        let targets = tableNames;
        // 대상 목록이 지정되지 않은 경우, 원격 테이블 목록을 먼저 조회
        if (!targets || targets.length === 0) {
          const listRes = await fetch(toolsCallUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              tool: 'user_data_list_tables',
              arguments: { environment },
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (!listRes.ok) {
            throw new Error('원격 테이블 목록을 가져오지 못했습니다.');
          }

          const listData = await listRes.json();
          const tablesResult = listData.result || listData;
          const rawTables: any[] = Array.isArray(tablesResult.tables)
            ? tablesResult.tables
            : Array.isArray(tablesResult)
            ? tablesResult
            : [];
          targets = rawTables.map((t) => t.tableName || t.name).filter(Boolean);
        }

        if (!targets || targets.length === 0) {
          return NextResponse.json({
            success: true,
            tables: [],
            message: '조회할 원격 테이블이 없습니다.',
          });
        }

        // 병렬로 각 테이블 데이터 조회
        const results = await Promise.allSettled(
          targets.map(async (tName) => {
            const res = await fetch(toolsCallUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                tool: 'user_data_query',
                arguments: {
                  tableName: tName,
                  limit,
                  environment,
                },
              }),
              signal: AbortSignal.timeout(15000),
            });

            if (!res.ok) {
              return {
                tableName: tName,
                columns: ['id', 'name'],
                rows: [],
                totalRows: 0,
                error: `HTTP ${res.status}`,
              };
            }

            const data = await res.json();
            const rows = data.result?.rows || data.rows || [];
            const columns = extractColumnsFromRows(rows);
            return {
              tableName: tName,
              columns,
              rows,
              totalRows: rows.length,
            };
          })
        );

        const fetchedTables = results.map((r, i) => {
          if (r.status === 'fulfilled') {
            return r.value;
          }
          return {
            tableName: targets![i],
            columns: ['id', 'name'],
            rows: [],
            totalRows: 0,
            error: r.reason?.message || '조회 실패',
          };
        });

        // 유효하게 성공한 테이블이 1개도 없고 에러만 발생한 경우
        const successfulTables = fetchedTables.filter((t) => !t.error);
        if (successfulTables.length === 0 && fetchedTables.length > 0) {
          const firstErr = fetchedTables[0].error || '원격 통신 에러';
          return NextResponse.json({
            success: false,
            error: `원격 서버에 접속할 수 없습니다 (${firstErr}). 원격지 터널링 서비스와 API Key를 확인해 주세요.`,
            tables: [],
          }, { status: 502 });
        }

        return NextResponse.json({
          success: true,
          environment,
          totalTables: successfulTables.length,
          tables: successfulTables,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `원격 복수 테이블 조회 실패: ${err?.message}`,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 요청 액션입니다.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || '서버 오류' }, { status: 500 });
  }
}

function extractColumnsFromRows(rows: any[]): string[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return ['id', 'name', 'category', 'price', 'stock', 'description'];
  }
  const keySet = new Set<string>();
  rows.forEach((r) => {
    if (r && typeof r === 'object') {
      Object.keys(r).forEach((k) => {
        if (!k.startsWith('_')) keySet.add(k); // _version 등 시스템 숨김
      });
    }
  });
  return Array.from(keySet);
}
