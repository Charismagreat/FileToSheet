import { NextRequest, NextResponse } from 'next/server';

export interface MissingSheetSuggestion {
  id: string;
  name: string;
  description: string;
  headers: string[];
  foreignKeys: Array<{ foreignKey: string; targetSheetName: string; targetKey: string }>;
  sampleRows: Record<string, any>[];
}

export interface UseCaseModule {
  id: string;
  name: string;
  type: 'STATS' | 'FORM' | 'TABLE' | 'RELATION' | 'CHART';
  targetSheetName: string;
  description: string;
}

export interface UseCaseOption {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  recommendedRole: string;
  modules: UseCaseModule[];
}

/**
 * POST /api/portal/generate-ideas
 * 사용자 자연어 프롬프트와 현재 시트 구조를 분석하여:
 * 1) 부족한 보조 시트 및 생생한 샘플 데이터(3건) 제안
 * 2) 다각도 맞춤형 3대 유스케이스 및 모듈 조합안 반환
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = '', sheets = [] } = body;

    const existingSheetNames = sheets.map((s: any) => s.name);
    const existingHeaders = sheets.flatMap((s: any) => s.headers || []);

    const p = prompt.toLowerCase();

    // 1. 지능형 스키마 갭 분석 (부족한 보조 시트 제안)
    const missingSheets: MissingSheetSuggestion[] = [];

    // 케이스 A: 발주/주문/출고 관련인데 주문서나 출고서가 없는 경우
    const needsOrder = p.includes('발주') || p.includes('주문') || p.includes('출고') || p.includes('판매') || p.includes('쇼핑');
    const hasOrderSheet = existingSheetNames.some((n: string) => n.includes('주문') || n.includes('발주') || n.includes('판매'));
    const hasCustomerSheet = existingSheetNames.some((n: string) => n.includes('고객') || n.includes('거래처') || n.includes('업체'));

    if (needsOrder && !hasOrderSheet) {
      // 기존 거래처 시트가 있다면 첫 번째 거래처 이름을 인용
      const customerSheet = sheets.find((s: any) => s.name.includes('고객') || s.name.includes('거래처') || s.name.includes('업체'));
      const samplePartner = customerSheet?.rows?.[0]?.['거래처명'] || customerSheet?.rows?.[0]?.['고객명'] || customerSheet?.rows?.[0]?.['상호'] || '(주)대한상사';
      const samplePartner2 = customerSheet?.rows?.[1]?.['거래처명'] || customerSheet?.rows?.[1]?.['고객명'] || customerSheet?.rows?.[1]?.['상호'] || '세진물류(주)';

      missingSheets.push({
        id: 'missing_orders',
        name: '발주서',
        description: '고객사별 접수된 발주 주문서 및 품목 내역을 관리하는 보조 시트',
        headers: ['주문번호', '주문일자', '고객명', '품목명', '수량', '단가', '합계금액', '주문상태'],
        foreignKeys: customerSheet ? [{ foreignKey: '고객명', targetSheetName: customerSheet.name, targetKey: '거래처명' }] : [],
        sampleRows: [
          {
            주문번호: 'ORD-202610-001',
            주문일자: '2026-10-19',
            고객명: samplePartner,
            품목명: '프리미엄 복사용지 A4',
            수량: 20,
            단가: 25000,
            합계금액: 500000,
            주문상태: '주문접수',
          },
          {
            주문번호: 'ORD-202610-002',
            주문일자: '2026-10-19',
            고객명: samplePartner2,
            품목명: '3단 오피스 파일 바인더',
            수량: 50,
            단가: 4000,
            합계금액: 200000,
            주문상태: '출고준비',
          },
          {
            주문번호: 'ORD-202610-003',
            주문일자: '2026-10-18',
            고객명: samplePartner,
            품목명: '고속 무선 마우스 세트',
            수량: 15,
            단가: 18000,
            합계금액: 270000,
            주문상태: '배송완료',
          },
        ],
      });

      missingSheets.push({
        id: 'missing_delivery',
        name: '출고배송',
        description: '택배사 및 송장번호 기반 실시간 출고 배송 추적 보조 시트',
        headers: ['출고번호', '주문번호', '출고일시', '택배사', '운송장번호', '배송상태'],
        foreignKeys: [{ foreignKey: '주문번호', targetSheetName: '발주서', targetKey: '주문번호' }],
        sampleRows: [
          {
            출고번호: 'OUT-1019-01',
            주문번호: 'ORD-202610-001',
            출고일시: '2026-10-19 14:30',
            택배사: 'CJ대한통운',
            운송장번호: '6542-8812-9901',
            배송상태: '배송중',
          },
          {
            출고번호: 'OUT-1019-02',
            주문번호: 'ORD-202610-003',
            출고일시: '2026-10-18 17:00',
            택배사: '로젠택배',
            운송장번호: '9811-2244-5531',
            배송상태: '배송완료',
          },
        ],
      });
    }

    // 케이스 B: 재고/자재 관련인데 품목마스터나 입출고 수불부가 없는 경우
    const needsInventory = p.includes('재고') || p.includes('자재') || p.includes('입고') || p.includes('창고');
    const hasInventorySheet = existingSheetNames.some((n: string) => n.includes('재고') || n.includes('품목') || n.includes('자재'));

    if (needsInventory && !hasInventorySheet) {
      missingSheets.push({
        id: 'missing_items',
        name: '품목재고마스터',
        description: '자재/품목별 안전재고, 현재고, 보관위치를 관리하는 보조 시트',
        headers: ['품목코드', '품목명', '규격', '현재고', '안전재고', '창고위치', '기본단가'],
        foreignKeys: [],
        sampleRows: [
          { 품목코드: 'ITM-001', 품목명: '프리미엄 복사용지 A4', 규격: 'BOX(2500매)', 현재고: 140, 안전재고: 50, 창고위치: 'A동 2단 선반', 기본단가: 25000 },
          { 품목코드: 'ITM-002', 품목명: '3단 오피스 파일 바인더', 규격: 'EA', 현재고: 35, 안전재고: 40, 창고위치: 'B동 1단 선반', 기본단가: 4000 },
          { 품목코드: 'ITM-003', 품목명: '고속 무선 마우스 세트', 규격: 'SET', 현재고: 85, 안전재고: 20, 창고위치: 'C동 4단 보관함', 기본단가: 18000 },
        ],
      });
    }

    // 기본 시트 이름 및 타겟 설정
    const mainSheetName = existingSheetNames[0] || '기본시트';
    const subSheetName = existingSheetNames[1] || (missingSheets[0]?.name) || '상세시트';

    // 2. 다각도 3대 맞춤형 사용 사례(Use-Case) 옵션 생성
    const useCases: UseCaseOption[] = [
      {
        id: 'case_operations',
        title: '📦 현장·실무 중심 실시간 운영 포털',
        subtitle: '창고/현장 실무자 및 모바일 작업자를 위한 빠른 입출력 환경',
        badge: '현장 실무형',
        recommendedRole: '창고 관리자, 생산/입출고 담당자',
        description: '스마트폰으로 현장에서 즉시 신규 전표를 등록하고, 바코드 및 실시간 수량을 확인하는 모바일 친화형 관리 포털입니다.',
        modules: [
          {
            id: 'm_op_stat',
            name: '일일 현황 KPI 통계 위젯',
            type: 'STATS',
            targetSheetName: mainSheetName,
            description: '오늘 신규 등록 건수, 총 처리 금액, 이상 전표 경고 카드',
          },
          {
            id: 'm_op_form',
            name: '스마트 고속 등록 폼 (모바일 최적화)',
            type: 'FORM',
            targetSheetName: mainSheetName,
            description: '날짜 피커, 자동 수식 계산, 터치 친화형 신규 기표 폼',
          },
          {
            id: 'm_op_grid',
            name: '실시간 검색 & 필터 데이터 그리드',
            type: 'TABLE',
            targetSheetName: mainSheetName,
            description: '초성 검색, 상태값 필터, 엑셀/카드 뷰 원클릭 전환',
          },
        ],
      },
      {
        id: 'case_management',
        title: '💼 영업·정산 중심 관리자 CRM 포털',
        subtitle: '거래처 원장, 미수금 현황, 세금계산서 정산을 위한 경영 관리 환경',
        badge: '경영·정산형',
        recommendedRole: '영업대표, 경리/재무 담당자, 최고경영자',
        description: '거래처를 클릭하면 연관된 모든 전표와 미수금 잔액이 한눈에 연결되는 릴레이션 마스터-디테일 포털입니다.',
        modules: [
          {
            id: 'm_mg_stat',
            name: '재무 건전성 및 월별 매출 요약 카드',
            type: 'STATS',
            targetSheetName: mainSheetName,
            description: '총 매출액, 미수금 합계, 거래처별 정산 진행 현황',
          },
          {
            id: 'm_mg_rel',
            name: '거래처 마스터-디테일 조인 뷰',
            type: 'RELATION',
            targetSheetName: mainSheetName,
            description: '거래처 클릭 시 과거 거래명세서 내역과 세금계산서 목록 동시 노출',
          },
          {
            id: 'm_mg_chart',
            name: '거래처별 매출 기여도 순위 차트',
            type: 'CHART',
            targetSheetName: mainSheetName,
            description: 'TOP 5 주요 고객사 및 월별 거래 추이 시각화',
          },
        ],
      },
      {
        id: 'case_client_portal',
        title: '👥 B2B 거래처 셀프 서비스 포털',
        subtitle: '외부 거래처 및 고객에게 링크를 공유하여 자기 내역을 직접 확인하게 하는 환경',
        badge: '고객 공유형',
        recommendedRole: '외부 거래처 담당자, B2B 고객사',
        description: '거래처 직원이 전용 링크로 접속하여 자기 회사의 거래명세서를 직접 조회하고 PDF로 다운로드하는 셀프 서비스 포털입니다.',
        modules: [
          {
            id: 'm_cp_grid',
            name: '거래처별 전용 거래명세서 열람 그리드',
            type: 'TABLE',
            targetSheetName: subSheetName,
            description: '외부 고객이 자기 거래 내역만 안전하게 열람할 수 있는 클린 뷰',
          },
          {
            id: 'm_cp_form',
            name: '온라인 신규 발주 접수 폼',
            type: 'FORM',
            targetSheetName: subSheetName,
            description: '고객사가 웹에서 직접 주문 수량과 희망 납기일을 기입하는 접수창',
          },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      prompt,
      missingSheets,
      useCases,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
