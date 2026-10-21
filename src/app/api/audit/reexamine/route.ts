// c:\dev\FileToSheet\src\app\api\audit\reexamine\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAiCaller, queryTable, insertRows, updateRows } from '@/egdesk-helpers';

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-pro',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      fileId,
      filename,
      fileBase64: rawFileBase64,
      currentRows = [],
      headers = [],
      sheetName = '시트',
      projectId,
    } = body;

    let fileBase64 = rawFileBase64;

    // 1. fileBase64가 없는 경우 DB(uploaded_files)에서 조회 시도
    if (!fileBase64 && fileId) {
      try {
        const fileRes = await queryTable('uploaded_files', {
          filters: { id: String(fileId) },
          limit: 1,
        });
        if (fileRes?.rows?.[0]?.file_data) {
          fileBase64 = fileRes.rows[0].file_data;
        }
      } catch (e) {
        console.warn('uploaded_files 조회 실패:', e);
      }
    }

    if (!fileBase64) {
      return NextResponse.json(
        { success: false, error: '대조 검증할 원본 파일 이미지(Base64)가 필요합니다.' },
        { status: 400 }
      );
    }

    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const isPdf = (filename || '').toLowerCase().endsWith('.pdf') || fileBase64.startsWith('data:application/pdf');

    // 2. AI 대조 진단 프롬프트 구성
    const systemPrompt = `당신은 거래명세서, 세금계산서, 영수증, 발주서 등 비정형 문서의 정밀 감사(Audit) 및 OCR 데이터 무결성 검증을 전담하는 수석 데이터 엔지니어 AI입니다.

[수행 임무]
제공된 원본 문서(이미지/PDF)와, 현재 시스템이 이 문서에서 추출하여 시트에 적재해 둔 데이터 행(currentRows JSON)을 항목별로 1:1 정밀 대조 검증하세요.

[핵심 점검 기준 - 5대 왜곡 원천 차단]
1. 공급자(매도자) vs 공급받는자(매수자) 뒤바뀜 점검:
   - 우측 상단 공급자 상자(등록번호, 대표자, 주소, 도장 날인)의 상호가 '공급자'에 정확히 들어갔는지 확인하세요.
   - 좌측 상단 '... 귀하'에 적힌 수신 상호가 '공급받는자'에 들어갔는지 확인하세요. 파일명에 의한 편향이나 뒤바뀜이 있다면 반드시 지적하세요.
2. 문서에 없는 유령 상호/단어 침범 점검:
   - 원본 문서 어디에도 없는 제3의 회사명이나 고유명사가 들어갔는지 철저히 확인하세요.
3. 복수 행 품목 정보의 임의 조작/환각 점검:
   - 1행과 2행에 동일 품목이 적혀 있는데 임의로 품번 끝자리를 올렸거나(+1), 없는 품명/규격을 지어내지 않았는지 확인하세요.
4. 발주번호/문서번호의 한글 및 기호 누락 점검:
   - 한글(예: '나주')이나 하이픈 등 식별자가 온전히 보존되었는지 확인하세요.
5. 비고란 공급자 메타데이터 일치 점검:
   - 실제 공급자의 대표자명, 주소, 구매담당자 성명이 정확히 매핑되었는지 확인하세요.

[응답 포맷 (마크다운 없이 순수 JSON만 반환)]:
{
  "hasIssues": true,
  "summary": "발견된 핵심 문제점을 1~2줄로 요약",
  "comparisonTable": [
    {
      "field": "점검 항목명 (예: 공급자, 공급받는자, 2행 품목명, 발주번호 등)",
      "current": "현재 적재된 잘못된 값",
      "correct": "원본 문서에 인쇄된 실제 올바른 값",
      "status": "오류 / 왜곡 / 환각 / 누락 / 일치 중 하나",
      "reason": "왜 문제가 되는지 간결한 사유 설명"
    }
  ],
  "detailedReport": "문서와 적재 데이터를 비교한 상세 분석 보고서 전문 (불렛포인트 형태로 명확히 작성)",
  "correctedRows": [
    {
      // currentRows와 100% 동일한 컬럼 키(Headers)를 유지하되, 모든 셀의 값을 원본 문서에 부합하도록 완벽하게 정정한 최종 데이터 행들
    }
  ],
  "suggestedRule": "향후 동일 서식 재발 방지를 위한 1줄 AI 학습 규칙 (예: 공급자는 우측 상자의 (주)원컨덕터로 매핑)"
}`;

    const userPrompt = `[파일명]: ${filename || '문서'}
[시트 컬럼 목록(Headers)]: ${JSON.stringify(headers)}

[현재 시스템에 적재되어 있는 데이터 행 (currentRows)]:
${JSON.stringify(currentRows, null, 2)}

위 현재 적재 데이터와 첨부된 원본 문서를 1:1로 철저히 대조하여,
무엇이 잘못되었는지 분석한 '항목별 1:1 대조표(comparisonTable)', '상세 보고서(detailedReport)', 그리고 원본에 100% 부합하는 '올바른 정정 데이터 행(correctedRows)'을 JSON으로 반환하세요.`;

    let lastError: any = null;
    let successfulResult: any = null;

    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`[Reexamine API] 진단 시도: 모델 = ${model}`);
        const aiOptions: any = {
          systemPrompt,
          model,
          temperature: 0.1,
        };

        if (isPdf) {
          aiOptions.files = [
            {
              name: filename || 'document.pdf',
              content: cleanBase64,
              encoding: 'base64',
              mimeType: 'application/pdf',
            },
          ];
        } else {
          aiOptions.images = [cleanBase64];
        }

        const aiRes = await callAiCaller(userPrompt, aiOptions);
        const textContent =
          typeof aiRes === 'string'
            ? aiRes
            : (aiRes as any)?.text ||
              (aiRes as any)?.content ||
              JSON.stringify(aiRes);

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('응답에서 JSON 구조를 찾을 수 없습니다.');

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed.comparisonTable) || !Array.isArray(parsed.correctedRows)) {
          throw new Error('comparisonTable 또는 correctedRows 배열이 누락되었습니다.');
        }

        successfulResult = parsed;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Reexamine API] ${model} 모델 실패, 다음 모델 폴백:`, err?.message || err);
      }
    }

    if (!successfulResult) {
      throw new Error(`AI 재검토 호출 실패: ${lastError?.message || lastError}`);
    }

    // 감사 로그 기록
    try {
      await insertRows('ai_call_logs', [
        {
          phone_number: null,
          call_type: 'reexamine_audit',
          model_name: 'gemini-multimodal',
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          latency_ms: `${Date.now() - startTime}ms`,
          status: 'SUCCESS',
          error_message: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn('ai_call_logs 기록 실패:', e);
    }

    return NextResponse.json({
      success: true,
      filename,
      sheetName,
      projectId,
      ...successfulResult,
    });
  } catch (error: any) {
    console.error('POST /api/audit/reexamine error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재검토 진단 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
