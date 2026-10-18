import { NextRequest, NextResponse } from 'next/server';
import { callAiCaller, insertRows } from '@/egdesk-helpers';

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { message, scope = 'current_sheet', contextData, chatHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: '질문 메시지를 입력해 주세요.' }, { status: 400 });
    }

    const isRemoteDb = scope === 'remote_db';

    // 시스템 프롬프트 구성
    const systemPrompt = `당신은 업무용 스프레드시트, 회계, 세무, 견적, 명단 및 비즈니스 데이터 분석 전문 "FileToSheet AI 수석 데이터 비서"입니다.
${isRemoteDb ? '현재 원격지 컴퓨터의 이지데스크 터널링 서버 및 My DB(Product 데이터베이스)에 직접 연결되어 실시간 원격 데이터베이스 컨텍스트가 제공되고 있습니다. 상품 정보, 카테고리, 단가, 재고 현황을 정밀하게 분석하고 가공하세요.' : '사용자가 업로드하여 관리 중인 시트 데이터를 자연어로 묻고 답할 수 있도록 정밀하게 분석하고 집계하여 응답하세요.'}

[행동 지침]
1. 정확한 사실 기반 응답: 제공된 ${isRemoteDb ? '원격 Product 데이터베이스' : '시트 데이터'}의 실제 컬럼명과 값을 바탕으로만 대답하며, 존재하지 않는 데이터는 임의로 지어내지 마세요.
2. 수치 집계 및 연산:
   - 합계, 평균, 건수, 최대/최소값 질문 시 정확한 계산 결과를 제시하세요.
   - 금액/수량 숫자는 천 단위 콤마(예: 1,500,000원)를 붙여 읽기 쉽게 포맷팅하세요.
3. 가독성 높은 서식:
   - 핵심 요약은 글머리 기호(•)와 굵은 글씨(**강조**)를 사용하세요.
   - 목록이나 3건 이상의 데이터는 깔끔한 마크다운 표(| 열1 | 열2 | ...)로 일목요연하게 표현해 주세요.
4. 친절하고 전문적인 비즈니스 톤앤매너 유지.
5. 답변은 반드시 한국어로 작성하세요.`;

    // 사용자 프롬프트와 컨텍스트 결합
    let contextDescription = '';
    if (contextData) {
      contextDescription = `\n\n[현재 제공된 ${isRemoteDb ? '원격 My DB (Product) 데이터베이스' : '시트'} 컨텍스트 데이터]\n${JSON.stringify(contextData, null, 2)}`;
    }

    // 이전 대화 내역 포맷팅
    let historyText = '';
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      historyText = '\n\n[이전 대화 이력]\n' + chatHistory.slice(-6).map((m: any) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
    }

    const fullUserPrompt = `${historyText}${contextDescription}\n\n[사용자 질문]\n질문 범위: ${scope}\n질문: ${message}`;

    let lastError: any = null;
    let answerText = '';
    let lastResponse: any = null;

    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`[AI Chat API] 시도: 모델 = ${model}`);
        const response = await callAiCaller(fullUserPrompt, {
          systemPrompt,
          model,
          temperature: 0.2,
        });

        lastResponse = response;
        answerText =
          typeof response === 'string'
            ? response
            : (response as any)?.text ||
              (response as any)?.content ||
              JSON.stringify(response);

        if (answerText && answerText.trim()) {
          console.log(`[AI Chat API] 성공: 모델 = ${model}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Chat API] ${model} 실패, 다음 모델 폴백:`, err?.message || err);
      }
    }

    if (!answerText) {
      throw new Error(`AI 응답 생성 실패: ${lastError?.message || lastError}`);
    }

    // 토큰 사용량 및 Gemini 3.8 Flash 기준 원가(KRW) 계산
    const promptFull = (systemPrompt || '') + fullUserPrompt;
    const promptTokens =
      (lastResponse as any)?.usageMetadata?.promptTokenCount ||
      (lastResponse as any)?.usage?.prompt_tokens ||
      Math.max(20, Math.ceil(promptFull.length * 0.75));

    const completionTokens =
      (lastResponse as any)?.usageMetadata?.candidatesTokenCount ||
      (lastResponse as any)?.usage?.completion_tokens ||
      Math.max(10, Math.ceil(answerText.length * 0.8));

    const totalTokens = promptTokens + completionTokens;
    // Gemini 3.8 Flash: 입력 1,000토큰당 1원, 출력 1,000토큰당 5원
    const estimatedCostKrw = Number(((promptTokens * 0.001) + (completionTokens * 0.005)).toFixed(2));
    const nowIso = new Date().toISOString();
    const latencyMs = Date.now() - startTime;

    // 1. AI 호출 감사 로그 (ai_call_logs) 비동기 기록
    insertRows('ai_call_logs', [
      {
        phone_number: body.phoneNumber || null,
        call_type: 'ai_chat',
        model_name: successfulModel || 'gemini-3.8-flash',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
        status: 'success',
        error_message: null,
        created_at: nowIso,
      },
    ]).catch((e) => console.warn('ai_call_logs 로깅 실패:', e));

    // 2. AI 비서 대화 이력 (ai_chat_messages) 사용자 질문 + AI 답변 비동기 기록
    const currentSheetName = contextData?.sheetName || null;
    const currentProjId = body.projectId ? Number(body.projectId) : null;

    insertRows('ai_chat_messages', [
      {
        project_id: currentProjId,
        phone_number: body.phoneNumber || null,
        sheet_name: currentSheetName,
        scope,
        role: 'user',
        message,
        meta_info: null,
        created_at: nowIso,
      },
      {
        project_id: currentProjId,
        phone_number: body.phoneNumber || null,
        sheet_name: currentSheetName,
        scope,
        role: 'assistant',
        message: answerText,
        meta_info: JSON.stringify({ promptTokens, completionTokens, totalTokens, estimatedCostKrw }),
        created_at: new Date().toISOString(),
      },
    ]).catch((e) => console.warn('ai_chat_messages 대화 이력 저장 실패:', e));

    return NextResponse.json({
      success: true,
      answer: answerText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostKrw,
      },
    });
  } catch (error: any) {
    console.error('[AI Chat API 오류]:', error);

    insertRows('ai_call_logs', [
      {
        phone_number: null,
        call_type: 'ai_chat',
        model_name: 'unknown',
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: Date.now() - startTime,
        status: 'failed',
        error_message: error.message || 'AI 대화 실패',
        created_at: new Date().toISOString(),
      },
    ]).catch(() => {});

    return NextResponse.json(
      { error: error?.message || 'AI 대화 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-chat: 과거 대화 이력 조회 (프로젝트별 또는 시트별)
 */
export async function GET(req: NextRequest) {
  try {
    const { queryTable } = await import('@/egdesk-helpers');
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const phoneNumber = searchParams.get('phoneNumber');

    const filters: Record<string, any> = {};
    if (projectId) filters.project_id = Number(projectId);
    if (phoneNumber) filters.phone_number = phoneNumber;

    const res = await queryTable('ai_chat_messages', {
      filters,
      orderBy: 'id',
      orderDirection: 'ASC',
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      messages: res?.rows || [],
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '대화 이력 조회 실패' }, { status: 500 });
  }
}
