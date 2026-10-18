import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sms/compile
 * 사용자가 일상 한국어로 작성한 알림 규칙을 정형화된 JSON 실행 트리거로 변환
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, headers = [], sheetName = '시트1' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, error: '규칙 프롬프트가 필요합니다.' }, { status: 400 });
    }

    const trimmed = prompt.trim();

    // 1. 전화번호 추출 (010-XXXX-XXXX 또는 010XXXXXXXX)
    const phoneMatch = trimmed.match(/01[0-9]-?[0-9]{3,4}-?[0-9]{4}/);
    const recipientPhone = phoneMatch ? phoneMatch[0].replace(/[^0-9]/g, '') : '010-7216-5884';

    // 2. 금액 조건 추출 (예: 50만원, 100,000원, 30만 원)
    let conditionValue: any = null;
    let operator = '>=';
    let targetField = headers.find((h: string) => /금액|합계|결제|지출|단가/i.test(h)) || '결제금액';

    const manWonMatch = trimmed.match(/([0-9,]+)\s*만\s*원?/);
    if (manWonMatch) {
      conditionValue = parseInt(manWonMatch[1].replace(/,/g, ''), 10) * 10000;
    } else {
      const wonMatch = trimmed.match(/([0-9,]+)\s*원/);
      if (wonMatch) {
        conditionValue = parseInt(wonMatch[1].replace(/,/g, ''), 10);
      }
    }

    // 3. 수량 조건 추출 (예: 10개 미만, 5개 이하)
    const qtyMatch = trimmed.match(/([0-9]+)\s*개\s*(미만|이하)/);
    if (qtyMatch) {
      conditionValue = parseInt(qtyMatch[1], 10);
      operator = qtyMatch[2] === '미만' ? '<' : '<=';
      targetField = headers.find((h: string) => /수량|재고|입고/i.test(h)) || '재고수량';
    }

    // 4. 시간대 조건 (심야, 야간)
    const isNight = /밤|심야|새벽|야간|23시|04시/.test(trimmed);

    // 5. 규칙명 생성
    let ruleName = `${sheetName} 실시간 알림`;
    if (isNight && conditionValue) {
      ruleName = `심야 고액 결제 이상 감지 (${conditionValue.toLocaleString()}원 이상)`;
    } else if (qtyMatch) {
      ruleName = `물류/재고 부족 알림 (${conditionValue}개 ${operator})`;
    } else if (conditionValue) {
      ruleName = `${targetField} 기준치 알림 (${conditionValue.toLocaleString()}원 이상)`;
    }

    // 6. 메시지 템플릿 생성
    let messageTemplate = `[FileToSheet 알림] '${sheetName}' 시트에 새로운 데이터가 등록되었습니다.`;
    if (isNight && conditionValue) {
      messageTemplate = `[심야 이상지출 경보] '${sheetName}'에서 {가맹점명} {결제금액}원 결제가 감지되었습니다. (확인 요망)`;
    } else if (qtyMatch) {
      messageTemplate = `[긴급 재고부족 알림] {품목명} 현재고 {재고수량}개 (안전재고 미달 - 발주 필요)`;
    } else if (conditionValue) {
      messageTemplate = `[FileToSheet 알림] {${targetField}} {항목명} 기준치 초과 발생: {값}`;
    }

    const compiledConfig = {
      ruleName,
      rawPrompt: trimmed,
      sheetName,
      recipientPhone,
      messageTemplate,
      recommendedChannel: 'SMS',
      triggerConfig: {
        conditionType: isNight ? 'COMPLEX' : 'SIMPLE',
        fields: [
          {
            field: targetField,
            operator,
            value: conditionValue ?? 0,
          },
          ...(isNight
            ? [
                {
                  field: '결제시간',
                  operator: 'BETWEEN',
                  value: ['23:00', '04:00'],
                },
              ]
            : []),
        ],
        dispatchChannel: 'SMS',
      },
    };

    return NextResponse.json({
      success: true,
      compiled: compiledConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
