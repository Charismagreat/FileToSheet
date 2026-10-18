// c:\dev\FileToSheet\scratch\test_mobile_inbox_e2e.js
// 시트봇 모바일앱 직결 연동 토큰 발급, QR 페어링 검증, 데이터 수신 E2E 테스트 스크립트

const BASE_URL = 'http://localhost:4003';

async function runTests() {
  console.log('🚀 [FileToSheet Mobile Ingest] 시트봇 모바일 연동 실시간 E2E 테스트 시작...');

  // 1. 특정 시트에 대한 모바일 수신 토큰 신규 발급 (POST /api/inbox/token)
  console.log('\n1️⃣ 모바일 수신 토큰 발급 요청 (POST /api/inbox/token)');
  const tokenReq = {
    projectId: 'test_proj_001',
    projectName: '2026 하반기 지출결의',
    sheetName: '법인카드_영수증_대장',
    userPhone: '010-7216-5884',
  };

  const res1 = await fetch(`${BASE_URL}/api/inbox/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokenReq),
  });
  const data1 = await res1.json();
  console.log('  응답 상태:', res1.status, '| 성공 여부:', data1.success);
  console.log('  발급된 토큰:', data1.token);
  console.log('  수신 웹훅 URL:', data1.webhookUrl);
  console.log('  QR 페이로드:', data1.qrPayload);

  if (!data1.success || !data1.token) {
    throw new Error('토큰 발급 실패!');
  }
  const token = data1.token;

  // 2. 모바일앱에서 QR코드 스캔 시 페어링 유효성 검증 (GET /api/inbox/[token])
  console.log('\n2️⃣ 모바일앱 QR코드 스캔 & 페어링 검증 (GET /api/inbox/[token])');
  const res2 = await fetch(`${BASE_URL}/api/inbox/${token}`);
  const data2 = await res2.json();
  console.log('  응답 상태:', res2.status, '| 페어링 유효 여부:', data2.valid);
  console.log('  연결된 프로젝트:', data2.projectName);
  console.log('  연결된 시트:', data2.sheetName);
  console.log('  환영 메시지:', data2.message);

  if (!data2.valid) {
    throw new Error('페어링 검증 실패!');
  }

  // 3. 모바일앱에서 사진/데이터 수신 전송 테스트 (POST /api/inbox/[token]) - JSON 모드
  console.log('\n3️⃣ 모바일앱에서 영수증 데이터 전송 테스트 (POST /api/inbox/[token])');
  const mobilePayload = {
    fileName: '20261018_스타벅스_영수증.jpg',
    memo: '외근 중 고객사 미팅 음료대',
    amount: 14800,
    rowData: {
      '일자': '2026-10-18',
      '가맹점명': '스타벅스 역삼포스코점',
      '금액': 14800,
      '결제수단': '법인카드(010-7216-5884)',
      '비고': '시트봇 모바일앱 카메라 촬영 건',
    },
  };

  const res3 = await fetch(`${BASE_URL}/api/inbox/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mobilePayload),
  });
  const data3 = await res3.json();
  console.log('  응답 상태:', res3.status, '| 적재 성공 여부:', data3.success);
  console.log('  서버 응답 메시지:', data3.message);
  console.log('  적재된 타깃 시트:', data3.targetSheet);
  console.log('  적재된 데이터:', data3.data);

  if (!data3.success) {
    throw new Error('데이터 적재 실패!');
  }

  console.log('\n✅ [검증 완료] 시트봇 모바일앱 ↔ 파일투시트 직결 연동 파이프라인 E2E 100% 정상 작동!');
}

runTests().catch(err => {
  console.error('❌ 테스트 중 오류 발생:', err);
  process.exit(1);
});
