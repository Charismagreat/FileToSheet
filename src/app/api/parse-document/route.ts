import { NextRequest, NextResponse } from 'next/server';
import { callAiCaller } from '@/egdesk-helpers';

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

export async function POST(request: NextRequest) {
  try {
    const { filename, fileBase64, customPrompt, targetHeaders, existingSheets } = await request.json();

    if (!fileBase64) {
      return NextResponse.json(
        { success: false, error: '파일 데이터(Base64)가 필요합니다.' },
        { status: 400 }
      );
    }

    const hasTargetHeaders = Array.isArray(targetHeaders) && targetHeaders.length > 0;
    const targetHeadersList = hasTargetHeaders ? targetHeaders.filter((h: any) => typeof h === 'string' && h.trim()) : [];
    const hasExistingSheets = Array.isArray(existingSheets) && existingSheets.length > 0;

    const systemPrompt = `당신은 거래명세서, 세금계산서, 영수증, 카드전표, 견적서, 발주서, 통장내역, 급여명세서, 각종 계약서 및 비정형 서식/표 등 모든 종류의 문서를 정밀한 2차원 스프레드시트 표로 완벽하게 변환하고, 필요 시 복수의 기존 시트 중 가장 적합한 시트로 지능적으로 자동 라우팅(분류)하는 범용(Universal) 문서 파서 AI입니다.

[범용 추출 및 컬럼 설계 핵심 원칙 - 모든 문서 기본 적용]
1. 세분화된 독립 컬럼(Headers) 설계:
   - 문서 유형에 관계없이, 문서에 존재하는 주요 사실/수치/내역 데이터를 가능한 한 상세한 독립 컬럼으로 쪼개어 적재하세요.
   - 거래명세서/계산서: 거래일자, 공급자, 공급자등록번호, 공급받는자, 공급받는자등록번호, 품목명, 규격, 수량, 단가, 공급가액, 세액, 합계금액, 비고
   - 영수증/카드전표: 결제일시, 가맹점명, 사업자번호, 품목명, 수량, 단가, 공급가액, 부가세, 결제금액, 비고
   - 견적서/발주서: 일자, 발신자, 수신자, 품목명, 규격, 수량, 단가, 공급가액, 세액, 합계금액, 비고
   - 통장/금융내역: 거래일시, 구분(입금/출금), 거래내용/적요, 입금액, 출금액, 잔액, 거래점, 비고
   - 급여/인사: 지급연월, 성명, 부서/직급, 기본급, 각종수당, 지급총액, 공제총액, 실지급액, 비고
   - 기타 일반 표/서식: 식별 가능한 모든 항목 열 + 비고
2. 비고란 총집결 원칙 (데이터 유실 방지 필수):
   - 독립 컬럼으로 배정하기 애매한 문서 상단/하단의 모든 보조 정보, 메타데이터, 메모는 하나도 누락하지 말고 반드시 '비고' 컬럼에 모아서 적재하세요.
   - 수집 대상: 발행처/거래처 상세(대표자명, 사업장주소, 업태/종목, 전화, 팩스, 이메일), 문서번호, 승인/인가번호, 결제방식/카드번호, 입금계좌정보, 청구/영수 구분, 특약/납기조건, 담당자 메모 및 서명 등
   - 비고 포맷: "[대표] 홍길동 | [주소] 서울시... | [계좌] 국민 123-456... | [승인번호] 98765432"
3. 복수 행 구성: 여러 품목이나 거래건이 있으면 각 항목별 1행씩 분리하고, 공통 메타데이터는 각 행에 누락 없이 함께 채우세요.

[응답 포맷 (순수 JSON만 반환)]:
{
  "matched": true,
  "matchedSheetIndex": 0,
  "matchedSheetName": "매칭된 시트명",
  "mismatchReason": "부적합 시 명확한 사유",
  "category": "거래명세서 / 세금계산서 / 영수증 / 견적서 / 통장내역 / 급여명세서 / 일반문서 중 하나",
  "sheetName": "시트명 (예: 문서명_추출)",
  "headers": ["열1", "열2", ..., "비고"],
  "rows": [
    {"열1": "값1", "열2": "값2", ..., "비고": "[부가정보1] ... | [부가정보2] ..."}
  ]
}
마크다운(\`\`\`json) 없이 순수 JSON만 반환하세요.`;

    let routingConstraint = '';
    if (hasExistingSheets) {
      const sheetsDesc = existingSheets.map((s: any, idx: number) => {
        let desc = `[시트 #${idx}] 이름: "${s.name}", 컬럼 목록: [ ${s.headers.join(', ')} ]`;
        if (s.customPrompt?.trim()) {
          desc += `\n   └ ⚙️ [시트 전용 AI 분석/적재 규칙]: "${s.customPrompt.trim()}"`;
        }
        return desc;
      }).join('\n');

      routingConstraint = `\n\n[★ 지능형 기존 시트 자동 분류(라우팅) 및 맞춤형 적재 규칙 준수 지침 - 최우선 필수]
현재 통합 문서에는 다음과 같은 기존 시트들이 존재합니다:
${sheetsDesc}

★ 분류, 스키마 검증 및 시트별 규칙 적용 지침:
1. 업로드된 문서의 성격과 데이터가 위 기존 시트들 중 어느 시트의 비즈니스 목적 및 컬럼 구조와 70% 이상 부합하는지 철저히 대조 판정하세요.
2. 부합하는 시트가 있다면:
   - "matched": true
   - "matchedSheetIndex": 해당 시트의 인덱스 번호 (0, 1, ...)
   - "matchedSheetName": 해당 시트의 이름
   - "headers": 해당 시트의 컬럼 목록을 100% 동일하게 유지
   - "rows": 해당 시트의 컬럼 규격에 맞추어 매핑한 데이터 행.
   ★ [핵심] 매칭된 해당 시트에 "⚙️ [시트 전용 AI 분석/적재 규칙]"이 정의되어 있다면, 그 규칙(가맹점별 비고 태깅, 부가세 자동 분리 계산, 날짜/사업자번호 포맷 통일, 검산 주의 표시 등)을 100% 최우선으로 반드시 준수하여 데이터를 가공/추출하세요!
3. 만약 위 기존 시트 어디에도 성격이나 양식이 부합하지 않는 이질적 문서(예: 영수증/계산서 시트만 있는데 계약서, 이력서, 정관 등이 업로드된 경우)라면:
   - 억지로 기존 시트에 끼워맞추지 말고 반드시 "matched": false 로 설정하세요!
   - "mismatchReason": 기존 시트들의 양식과 왜 일치하지 않는지 친절한 설명 (예: "기존 시트(카드영수증, 세금계산서)와 서식이 다른 부동산 계약서 문서입니다.")
   - "headers" 및 "rows": 이 문서 자체의 성격에 맞는 독립적인 최적의 표 형태로 추출하세요 (사용자가 '새 시트로 생성'할 때 사용됩니다).`;
    }

    const targetHeaderConstraint = targetHeadersList.length > 0 && !hasExistingSheets
      ? `\n\n[★ 기존 시트 컬럼 100% 유지 지침 - 최우선 필수]\n현재 시트의 컬럼 목록: [ ${targetHeadersList.join(', ')} ]\n- 새 컬럼을 추가하지 마시고, headers는 위 컬럼 목록을 정확히 유지하세요.\n- 추출하는 데이터의 모든 필드는 위 컬럼 중 가장 부합하는 컬럼에 매핑하세요.\n- 컬럼에 없는 기타 정보는 '비고' 컬럼에 모아서 적재하세요.`
      : '';

    const userPrompt = `파일명: ${filename}\n이 문서의 종류를 파악하여 본문 데이터를 상세한 독립 컬럼들로 분리해 추출하고, 독립 컬럼에 담기지 않는 상하단 거래처 상세, 주소, 대표자, 승인/문서번호, 계좌, 메모 등 부가 정보는 반드시 '비고' 컬럼에 모아서 적재해 주세요.` +
      routingConstraint +
      targetHeaderConstraint +
      (customPrompt?.trim()
        ? `\n\n[★ 사용자의 필수 최우선 지시사항]\n다음은 사용자가 특별히 요청한 규칙입니다:\n${customPrompt.trim()}`
        : '');


    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const isPdf = filename.toLowerCase().endsWith('.pdf') || fileBase64.startsWith('data:application/pdf');

    let lastError: any = null;
    let successfulResult: any = null;
    let successfulModel = '';

    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`[Universal AI Parser] 표 추출 시도: 모델 = ${model}`);

        const aiCallerOptions: any = {
          systemPrompt,
          model,
          temperature: 0.1,
        };

        if (isPdf) {
          aiCallerOptions.files = [
            {
              name: filename,
              content: cleanBase64,
              encoding: 'base64',
              mimeType: 'application/pdf',
            },
          ];
        } else {
          aiCallerOptions.images = [cleanBase64];
        }

        const response = await callAiCaller(userPrompt, aiCallerOptions);

        const textContent =
          typeof response === 'string'
            ? response
            : (response as any)?.text ||
              (response as any)?.content ||
              JSON.stringify(response);

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('응답에서 JSON 구조를 찾을 수 없습니다.');

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed.headers) || !Array.isArray(parsed.rows)) {
          throw new Error('표 형식(headers, rows)의 유효한 JSON이 아닙니다.');
        }

        successfulResult = parsed;
        successfulModel = model;
        console.log(`[Universal AI Parser] 성공: 모델 = ${model}, 행 수 = ${parsed.rows.length}`);
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Universal AI Parser] ${model} 모델 호출 실패, 다음 모델 폴백:`, err?.message || err);
      }
    }

    if (!successfulResult) {
      throw new Error(`모든 AI 모델 호출 실패. 마지막 오류: ${lastError?.message || lastError}`);
    }

    let finalHeaders = successfulResult.headers || [];
    let finalRows = successfulResult.rows || [];
    let isMatched = true;
    let matchedIndex: number | undefined = undefined;
    let matchedName: string | undefined = undefined;
    let mismatchReason = '';

    if (hasExistingSheets) {
      isMatched = successfulResult.matched !== false;
      if (isMatched) {
        matchedIndex = typeof successfulResult.matchedSheetIndex === 'number' && successfulResult.matchedSheetIndex >= 0 && successfulResult.matchedSheetIndex < existingSheets.length
          ? successfulResult.matchedSheetIndex
          : 0;
        const targetSheet = existingSheets[matchedIndex];
        matchedName = successfulResult.matchedSheetName || targetSheet?.name || `Sheet${matchedIndex + 1}`;

        if (targetSheet?.headers && targetSheet.headers.length > 0) {
          finalHeaders = targetSheet.headers;
          finalRows = finalRows.map((r: any) => {
            const rowObj: Record<string, any> = {};
            for (const h of targetSheet.headers) {
              rowObj[h] = r[h] !== undefined && r[h] !== null ? r[h] : '';
            }
            return rowObj;
          });
        }
      } else {
        mismatchReason = successfulResult.mismatchReason || '기존 시트들과 서식 및 데이터 양식이 일치하지 않습니다.';
      }
    } else if (targetHeadersList.length > 0) {
      finalHeaders = targetHeadersList;
      finalRows = finalRows.map((r: any) => {
        const rowObj: Record<string, any> = {};
        for (const h of targetHeadersList) {
          rowObj[h] = r[h] !== undefined && r[h] !== null ? r[h] : '';
        }
        return rowObj;
      });
    }

    return NextResponse.json({
      success: true,
      matched: isMatched,
      matchedSheetIndex: matchedIndex,
      matchedSheetName: matchedName,
      mismatchReason: mismatchReason,
      category: successfulResult.category || '비정형 문서 추출',
      sheetName: successfulResult.sheetName || '추출데이터',
      headers: finalHeaders,
      rows: finalRows,
      usedModel: successfulModel,
    });

  } catch (error: any) {
    console.error('범용 문서 AI 파싱 최종 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '문서 분석에 실패했습니다.' },
      { status: 500 }
    );
  }
}
