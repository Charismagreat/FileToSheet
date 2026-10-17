import { NextRequest, NextResponse } from 'next/server';

interface RemoteDbRequest {
  action: 'test-connection' | 'fetch-table' | 'list-tables';
  tunnelUrl: string;
  apiKey?: string;
  tableName?: string;
  environment?: 'production' | 'development';
  limit?: number;
}

/**
 * 원격 이지데스크 터널링 서비스를 통해 운용서버 My DB(Product 등)에 안전하게 프록시 통신하는 백엔드 API
 */
export async function POST(req: NextRequest) {
  try {
    const body: RemoteDbRequest = await req.json();
    const { action, tunnelUrl, apiKey = '', tableName = 'Product', environment = 'production', limit = 200 } = body;

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

    // 2. 원격 테이블 데이터 조회 (Product 등)
    if (action === 'fetch-table') {
      try {
        // 우선 user_data_query 호출
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
          // 대소문자 fallback (Product vs products)
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
