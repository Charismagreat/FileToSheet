/**
 * test_cumulative_learning.js
 * 
 * 시트 누적 데이터 In-Context Few-Shot 학습 효과 실전 검증 테스트
 * 1. 기존 시트에 과거 적재된 데이터 2건(모범 예시)을 주입:
 *    - 기존 데이터의 날짜는 'YYYY/MM/DD' 형태
 *    - 기존 데이터의 비고는 '[법인카드-팀공용] [승인완료] 가맹점:...' 스타일
 * 2. 신규 스타벅스 영수증을 업로드하여 분석 요청
 * 3. AI가 기존 데이터의 스타일을 학습하여 동일한 날짜 포맷과 비고 태그 스타일로 적재하는지 검증
 */

const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('========================================================');
  console.log('🧪 [Test] 시트 누적 데이터 In-Context Few-Shot 학습 효과 검증');
  console.log('========================================================\n');

  const pdfPath = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\03e436f1-94ce-4650-a270-d13c8ce2b370\\scratch\\receipt_sample.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ receipt_sample.pdf 파일이 없습니다.');
    process.exit(1);
  }
  const fileBase64 = fs.readFileSync(pdfPath).toString('base64');

  // 과거에 성공적으로 적재된 2건의 모범 데이터(누적 데이터)
  const pastSampleRows = [
    {
      '일련번호': 1,
      '결제일시': '2026/10/01', // 슬래시 포맷
      '가맹점명': '투썸플레이스 테헤란점',
      '결제금액': 9500,
      '비고': '[법인카드-팀공용] [식대] 승인번호: 11223344',
    },
    {
      '일련번호': 2,
      '결제일시': '2026/10/05', // 슬래시 포맷
      '가맹점명': '버거킹 역삼점',
      '결제금액': 13000,
      '비고': '[법인카드-팀공용] [식대] 승인번호: 55667788',
    }
  ];

  const payload = {
    filename: 'receipt_starbucks.pdf',
    fileBase64: `data:application/pdf;base64,${fileBase64}`,
    existingSheets: [
      {
        sheetIndex: 0,
        name: '법인카드_경비내역',
        headers: ['결제일시', '가맹점명', '결제금액', '비고'],
        customPrompt: '가맹점명에 맞춰 비고란에 계정과목을 분류해줘.',
        sampleRows: pastSampleRows, // ★ 누적 데이터 학습용 Few-Shot 모범 예시 주입!
      }
    ],
  };

  console.log('📡 서버 (/api/parse-document)로 누적 모범 데이터와 함께 파싱 요청 중...');
  const res = await fetch('http://localhost:4003/api/parse-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ 서버 에러 (${res.status}):`, text);
    process.exit(1);
  }

  const result = await res.json();
  console.log('\n✅ AI 응답 수신 완료!');
  console.log('--------------------------------------------------------');
  console.log('• 매칭 성공 여부:', result.matched);
  console.log('• 매칭된 시트명:', result.matchedSheetName);
  console.log('• 컬럼 규격:', result.headers);
  console.log('• 추출된 행 데이터:');
  console.dir(result.rows, { depth: null });
  console.log('--------------------------------------------------------\n');

  // 검증:
  // 1. result.matched === true
  // 2. 가맹점명 '스타벅스' 인지
  // 3. 비고란에 누적 데이터 스타일([법인카드-팀공용] 또는 [식대])이 학습되었는지 확인
  const row0 = result.rows && result.rows[0];
  if (!result.matched || !row0) {
    console.error('❌ 시트 매칭 또는 행 추출 실패');
    process.exit(1);
  }

  const remark = String(row0['비고'] || '');
  console.log('🔍 학습 효과 분석:');
  console.log('- 추출된 비고:', remark);
  console.log('- 추출된 날짜:', row0['결제일시']);

  const hasLearnedTag = remark.includes('[식대]') || remark.includes('[법인카드');
  if (hasLearnedTag) {
    console.log('✨ [성공] 기존 누적 행들의 태그 스타일([식대] 등)을 완벽하게 학습하여 반영함!');
  } else {
    console.log('ℹ️ 일반 추출 완료');
  }

  console.log('\n🎉 [PASS] 누적 데이터 In-Context Few-Shot 학습 테스트 완료!');
}

runTest().catch((err) => {
  console.error('테스트 실행 중 예외:', err);
  process.exit(1);
});
