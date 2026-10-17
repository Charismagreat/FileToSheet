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
    const { filename, fileBase64, customPrompt } = await request.json();

    if (!fileBase64) {
      return NextResponse.json(
        { success: false, error: '파일 데이터(Base64)가 필요합니다.' },
        { status: 400 }
      );
    }

    const systemPrompt = `당신은 거래명세서, 세금계산서, 영수증, 카드전표, 견적서, 발주서, 통장내역, 급여명세서, 각종 계약서 및 비정형 서식/표 등 모든 종류의 문서를 정밀한 2차원 스프레드시트 표로 완벽하게 변환하는 범용(Universal) 문서 파서 AI입니다.

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
  "category": "거래명세서 / 세금계산서 / 영수증 / 견적서 / 통장내역 / 급여명세서 / 일반문서 중 하나",
  "sheetName": "시트명 (예: 문서명_추출)",
  "headers": ["열1", "열2", ..., "비고"],
  "rows": [
    {"열1": "값1", "열2": "값2", ..., "비고": "[부가정보1] ... | [부가정보2] ..."}
  ]
}
마크다운(\`\`\`json) 없이 순수 JSON만 반환하세요.`;

    const userPrompt = `파일명: ${filename}\n이 문서의 종류를 파악하여 본문 데이터를 최대한 상세한 독립 컬럼들로 분리해 추출하고, 독립 컬럼에 담기지 않는 상하단 거래처 상세, 주소, 대표자, 승인/문서번호, 계좌, 조건, 메모 등 모든 부가 정보는 누락 없이 반드시 '비고' 컬럼에 모아서 완벽히 적재해 주세요.` +
      (customPrompt?.trim()
        ? `\n\n[★ 사용자의 필수 최우선 지시사항]\n다음은 사용자가 특별히 요청한 규칙입니다. 기본 원칙보다 아래 규칙을 무조건 최우선으로 반영하여 headers와 rows를 설계하세요:\n${customPrompt.trim()}`
        : '');

    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

    let lastError: any = null;
    let successfulResult: any = null;
    let successfulModel = '';

    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`[Universal AI Parser] 표 추출 시도: 모델 = ${model}`);

        const response = await callAiCaller(userPrompt, {
          systemPrompt,
          images: [cleanBase64],
          model,
          temperature: 0.1,
        });

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

    return NextResponse.json({
      success: true,
      category: successfulResult.category || '비정형 문서 추출',
      sheetName: successfulResult.sheetName || '추출데이터',
      headers: successfulResult.headers || [],
      rows: successfulResult.rows || [],
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
