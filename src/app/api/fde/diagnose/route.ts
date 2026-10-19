import { NextRequest, NextResponse } from 'next/server';
import { insertRows, queryTable } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';

interface SheetContextSummary {
  name: string;
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, any>[];
}

interface DiagnoseRequestBody {
  issueDescription: string;
  category?: 'formula' | 'integration' | 'join' | 'performance' | 'other';
  sheets: SheetContextSummary[];
  supportType?: 'async_patch' | 'live_pairing';
  userPhone?: string;
}

/**
 * GET /api/fde/diagnose
 * 최근 FDE 지원 티켓 및 패치 이력 조회
 */
export async function GET(req: NextRequest) {
  try {
    const res = await queryTable('fde_support_tickets', { limit: 20 });
    return NextResponse.json({
      success: true,
      tickets: res.rows || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: DiagnoseRequestBody = await req.json();
    const { issueDescription, category = 'other', sheets = [], supportType = 'async_patch' } = body;

    if (!issueDescription || issueDescription.trim().length === 0) {
      return NextResponse.json(
        { error: '문제 또는 요청 사항을 입력해 주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const ticketId = `FDE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const sheetContextText = sheets.map(s => 
      `- 시트명 [${s.name}] (총 ${s.rowCount}행): 헤더 [${s.headers.join(', ')}]\n  샘플(마스킹): ${JSON.stringify(s.sampleRows.slice(0, 2))}`
    ).join('\n\n');

    // 프롬프트 구성: FDE(전문 엔지니어)용 기술 명세서 및 즉시 적용 가능한 솔루션 패치 생성
    const prompt = `
당신은 Google Antigravity & FileToSheet 시스템의 수석 FDE (Forward Deployed Engineer, 전사 기술 지원 엔지니어)입니다.
비전문가 사용자가 스프레드시트 또는 CRUD 웹앱을 구성하다가 기술적 어려움에 봉착하여 SOS를 요청했습니다.
사용자의 설명과 마스킹된 시트 상태를 분석하여, 
1) FDE용 표준 기술 명세서(Tech Spec)와
2) 사용자의 프로젝트에 원클릭으로 병합(Merge)할 수 있는 구체적인 솔루션 패치(Solution Patch)
를 JSON 포맷으로 생성해 주세요.

[사용자 요청 / 막힌 부분]
${issueDescription}

[선택 카테고리]
${category}

[현재 사용자의 프로젝트 시트 구조]
${sheetContextText}

[응답 요구사항]
오직 순수한 JSON 형식만 출력하세요. 마크다운(\`\`\`json ...) 없이 순수 JSON만 반환해야 합니다:
{
  "techSpec": {
    "title": "한 줄 기술 이슈 제목 (예: 거래처별 가변 할인율 수식 오류 및 N:M 매핑 결함)",
    "summary": "FDE 관점의 핵심 문제 요약 (2-3문장)",
    "rootCause": "발생 원인 분석 (예: 시트 간 외래키 불일치 또는 엑셀 단수 절사 수식 미비)",
    "difficulty": "Easy" | "Medium" | "Complex",
    "estimatedTime": "15분 이내" | "30분 이내" | "1시간 이내",
    "actionPlan": [
      "1단계 조치 내용",
      "2단계 조치 내용",
      "3단계 조치 내용"
    ]
  },
  "proposedPatch": {
    "type": "add_sheet" | "formula_fix" | "custom_script" | "portal_module",
    "title": "솔루션 패치 명칭 (예: 거래처별 할인율 자동 계산 및 마스터 시트 패치)",
    "description": "이 패치가 프로젝트에 적용되면 어떻게 해결되는지 친절한 설명",
    "targetSheetName": "신규 또는 수정 대상 시트명",
    "newColumns": ["추가/수정될 컬럼명1", "컬럼명2", "..."],
    "sampleRows": [
      {"컬럼명1": "현실적 값1", "컬럼명2": "값2"},
      {"컬럼명1": "현실적 값3", "컬럼명2": "값4"},
      {"컬럼명1": "현실적 값5", "컬럼명2": "값6"}
    ],
    "appsScriptSnippet": "// 필요 시 제공할 Google Apps Script 또는 JavaScript 보조 함수 (문자열 또는 null)"
  },
  "fdeComment": "FDE 엔지니어가 사용자에게 전하는 격려 및 가이드 메시지 (친절하고 든든한 어조)"
}
`;

    if (!apiKey) {
      // API Key가 없을 때의 스마트 폴백 FDE 명세 생성
      const mockResult = generateFallbackDiagnosis(ticketId, issueDescription, category, sheets);
      return NextResponse.json(mockResult);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        console.warn('Gemini API call failed, falling back to rule-based diagnosis');
        return NextResponse.json(generateFallbackDiagnosis(ticketId, issueDescription, category, sheets));
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return NextResponse.json(generateFallbackDiagnosis(ticketId, issueDescription, category, sheets));
      }

      const parsed = JSON.parse(text);
      const finalResult = {
        success: true,
        ticketId,
        supportType,
        ...parsed,
      };

      // 🌟 fde_support_tickets 물리 테이블 영구 저장
      await saveTicketToDb({
        ticket_no: ticketId,
        user_phone: body.userPhone || '',
        category,
        support_type: supportType,
        user_description: issueDescription,
        tech_spec_json: JSON.stringify(finalResult.techSpec || {}),
        proposed_patch_json: JSON.stringify(finalResult.proposedPatch || {}),
        fde_comment: finalResult.fdeComment || '',
        status: 'PATCH_READY',
      });

      return NextResponse.json(finalResult);
    } catch (apiErr) {
      console.error('Gemini diagnose error:', apiErr);
      const fallbackResult = generateFallbackDiagnosis(ticketId, issueDescription, category, sheets);
      await saveTicketToDb({
        ticket_no: ticketId,
        user_phone: body.userPhone || '',
        category,
        support_type: supportType,
        user_description: issueDescription,
        tech_spec_json: JSON.stringify(fallbackResult.techSpec || {}),
        proposed_patch_json: JSON.stringify(fallbackResult.proposedPatch || {}),
        fde_comment: fallbackResult.fdeComment || '',
        status: 'PATCH_READY',
      });
      return NextResponse.json(fallbackResult);
    }
  } catch (err: any) {
    console.error('FDE diagnose route error:', err);
    return NextResponse.json({ error: err.message || 'FDE 진단 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function saveTicketToDb(ticketData: any) {
  try {
    const nowIso = new Date().toISOString();
    await insertRows('fde_support_tickets', [
      {
        ...ticketData,
        created_at: nowIso,
        resolved_at: null,
      },
    ]);
    realtimeHub.notifyTableChange('fde_support_tickets', 'insert');
  } catch (e) {
    console.warn('fde_support_tickets 물리 테이블 저장 예외 (진단은 정상 응답됨):', e);
  }
}

function generateFallbackDiagnosis(
  ticketId: string,
  issueDescription: string,
  category: string,
  sheets: SheetContextSummary[]
) {
  const firstSheetName = sheets[0]?.name || '주요데이터';
  
  return {
    success: true,
    ticketId,
    techSpec: {
      title: `${firstSheetName} 관련 ${category === 'formula' ? '수식 및 계산 정산' : '데이터 연계 및 스키마'} 최적화`,
      summary: `사용자께서 요청하신 "${issueDescription.slice(0, 45)}..." 이슈를 해결하기 위해 데이터 구조 정규화 및 자동 계산 보조 시트를 설계했습니다.`,
      rootCause: '기존 시트의 단일 플랫 구조로 인해 다차원 집계 및 조건부 비즈니스 로직(할인/세율/외래키) 처리에 한계가 있었습니다.',
      difficulty: 'Medium',
      estimatedTime: '15분 이내',
      actionPlan: [
        '기존 시트와 1:N 관계로 결합되는 전용 계산/정산 보조 마스터 생성',
        '원클릭 수식 바인딩 및 샘플 데이터 정합성 검증',
        '포털 대시보드 KPI 및 인라인 수정 폼 자동 연계'
      ]
    },
    proposedPatch: {
      type: 'add_sheet',
      title: `${firstSheetName}_스마트정산마스터`,
      description: '복잡한 수식을 직접 작성하지 않아도 자동으로 마진율, 부가세, 거래처별 정산금을 산출해 주는 FDE 전용 계산 시트 패치입니다.',
      targetSheetName: `${firstSheetName}_정산마스터`,
      newColumns: ['정산ID', '참조키', '정산일자', '공급가액', '할인율', '세액', '최종정산액', '상태'],
      sampleRows: [
        { '정산ID': 'CALC-001', '참조키': 'REF-101', '정산일자': '2026-10-19', '공급가액': 1500000, '할인율': '5%', '세액': 150000, '최종정산액': 1575000, '상태': '정산완료' },
        { '정산ID': 'CALC-002', '참조키': 'REF-102', '정산일자': '2026-10-19', '공급가액': 820000, '할인율': '3%', '세액': 82000, '최종정산액': 877400, '상태': '승인대기' },
        { '정산ID': 'CALC-003', '참조키': 'REF-103', '정산일자': '2026-10-18', '공급가액': 2300000, '할인율': '10%', '세액': 230000, '최종정산액': 2300000, '상태': '정산완료' }
      ],
      appsScriptSnippet: `/**
 * FDE 커스텀 자동 계산 함수
 */
function calculateSettlement(amount, rate) {
  var discount = amount * (parseFloat(rate) / 100);
  var tax = (amount - discount) * 0.1;
  return Math.round((amount - discount) + tax);
}`
    },
    fdeComment: '안녕하세요! FDE 전담 엔지니어입니다. 요청하신 이슈를 분석하여 번거로운 계산 수식을 자동으로 처리하는 전용 마스터 시트와 Apps Script 로직을 준비했습니다. 아래 [내 프로젝트에 패치 적용]을 누르시면 즉시 워크스페이스에 병합됩니다!'
  };
}
