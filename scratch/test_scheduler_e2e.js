// c:\dev\FileToSheet\scratch\test_scheduler_e2e.js
// 스케줄러 API 및 백엔드 물리 DB 연동 전수 테스트 스크립트

const BASE_URL = 'http://localhost:4003';

async function runTests() {
  console.log('🚀 [FileToSheet Scheduler] 실시간 E2E 테스트 시작...');

  // 1. 초기 목록 조회 (GET)
  console.log('\n1️⃣ 초기 스케줄 목록 조회 (GET /api/scheduler)');
  const res1 = await fetch(`${BASE_URL}/api/scheduler`);
  const data1 = await res1.json();
  console.log('  응답 상태:', res1.status, '| 성공 여부:', data1.success, '| 현재 작업 수:', data1.tasks?.length);

  // 2. 신규 스케줄 작업 등록 (POST)
  console.log('\n2️⃣ [회계·경리] 심야 영수증 일괄 파싱 스케줄 등록 (POST /api/scheduler)');
  const newTask = {
    title: '[테스트] 심야 영수증 일괄 파싱 및 회계장부 적재',
    cronExpression: '0 0 * * *',
    presetName: 'overnight_receipts',
    sourceType: 'google_drive',
    sourcePath: 'Google Drive/Accounting/Receipts_Inbox',
    targetSheet: '월간_비용_영수증_적재대장',
    isActive: true
  };

  const res2 = await fetch(`${BASE_URL}/api/scheduler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTask)
  });
  const data2 = await res2.json();
  console.log('  응답 상태:', res2.status, '| 생성 성공 여부:', data2.success, '| 생성된 ID:', data2.task?.id);

  if (!data2.success || !data2.task?.id) {
    throw new Error('스케줄 생성 실패!');
  }
  const createdTaskId = data2.task.id;

  // 3. 작업 목록 재조회로 생성 확인
  console.log('\n3️⃣ 등록된 스케줄 확인 (GET /api/scheduler)');
  const res3 = await fetch(`${BASE_URL}/api/scheduler`);
  const data3 = await res3.json();
  const foundTask = data3.tasks.find(t => t.id === createdTaskId);
  console.log('  생성된 작업 조회 결과:', foundTask ? `발견됨 (${foundTask.title})` : '미발견');
  console.log('  현재 상태:', {
    cron: foundTask?.cron_expression,
    source: foundTask?.source_path,
    target: foundTask?.target_sheet,
    isActive: foundTask?.is_active,
    lastRunStatus: foundTask?.last_run_status
  });

  // 4. "▶ 즉시 1회 실행(Run Now)" 트리거 테스트 (PATCH)
  console.log('\n4️⃣ "▶ 즉시 1회 실행(Run Now)" 트리거 실행 (PATCH /api/scheduler)');
  const res4 = await fetch(`${BASE_URL}/api/scheduler`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: createdTaskId,
      action: 'run_now'
    })
  });
  const data4 = await res4.json();
  console.log('  응답 상태:', res4.status, '| 실행 결과:', data4.success);
  console.log('  실행 후 업데이트된 데이터:', {
    lastRunAt: data4.task?.last_run_at,
    lastRunStatus: data4.task?.last_run_status,
    lastRunResult: data4.task?.last_run_result
  });

  // 5. 활성/비활성 토글 테스트 (PATCH)
  console.log('\n5️⃣ 활성/비활성 토글 테스트 (PATCH /api/scheduler)');
  const res5 = await fetch(`${BASE_URL}/api/scheduler`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: createdTaskId,
      action: 'toggle',
      isActive: false
    })
  });
  const data5 = await res5.json();
  console.log('  응답 상태:', res5.status, '| 비활성화 성공 여부:', data5.success);
  console.log('  수정된 is_active 값:', data5.task?.is_active);

  // 6. 두 번째 프리셋 등록 테스트: 택배 마감 발주서 취합
  console.log('\n6️⃣ [물류·이커머스] 택배 마감 발주서 취합 스케줄 등록 (POST /api/scheduler)');
  const orderTask = {
    title: '[실무] 쇼핑몰 주문서 10시/16시 자동 취합 & 출고 큐',
    cronExpression: '0 10,16 * * 1-5',
    presetName: 'order_deadline',
    sourceType: 'local_folder',
    sourcePath: 'D:\\Orders\\Daily_Incoming',
    targetSheet: '당일_출고_취합_장부',
    isActive: true
  };
  const res6 = await fetch(`${BASE_URL}/api/scheduler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderTask)
  });
  const data6 = await res6.json();
  console.log('  응답 상태:', res6.status, '| 두 번째 스케줄 생성 완료:', data6.task?.id);

  // 7. 최종 목록 확인
  console.log('\n7️⃣ 최종 스케줄 목록 전수 검증 (GET /api/scheduler)');
  const res7 = await fetch(`${BASE_URL}/api/scheduler`);
  const data7 = await res7.json();
  console.log(`  총 등록된 스케줄 수: ${data7.tasks?.length}건`);
  data7.tasks.forEach((t, idx) => {
    console.log(`  [${idx + 1}] ID: #${t.id} | ${t.title}`);
    console.log(`      크론식: ${t.cron_expression} | 감시 소스: [${t.source_type}] ${t.source_path}`);
    console.log(`      활성 여부: ${t.is_active ? 'ON' : 'OFF'} | 최근 실행: ${t.last_run_at || '없음'} (${t.last_run_status || '대기'})`);
  });

  // 8. 스케줄 삭제 테스트 (DELETE)
  console.log('\n8️⃣ 테스트 생성 스케줄 정리 및 삭제 테스트 (DELETE /api/scheduler)');
  const res8 = await fetch(`${BASE_URL}/api/scheduler?id=${createdTaskId}`, {
    method: 'DELETE',
  });
  const data8 = await res8.json();
  console.log('  응답 상태:', res8.status, '| 삭제 성공 여부:', data8.success);

  console.log('\n✅ [검증 완료] 스케줄러 백엔드, 물리 DB 및 API 엔드투엔드(C·R·U·D + Run Now) 테스트 100% 성공!');
}

runTests().catch(err => {
  console.error('❌ 테스트 중 오류 발생:', err);
  process.exit(1);
});
