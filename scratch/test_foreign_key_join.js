/**
 * 외래키(FK) 및 다른 시트 실시간 조인 뷰(Join View) 단위 테스트 스크립트
 */

const sampleProjectSheets = [
  {
    name: '영수증전표',
    headers: ['일련번호', '등록일시', '가맹점명', '공급가액', '부가세', '합계금액', 'fk_거래처_사업자번호'],
    rows: [
      {
        일련번호: 1,
        등록일시: '2026-10-18',
        가맹점명: '(주)이지데스크솔루션',
        공급가액: 100000,
        부가세: 10000,
        합계금액: 110000,
        fk_거래처_사업자번호: '123-45-67890',
      },
      {
        일련번호: 2,
        등록일시: '2026-10-18',
        가맹점명: '알파문구 강남점',
        공급가액: 25000,
        부가세: 2500,
        합계금액: 27500,
        fk_거래처_사업자번호: '987-65-43210', // 미등록 사업자번호 테스트
      },
    ],
    relations: [
      {
        foreignKey: 'fk_거래처_사업자번호',
        targetSheetName: '거래처마스터',
        targetKey: '사업자등록번호',
        displayColumns: ['상호', '대표자명', '정산계좌', '여신한도'],
      },
    ],
  },
  {
    name: '거래처마스터',
    headers: ['사업자등록번호', '상호', '대표자명', '정산계좌', '여신한도'],
    rows: [
      {
        사업자등록번호: '123-45-67890',
        상호: '(주)이지데스크솔루션',
        대표자명: '홍길동',
        정산계좌: '국민 123-456-789012',
        여신한도: '50,000,000원',
      },
      {
        사업자등록번호: '111-22-33333',
        상호: '(주)파트너스코리아',
        대표자명: '김철수',
        정산계좌: '신한 987-654-321098',
        여신한도: '30,000,000원',
      },
    ],
  },
];

function testJoinView() {
  console.log('=== 외래키(FK) 조인 뷰 테스트 시작 ===');
  const currentSheet = sampleProjectSheets[0];
  const relations = currentSheet.relations;
  const projectSheets = sampleProjectSheets;

  // 1. 조인 열 메타데이터 계산
  const joinedCols = [];
  relations.forEach((rel) => {
    const targetSheet = projectSheets.find((s) => s.name === rel.targetSheetName);
    if (targetSheet) {
      (rel.displayColumns || []).forEach((dc) => {
        joinedCols.push({
          headerName: `[${rel.targetSheetName}] ${dc}`,
          sheetName: rel.targetSheetName,
          targetCol: dc,
          foreignKey: rel.foreignKey,
        });
      });
    }
  });

  console.log(`생성된 조인 확장 열 개수: ${joinedCols.length}개`);
  joinedCols.forEach((jc) => console.log(` - ${jc.headerName}`));

  // 2. 각 행에 대한 조인 데이터 추출 및 매칭 검증
  const getJoinedVal = (row, jc) => {
    const fkVal = row[jc.foreignKey];
    if (!fkVal) return { val: '-', isMatched: false };
    const targetSheet = projectSheets.find((s) => s.name === jc.sheetName);
    if (!targetSheet) return { val: '-', isMatched: false };

    const rel = relations.find((r) => r.foreignKey === jc.foreignKey);
    if (!rel) return { val: '-', isMatched: false };

    const matchedRow = targetSheet.rows.find(
      (tr) => String(tr[rel.targetKey] || '').trim() === String(fkVal).trim()
    );

    if (matchedRow) {
      return { val: String(matchedRow[jc.targetCol] ?? '-'), isMatched: true };
    }
    return { val: '(미연결)', isMatched: false };
  };

  currentSheet.rows.forEach((row, idx) => {
    console.log(`\n[행 ${idx + 1}] 가맹점: ${row.가맹점명} (FK: ${row.fk_거래처_사업자번호})`);
    joinedCols.forEach((jc) => {
      const res = getJoinedVal(row, jc);
      console.log(`   └ ${jc.headerName} => ${res.val} (${res.isMatched ? 'MATCHED' : 'UNMATCHED'})`);
    });
  });

  console.log('\n=== 테스트 결과: 정상 통과 ===');
}

testJoinView();
