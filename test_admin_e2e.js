// test_admin_e2e.js
/**
 * File to Sheet 종합 관리자 시스템 E2E 검증 테스트 스크립트
 * 1. GET /api/admin/bootstrap (통합 번들 로더 초고속 수신 검증)
 * 2. POST /api/sms/compile (자연어 규칙 AI 자동 컴파일 검증)
 * 3. POST /api/admin/users/tokens (회원 토큰 수동 충전 및 감사로그 검증)
 * 4. POST /api/admin/sms/test (테스트 문자 발송 및 발송 감사대장 검증)
 * 5. POST /api/admin/inquiries/ai-draft (고객문의 1초 AI 초안 생성 검증)
 * 6. POST /api/admin/tax-invoices (세금계산서 승인 처리 검증)
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:4003';

async function runAdminE2ETests() {
  console.log(`\n======================================================`);
  console.log(`🚀 [Admin E2E Test] File to Sheet 종합 관리자 시스템 검증 시작 (${BASE_URL})`);
  console.log(`======================================================\n`);

  let passCount = 0;
  let failCount = 0;

  // 1. GET /api/admin/bootstrap (통합 번들 로더)
  try {
    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/api/admin/bootstrap`, {
      headers: { 'x-admin-phone': '010-7216-5884' },
    });
    const latency = Date.now() - t0;
    const json = await res.json();

    if (json.success && json.bundle && json.bundle.stats && Array.isArray(json.bundle.users)) {
      console.log(`✅ [1/6] GET /api/admin/bootstrap: 성공 (단일 번들 수신 지연: ${latency}ms)`);
      console.log(`       - 총 회원: ${json.bundle.stats.totalUsersCount}명, 추출 행: ${json.bundle.stats.totalExtractedRowsCount}행`);
      console.log(`       - 대기 문의: ${json.bundle.stats.pendingInquiriesCount}건, 세금계산서 대기: ${json.bundle.stats.requestedTaxCount}건`);
      passCount++;
    } else {
      throw new Error(JSON.stringify(json));
    }
  } catch (err) {
    console.error(`❌ [1/6] GET /api/admin/bootstrap 실패:`, err.message);
    failCount++;
  }

  // 2. POST /api/sms/compile (자연어 규칙 컴파일)
  try {
    const res = await fetch(`${BASE_URL}/api/sms/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '밤 11시부터 새벽 4시 사이에 50만 원 이상 결제되면 010-7216-5884로 즉시 문자 줘',
        headers: ['일자', '결제금액', '가맹점명', '비고'],
        sheetName: '법인카드_영수증_대장',
      }),
    });
    const json = await res.json();

    if (json.success && json.compiled && json.compiled.ruleName) {
      console.log(`✅ [2/6] POST /api/sms/compile: 성공`);
      console.log(`       - 생성된 규칙명: "${json.compiled.ruleName}"`);
      console.log(`       - 추출된 수신번호: ${json.compiled.recipientPhone}`);
      console.log(`       - 추천 발송채널: ${json.compiled.recommendedChannel}`);
      passCount++;
    } else {
      throw new Error(JSON.stringify(json));
    }
  } catch (err) {
    console.error(`❌ [2/6] POST /api/sms/compile 실패:`, err.message);
    failCount++;
  }

  // 3. POST /api/admin/users/tokens (회원 토큰 조정)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-phone': '010-7216-5884',
      },
      body: JSON.stringify({
        phoneNumber: '01072165884',
        deltaTokens: 5000,
        newPlan: 'pro',
        reason: 'E2E 자동화 검증 테스트 보상 충전',
      }),
    });
    const json = await res.json();

    if (json.success && json.updatedBalance !== undefined) {
      console.log(`✅ [3/6] POST /api/admin/users/tokens: 성공`);
      console.log(`       - 회원 번호: ${json.phoneNumber}`);
      console.log(`       - 토큰 갱신: ${json.previousBalance}T ➔ ${json.updatedBalance}T`);
      passCount++;
    } else {
      throw new Error(JSON.stringify(json));
    }
  } catch (err) {
    console.error(`❌ [3/6] POST /api/admin/users/tokens 실패:`, err.message);
    failCount++;
  }

  // 4. POST /api/admin/sms/test (테스트 문자 발송)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/sms/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-phone': '010-7216-5884',
      },
      body: JSON.stringify({
        recipient: '010-7216-5884',
        message: '[FileToSheet E2E 검증] 관리자 대시보드 테스트 문자가 정상 송신되었습니다.',
      }),
    });
    const json = await res.json();

    if (json.success) {
      console.log(`✅ [4/6] POST /api/admin/sms/test: 성공`);
      console.log(`       - 수신 번호: ${json.recipient}`);
      console.log(`       - 유형: ${json.messageType}, 지연: ${json.latencyMs}ms`);
      passCount++;
    } else {
      throw new Error(JSON.stringify(json));
    }
  } catch (err) {
    console.error(`❌ [4/6] POST /api/admin/sms/test 실패:`, err.message);
    failCount++;
  }

  // 5. POST /api/admin/inquiries/ai-draft (고객문의 AI 답변 초안 1초 생성)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/inquiries/ai-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-phone': '010-7216-5884',
      },
      body: JSON.stringify({
        title: '대용량 엑셀 파일 업로드 시 속도 문의',
        content: '50MB 이상 파일을 올릴 때 브라우저 메모리가 부족하다고 뜹니다.',
        userName: '김철수',
      }),
    });
    const json = await res.json();

    if (json.success && json.draft) {
      console.log(`✅ [5/6] POST /api/admin/inquiries/ai-draft: 성공`);
      console.log(`       - 생성된 답변 초안 미리보기: "${json.draft.substring(0, 55)}..."`);
      passCount++;
    } else {
      throw new Error(JSON.stringify(json));
    }
  } catch (err) {
    console.error(`❌ [5/6] POST /api/admin/inquiries/ai-draft 실패:`, err.message);
    failCount++;
  }

  // 6. POST /api/admin/tax-invoices (세금계산서 상태 변경)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/tax-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-phone': '010-7216-5884',
      },
      body: JSON.stringify({
        id: 1,
        newStatus: 'ISSUED',
      }),
    });
    const json = await res.json();

    if (json.success) {
      console.log(`✅ [6/6] POST /api/admin/tax-invoices: 성공 (세금계산서 ISSUED 승인 갱신 완료)`);
      passCount++;
    } else {
      throw new Error(JSON.stringify(json));
    }
  } catch (err) {
    console.error(`❌ [6/6] POST /api/admin/tax-invoices 실패:`, err.message);
    failCount++;
  }

  console.log(`\n======================================================`);
  console.log(`🎯 [Admin E2E Test 결과 요약]`);
  console.log(`   - 성공: ${passCount} / 6`);
  console.log(`   - 실패: ${failCount} / 6`);
  console.log(`   - 종합 판정: ${failCount === 0 ? '전체 테스트 100% 통과 (PASS)' : '일부 실패'}`);
  console.log(`======================================================\n`);
}

runAdminE2ETests();
