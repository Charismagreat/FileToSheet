'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
  Clock,
  TrendingUp,
  FileText,
  Receipt,
  ShoppingCart,
  HardHat,
  Scale,
  Stethoscope,
  Briefcase,
  Database,
  Eye,
  AlertCircle,
  Check,
  ChevronRight,
  Brain,
  History,
  FileCheck2,
  RotateCcw,
  Link2,
  Calendar,
  Moon,
} from 'lucide-react';

export default function UseCasesPage() {
  const [activeCategory, setActiveCategory] = useState<number>(0);

  // 6대 핵심 직무/업종별 활용사례 데이터
  const useCases = [
    {
      id: 'finance',
      category: '회계·세무·경리',
      icon: Receipt,
      badge: '가장 많은 활용',
      title: '월말 영수증 100장, 10초 만에 경비 정산 엑셀 장부로 완성',
      subtitle: '구겨진 종이 영수증 사진, 카드 매출전표, 전자세금계산서 PDF를 던지면 항목별로 완벽하게 정규화합니다.',
      problem: '매월 말마다 직원들이 제출한 법인카드 영수증과 세금계산서를 보며 일자, 가맹점, 품목, 공급가, 세액을 하나하나 엑셀에 손으로 타이핑하느라 야근을 반복합니다.',
      solution: '영수증 묶음이나 세금계산서 PDF를 한 번에 드래그 앤 드롭하면, AI가 사업자번호, 결제일시, 공급가액, 부가세를 자동으로 분리해 정밀한 2차원 표로 정리합니다.',
      inputDocs: ['식대/교통비 종이영수증 촬영본', '카드사 매출전표 PDF', '홈택스 전자세금계산서'],
      extractedColumns: ['결제일자', '가맹점(공급자)', '사업자번호', '품목내역', '공급가액', '부가세', '합계금액', '승인번호/비고'],
      customRulePrompt: '가맹점명에 맞춰 비고란에 [식대], [교통비], [소모품비] 계정과목 태그를 붙이고, 결제금액이 1만원 이하이면 [소액경비]로 분류해줘. 부가세는 결제금액의 10%로 자동 계산해줘.',
      roiText: '월평균 정산 소요 시간 8시간 ➔ 15분으로 97% 단축',
    },
    {
      id: 'logistics',
      category: '이커머스·물류·유통',
      icon: ShoppingCart,
      badge: '재고/발주 효율화',
      title: '수십 개 거래처의 제각각인 발주서와 거래명세서 일괄 표준화',
      subtitle: '형식이 제각각인 팩스 스캔본, 발주서 엑셀, 송장을 단일 규격의 통합 재고 및 출고 시트로 통합합니다.',
      problem: '거래처마다 발주서 양식(PDF, 이미지, 엑셀)이 달라 품목코드와 수량을 통합 ERP 시스템에 복사-붙여넣기 하느라 오배송 및 재고 불일치 위험이 큽니다.',
      solution: '모든 형식의 발주서를 던지면 FileToSheet의 AI 스마트 시트 라우터가 발주내역 시트로 자동 감지해 품목, 규격, 수량, 단가를 단일 규격으로 통합 적재합니다.',
      inputDocs: ['도매상 수기 거래명세서 스캔본', '이커머스 플랫폼별 발주서', '물류센터 입고확인증'],
      extractedColumns: ['주문일자', '발주처', '품목코드/품목명', '규격/옵션', '수량', '입고단가', '배송지정보', '송장번호'],
      customRulePrompt: '발주처별로 품목코드와 수량을 분리 추출하고, 배송지 주소가 제주 및 도서산간 지역인 경우 비고란에 [도서산간 할증] 태그를 붙여줘.',
      roiText: '일일 발주 취합 시간 2시간 ➔ 3분 완료, 오입력률 0%',
    },
    {
      id: 'construction',
      category: '건설·인테리어·시공',
      icon: HardHat,
      badge: '원가/견적 정밀 관리',
      title: '복잡한 공사 내역서·견적서에서 자재비·인건비 즉시 산출',
      subtitle: '수십 장짜리 원가 견적서와 자재 납품서를 실행예산 대비 실집행 비교 시트로 자동 변환합니다.',
      problem: '현장에서 올라오는 수많은 자재 영수증과 하도급 공사내역서가 종이나 PDF로 흩어져 있어, 공사 건별 실제 원가가 예산 내에 들어오는지 파악이 지연됩니다.',
      solution: '복잡한 다단 구조의 공사 견적서도 AI가 공종, 세부 품목, 수량, 단위, 재료비, 노무비, 경비로 완벽 분해하여 견적 비교 시트를 실시간 생성합니다.',
      inputDocs: ['공사 도급계약서 견적서', '건축자재 납품 거래명세표', '현장 장비 임대 및 일용직 노임대장'],
      extractedColumns: ['공종구분', '세부품목', '규격', '단위', '수량', '재료비단가', '노무비단가', '합계원가', '현장명'],
      customRulePrompt: '공종명(철거/목공/전기/도배)을 식별해 독립 열로 분리하고, 건당 금액이 100만 원 초과 시 비고에 [현장소장 사전결재필]을 기재해줘.',
      roiText: '견적 검토 및 원가 대조 시간 3일 ➔ 10분으로 압축',
    },
    {
      id: 'finance-audit',
      category: '금융·법무·총무',
      icon: Scale,
      badge: '감사 및 컴플라이언스',
      title: '수백 페이지 통장 거래내역서와 계약서 전수 데이터베이스화',
      subtitle: '종이 통장 복사본과 스캔 PDF를 SQLite DB 및 피벗 통계로 즉시 전환해 회계 감사에 완벽 대응합니다.',
      problem: '기업 회계 감사나 세무조사 시 은행에서 발급받은 수백 장의 입출금 거래내역 PDF에서 특정 거래처나 1,000만 원 이상 고액 출금 내역을 찾는 데 수일이 소요됩니다.',
      solution: '통장 PDF를 드롭하면 거래일시, 적요, 출금액, 입금액, 잔액을 깨끗한 디지털 표로 변환하고, SQLite DB 내보내기 및 필터 연동 통계로 이상 징후를 즉시 추출합니다.',
      inputDocs: ['은행 전계좌 입출금 거래내역 PDF', '부동산 임대차 계약서', '표준 근로계약서 및 서약서'],
      extractedColumns: ['거래일시', '구분(입/출)', '거래처/적요', '출금액', '입금액', '거래후잔액', '취급점', '비고'],
      customRulePrompt: '적요란에 "이자", "배당"이 포함되면 [금융수익]으로 분류하고, 500만 원 이상 출금 거래는 비고에 [고액출금 대사필]을 자동으로 달아줘.',
      roiText: '감사 자료 추출 및 이상 거래 소명 준비 시간 90% 단축',
    },
    {
      id: 'medical-edu',
      category: '병원·약국·학원',
      icon: Stethoscope,
      badge: '정기 결제/수납 관리',
      title: '일일 수납대장 및 의약품/교재 납품서 원클릭 정산',
      subtitle: '포스기 일일 마감 출력물과 도매상 거래명세서를 월별 수익 및 비용 장부로 통합 관리합니다.',
      problem: '매일 출력되는 포스 마감 영수증과 도매상에서 보내온 납품 확인서를 서랍에 쌓아두었다가 세무사 사무실에 보낼 때 누락과 혼선이 발생합니다.',
      solution: '매일 스마트폰으로 마감 영수증과 납품서를 사진 찍어 업로드하면, 원본 증빙 탭에 파일이 안전 보존되면서 하나의 통합 정산 시트에 행이 착착 누적됩니다.',
      inputDocs: ['포스(POS) 일일 결제 마감표', '의약품/의료소모품 납품명세서', '학원 수강료 수납대장'],
      extractedColumns: ['수납일자', '환자/수강생명', '항목/과목', '카드결제액', '현금결제액', '미수금', '취소여부', '담당자'],
      customRulePrompt: '수납방법(카드/현금영수증/미수)을 분리 기재하고, 수강생명 뒤에 보호자 연락처 뒷자리 4자리를 추출해 괄호로 병기해줘.',
      roiText: '세무사 사무실 자료 전달 준비 시간 0분 (공유 링크 1초 전송)',
    },
    {
      id: 'freelancer',
      category: '1인기업·프리랜서·소상공인',
      icon: Briefcase,
      badge: '종소세/부가세 대비',
      title: '1년 치 뒤죽박죽 영수증 묶음으로 5월 종합소득세 완벽 대비',
      subtitle: '지갑과 서랍 속 영수증을 스마트폰으로 찍어 올리면 필요경비 인정 엑셀 장부를 자동으로 완성합니다.',
      problem: '5월 종합소득세 신고 때 필요경비를 인정받으려면 1년 동안 쓴 영수증을 다 모아서 엑셀로 정리해야 하는데, 엄두가 나지 않아 매년 경비 처리를 포기합니다.',
      solution: '영수증 사진 수십 장을 한 번에 던지면 AI가 날짜별, 항목별로 엑셀을 만들어주고 총합계와 월별 통계를 뽑아주어 세무 대리인에게 전달만 하면 끝납니다.',
      inputDocs: ['카페/식당 간이영수증', '사무용품/소모품 구매 영수증', '출장 숙박비 및 주유비 전표'],
      extractedColumns: ['일자', '지출처', '지출목적', '공급가액', '부가세', '결제금액', '결제수단', '비고'],
      customRulePrompt: '지출처에 따라 국세청 필요경비 항목([여비교통비], [접대비], [복리후생비], [지급수수료])으로 자동 태깅하고, 날짜는 YYYY-MM-DD 형식으로 통일해줘.',
      roiText: '놓칠 뻔한 필요경비 전액 인정으로 소득세 절세 효과 극대화',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. 상단 글로벌 내비게이션 바 (메인 화면 헤더와 동일한 전폭 패딩 정렬) */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/15 group-hover:scale-105 transition">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-tight block">FileToSheet</span>
            <p className="text-[11px] text-slate-400 font-normal leading-tight hidden sm:block">어떤 파일이든 업로드 즉시 엑셀 표로, FileToSheet</p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/"
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95"
          >
            시트 작업 화면으로
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>지금 무료로 변환하기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. Hero Section: 밝고 신뢰감 있는 라이트 블루 그라디언트 테마 (max-w-5xl 일치) */}
      <section className="relative overflow-hidden pt-16 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white w-full">
        <div className="max-w-5xl mx-auto w-full text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 text-xs font-extrabold mb-6 shadow-xs animate-in fade-in slide-in-from-top-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>수기 타이핑 3시간 ➔ AI 엑셀 자동화 10초</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.18] mb-6 break-keep max-w-4xl mx-auto">
            어떤 파일이든 업로드 즉시, <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              정밀한 엑셀 표로 재탄생합니다
            </span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 break-keep">
            영수증, 세금계산서, 계약서, 발주서, 통장내역... 세상에 존재하는 모든 비정형 문서를
            AI가 읽고, 구조를 분석하여, 엑셀 표·구글 시트·SQLite DB로 즉시 정규화합니다.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-14">
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/20 transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>내 파일로 바로 무료 체험하기</span>
            </Link>
            <a
              href="#use-cases-list"
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-300 shadow-2xs transition"
            >
              업종별 활용사례 둘러보기
            </a>
          </div>

          {/* 4대 핵심 지표 카드 그리드 (max-w-5xl 기준) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-8 border-t border-slate-200">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs text-center">
              <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">99.8%</div>
              <div className="text-xs font-bold text-slate-600 mt-1">AI 표 변환 정확도</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs text-center">
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">3초</div>
              <div className="text-xs font-bold text-slate-600 mt-1">파일당 평균 처리 속도</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs text-center">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">94%</div>
              <div className="text-xs font-bold text-slate-600 mt-1">수기 타이핑 시간 절감</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs text-center">
              <div className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">100%</div>
              <div className="text-xs font-bold text-slate-600 mt-1">원본 증빙 무결성 보존</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Before vs After 비교 섹션 (일정한 높이와 명확한 대비 - max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-50/50 w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">BEFORE & AFTER</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-keep">
              File to Sheet 도입 전과 후, 업무가 이렇게 바뀝니다
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full">
            {/* Before 카드 */}
            <div className="p-6 sm:p-7 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-block mb-4">
                  ❌ 기존의 고통스러운 업무 방식
                </span>
                <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2.5 break-keep">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>영수증 50장 보며 공급가, 세액 일일이 수기 타이핑 (평균 3시간 소요)</span>
                  </li>
                  <li className="flex items-start gap-2.5 break-keep">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>타이핑 중 오타(0 하나 더 붙음)로 회계 장부 불일치 및 스트레스 발생</span>
                  </li>
                  <li className="flex items-start gap-2.5 break-keep">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>세무사무소나 감사팀에서 원본 영수증 달라고 할 때 서류함 뒤지느라 시간 낭비</span>
                  </li>
                  <li className="flex items-start gap-2.5 break-keep">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>거래처마다 다른 양식의 견적서/발주서 정리하다 잦은 야근 반복</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-rose-200/80 text-xs text-rose-700 font-bold">
                평균 작업 소요 시간: 건당 3시간 이상 소요
              </div>
            </div>

            {/* After 카드 */}
            <div className="p-6 sm:p-7 rounded-2xl bg-blue-50/70 border border-blue-300 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-600 text-white shadow-2xs inline-block mb-4">
                  ✨ FileToSheet 도입 후의 혁신
                </span>
                <ul className="space-y-3.5 text-xs sm:text-sm text-slate-800 font-medium">
                  <li className="flex items-start gap-2.5 break-keep">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>영수증 묶음을 드래그 앤 드롭하면 10초 만에 완벽한 엑셀 표로 자동 정리</span>
                  </li>
                  <li className="flex items-start gap-2.5 break-keep">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>AI가 날짜, 가맹점, 품목, 부가세를 정밀 분리해 0의 오차도 없는 정확성</span>
                  </li>
                  <li className="flex items-start gap-2.5 break-keep">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>[원본 증빙 대조] 탭에서 원본 PDF/영수증과 표 데이터 1:1 전수 영구 보존</span>
                  </li>
                  <li className="flex items-start gap-2.5 break-keep">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>버튼 클릭 한 번으로 구글 시트 및 My DB(SQLite) 실시간 동기화 완료</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-blue-200 text-xs text-blue-700 font-black flex items-center justify-between">
                <span>평균 작업 소요 시간: 단 10초 만에 완료</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">94% 시간 단축</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 직무 및 업종별 6대 핵심 활용사례 인터랙티브 탐색기 (max-w-5xl w-full 완전 통일) */}
      <section id="use-cases-list" className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">INDUSTRY SOLUTIONS</h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 break-keep">
              다양한 직무와 현장에서 이렇게 사용하고 있습니다
            </h3>
            <p className="text-slate-500 text-sm mt-2 break-keep">원하시는 직무나 업종을 선택하여 구체적인 변환 프로세스를 확인해 보세요.</p>
          </div>

          {/* 카테고리 탭 선택 바 */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 no-scrollbar w-full">
            {useCases.map((c, idx) => {
              const IconComp = c.icon;
              const isActive = activeCategory === idx;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{c.category}</span>
                </button>
              );
            })}
          </div>

          {/* 선택된 상세 활용사례 쇼케이스 카드 */}
          {(() => {
            const current = useCases[activeCategory];
            const Icon = current.icon;
            return (
              <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden animate-in fade-in duration-300 w-full">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-600">{current.category}</span>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 break-keep">{current.title}</h4>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    {current.badge}
                  </span>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed mb-8 break-keep">{current.subtitle}</p>

                {/* 문제와 솔루션 2열 그리드 (균형 잡힌 박스) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 items-stretch w-full">
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black text-rose-600 flex items-center gap-1.5 mb-2.5">
                        <span>기존 업무의 한계 (Pain Point)</span>
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-keep">{current.problem}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black text-blue-700 flex items-center gap-1.5 mb-2.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>File to Sheet의 해결책 (Solution)</span>
                      </span>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed break-keep font-medium">{current.solution}</p>
                    </div>
                  </div>
                </div>

                {/* 입력 문서 ➔ 추출 컬럼 매핑 파이프라인 */}
                <div className="bg-slate-50/80 border border-slate-200 p-6 rounded-2xl mb-8 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-2.5">📂 지원되는 원본 문서 형태:</span>
                      <div className="flex flex-wrap gap-2">
                        {current.inputDocs.map((doc, i) => (
                          <span key={i} className="text-xs bg-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs font-medium">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{doc}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-emerald-700 block mb-2.5">📊 정밀 추출되는 엑셀 표준 컬럼:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {current.extractedColumns.map((col, i) => (
                          <span key={i} className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-mono font-bold shadow-2xs">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 시트 맞춤 자연어 AI 적재 규칙 안내 박스 */}
                  {current.customRulePrompt && (
                    <div className="mt-5 pt-4 border-t border-slate-200/80">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-black shadow-2xs">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                          이 시트에 사전 지정된 AI 맞춤 적재 규칙 (예시)
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">복잡한 엑셀 수식 없이 일상 문장으로 지정</span>
                      </div>
                      <div className="p-3.5 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-blue-50/40 rounded-xl border border-purple-200/80 text-xs text-slate-800 font-mono leading-relaxed shadow-inner">
                        💬 &quot;{current.customRulePrompt}&quot;
                      </div>
                    </div>
                  )}
                </div>

                {/* 하단 기대 효과 및 바로 체험 CTA */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold block">도입 기대 효과</span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900">{current.roiText}</span>
                    </div>
                  </div>

                  <Link
                    href="/"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>이 사례로 바로 변환해보기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 4-B. 신규: 시트별 자연어 적재 규칙 (Prompt-Driven AI Rules) 하이라이트 섹션 (max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-gradient-to-b from-purple-50/30 via-white to-slate-50/40 w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-black tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompt-Driven AI Schema & Rules</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-keep mb-3">
              복잡한 엑셀 수식 없이, 원하는 적재 규칙을 <span className="text-purple-600 underline decoration-purple-300 decoration-wavy underline-offset-4">일상 언어</span>로
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto break-keep leading-relaxed">
              시트마다 &quot;식대는 [복리후생비]로 자동 분류&quot;, &quot;10만 원 이상은 [승인필요] 태그 추가&quot;처럼 원하는 규칙을 한국어로 한 줄만 적어두세요. File to Sheet의 AI 라우터가 파일 분석부터 표 데이터 적재까지 규칙을 100% 준수하여 자동 변환합니다.
            </p>
          </div>

          {/* 4대 대표 실전 자연어 규칙 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-8">
            <div className="p-6 rounded-2xl bg-white border border-purple-200/90 shadow-sm hover:shadow-md hover:border-purple-400 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                    경비 지출 / 회계
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">수기 계정 분류 0분화</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">계정과목 자동 분류 & 소액경비 태깅</h3>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  💬 &quot;스타벅스나 음식점 영수증은 [식대]로 계정 분류하고, 5만 원 초과는 [소액경비] 태그를 붙여줘&quot;
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  AI가 상호명과 품목을 인지하여 회사 회계 기준에 맞는 계정과목을 스스로 채워 넣고 금액 구간별 승인 태그를 자동으로 생성합니다.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-blue-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                    세금계산서 / 홈택스
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">ERP 호환 규격 통일</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">사업자번호 포맷 통일 & 부가세 10% 자동 분리</h3>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  💬 &quot;사업자등록번호는 000-00-00000 포맷으로 통일하고 공급가액의 10%를 부가세 컬럼에 자동 산출해줘&quot;
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  띄어쓰기나 하이픈이 제각각인 사업자번호를 표준 규격으로 일괄 정제하고 누락된 부가세를 계산식에 맞춰 정확히 계산합니다.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-amber-200/90 shadow-sm hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    공사 / 현장 발주
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">리스크 사전 감지</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">고액 품목 선별 & 임원 보고 대상 플래그</h3>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  💬 &quot;단가가 1,000만 원 초과이거나 미수금이 발생한 품목은 비고란에 [임원보고대상]으로 명시해줘&quot;
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  수천 줄의 공사 자재 및 하도급 내역 중 주요 리스크와 고액 품목을 즉시 필터링할 수 있도록 사전 분류합니다.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-emerald-200/90 shadow-sm hover:shadow-md hover:border-emerald-400 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    인사 / 의료 / 법무
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">개인정보 안심 보호</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">개인정보 비식별화 & 날짜 표준 형식 고정</h3>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  💬 &quot;성명은 가운데 글자를 마스킹(예: 홍*동)하고 모든 진료/입사 일자는 YYYY-MM-DD 형식으로 고정해줘&quot;
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  민감한 개인정보를 안전하게 마스킹 처리하고 서로 다른 시스템 간 통합이 가능하도록 날짜 표준 포맷을 강제합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 적용 방법 안내 배너 */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">사용법은 정말 간단합니다</h4>
                <p className="text-xs text-purple-200 break-keep">
                  메인 화면 하단 시트 탭 바에서 <span className="text-yellow-300 font-bold">[✨ 시트 AI 적재 규칙]</span> 버튼을 누르고 원하는 문장을 입력하기만 하면 끝납니다.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="shrink-0 px-4 py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-900 font-black text-xs transition shadow-sm cursor-pointer"
            >
              직접 규칙 지정해보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 4-C. 신규: 엔터프라이즈 전수 감사(Audit Trail) & 누적 학습 인프라 (max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black tracking-wide uppercase mb-3 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enterprise Audit Trail & Cumulative Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-keep mb-3">
              단순 표 변환을 넘어, <span className="text-blue-600 underline decoration-blue-300 decoration-wavy underline-offset-4">엔터프라이즈급 감사 추적</span>과 누적 학습 인프라
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto break-keep leading-relaxed">
              어떤 파일이 언제 업로드되었는지, 누가 어떤 셀을 고쳤는지, 삭제된 행의 원본이 무엇이었는지 전수 기록하는 이지데스크 물리 데이터베이스 체계가 비즈니스 데이터의 100% 무결성을 보장합니다.
            </p>
          </div>

          {/* 3대 핵심 엔터프라이즈 인프라 카드 그리드 (3열) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-8">
            {/* 1. 누적 데이터 맥락 학습 */}
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:shadow-md hover:border-purple-300 transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">누적 맥락 학습</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">In-Context</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep mb-4">
                  데이터가 쌓일수록 AI가 기존 행들의 날짜 포맷, 계정과목 태그, 부가세 계산 방식을 모범 예시(Few-Shot)로 스스로 학습하여 새 파일도 완벽한 일관성으로 적재합니다.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-200/80 text-[11px] text-purple-700 font-bold flex items-center justify-between">
                <span>기업 기밀 유출 0%</span>
                <span className="font-mono">sheet_rules</span>
              </div>
            </div>

            {/* 2. 전수 변경 및 삭제 감사 추적 */}
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <History className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">셀 단위 변경·삭제 감사</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Audit Trail</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep mb-4">
                  표에서 수정한 셀의 변경 전/후 원본 값을 실시간 보존하고, 삭제된 행의 전체 JSON 스냅샷을 영구 기록하여 실수로 삭제된 데이터도 완벽하게 추적·복원합니다.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-200/80 text-[11px] text-blue-700 font-bold flex items-center justify-between">
                <span>회계 감사 전수 추적</span>
                <span className="font-mono">data_change_logs</span>
              </div>
            </div>

            {/* 3. AI 호출 및 대화 영구 보존 */}
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">AI 호출 & 대화 아카이빙</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Logging</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep mb-4">
                  어떤 AI 모델이 몇 토큰을 소모했는지 실시간으로 투명하게 감사 로깅하며, AI 수석 비서와 나눈 분석 대화 이력을 기기 변경 시에도 영구 복원하여 제공합니다.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-200/80 text-[11px] text-emerald-700 font-bold flex items-center justify-between">
                <span>토큰 감사 & 대화 복원</span>
                <span className="font-mono">ai_call_logs</span>
              </div>
            </div>
          </div>

          {/* 인프라 요약 정보 바 */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs w-full">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-slate-200">이지데스크 My DB 물리 데이터베이스 체계 가동 중:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-300">
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">uploaded_files</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">sheet_rules</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">data_change_logs</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">billing_history</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">ai_chat_messages</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-D. 신규: 외래키(FK) 적재 & 실시간 시트 조인 뷰 (Relational Sheets - max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-indigo-50/20 w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-black tracking-wide uppercase mb-3 shadow-xs">
              <Link2 className="w-3.5 h-3.5" />
              <span>Relational Sheets & Live Join View</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-keep mb-3">
              외래키(FK) 적재와 실시간 시트 조인 — <br className="hidden sm:inline" />
              <span className="text-indigo-600 underline decoration-indigo-300 decoration-wavy underline-offset-4">엑셀을 관계형 데이터베이스(RDB)처럼</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto break-keep leading-relaxed">
              수백 장의 영수증이나 발주서를 다른 마스터 시트와 1:1로 실시간 결합합니다. 복잡한 VLOOKUP 수식 없이도 거래처 대표자, 정산 계좌번호, 여신한도를 한 화면에서 즉시 대조할 수 있습니다.
            </p>
          </div>

          {/* 3대 핵심 조인 시나리오 카드 (3열) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-8">
            <div className="p-6 rounded-2xl bg-white border border-indigo-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">회계 · 세무 · 정산</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">CRM 연동</span>
                </div>
                <h4 className="text-xs font-bold text-indigo-700 mb-2">영수증전표 ↔ 거래처 마스터</h4>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  영수증의 <strong>사업자등록번호</strong>를 외래키로 연결하면, 거래처 마스터의 [정산계좌], [담당영업], [여신한도]가 실시간 확장 표시되어 결제 실수가 원천 차단됩니다.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] text-indigo-600 font-bold flex items-center justify-between">
                <span>Join Key: 사업자번호</span>
                <span className="font-mono text-slate-400">1:1 매칭</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-indigo-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">물류 · SCM · 유통</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">오배송 검증</span>
                </div>
                <h4 className="text-xs font-bold text-blue-700 mb-2">배송 송장 ↔ 본사 발주서</h4>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  택배 송장이나 인수증의 <strong>주문번호</strong>를 외래키로 묶어 발주서와 조인하면, 발주 수량과 실제 입고 수량 불일치 및 미출고 건을 원클릭으로 검출합니다.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] text-blue-600 font-bold flex items-center justify-between">
                <span>Join Key: 주문번호</span>
                <span className="font-mono text-slate-400">수량 불일치 대조</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-indigo-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">금융 · 자금 관리</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">자동 반제</span>
                </div>
                <h4 className="text-xs font-bold text-emerald-700 mb-2">통장 입출금 ↔ 매출 계산서</h4>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  통장 적요란의 입금자를 <strong>거래처코드</strong> 외래키로 매핑하여 매출 계산서와 조인하면, 청구액과 입금액이 자동 반제되어 미수금 목록만 단번에 분리됩니다.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-bold flex items-center justify-between">
                <span>Join Key: 거래처코드</span>
                <span className="font-mono text-slate-400">미수금 자동 추적</span>
              </div>
            </div>
          </div>

          {/* 라이브 조인 뷰 시뮬레이션 UI 쇼케이스 박스 */}
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden w-full">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="font-bold">실제 조인 뷰 화면 미리보기 (Live Join View Simulation)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold">
                  🔗 4개 보조 열 실시간 결합 중
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px]">
                    <th className="px-3 py-2 border-r border-slate-200">#</th>
                    <th className="px-3 py-2 border-r border-slate-200 font-bold text-slate-800">가맹점(공급자)</th>
                    <th className="px-3 py-2 border-r border-slate-200 font-bold text-slate-800">결제금액</th>
                    <th className="px-3 py-2 border-r border-slate-200 font-bold text-indigo-700 bg-indigo-50/80">
                      🔗 [FK] 사업자등록번호
                    </th>
                    <th className="px-3 py-2 border-r border-indigo-100 font-bold text-indigo-900 bg-indigo-100/60">
                      [거래처] 상호
                    </th>
                    <th className="px-3 py-2 border-r border-indigo-100 font-bold text-indigo-900 bg-indigo-100/60">
                      [거래처] 대표자
                    </th>
                    <th className="px-3 py-2 font-bold text-indigo-900 bg-indigo-100/60">
                      [거래처] 정산계좌
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-mono">1</td>
                    <td className="px-3 py-2.5 font-medium">(주)이지데스크솔루션</td>
                    <td className="px-3 py-2.5 font-mono">110,000원</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-indigo-600 bg-indigo-50/40">123-45-67890</td>
                    <td className="px-3 py-2.5 bg-indigo-50/20 text-indigo-900 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        (주)이지데스크솔루션
                      </span>
                    </td>
                    <td className="px-3 py-2.5 bg-indigo-50/20 text-indigo-900">홍길동 대표</td>
                    <td className="px-3 py-2.5 bg-indigo-50/20 font-mono text-[11px] text-slate-600">국민 123-456-789012</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-mono">2</td>
                    <td className="px-3 py-2.5 font-medium">알파문구 강남점</td>
                    <td className="px-3 py-2.5 font-mono">27,500원</td>
                    <td className="px-3 py-2.5 font-mono text-slate-500 bg-indigo-50/40">987-65-43210</td>
                    <td className="px-3 py-2.5 bg-slate-50 text-slate-400 italic" colSpan={3}>
                      ⚠️ (거래처 마스터에 미등록된 사업자번호 — 신규 등록 대상)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
              <span>💡 표 헤더 우측 [+ 열 추가] ➔ [🔗 외래키(조인 열)] 선택 시 즉시 생성됩니다.</span>
              <span className="font-semibold text-indigo-600">인라인 편집 시 키 자동완성(Datalist) 지원</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-E. 신규: 정기 스케줄 & 무인 파이프라인 (Scheduled Automation & Batch Pipeline - max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black tracking-wide uppercase mb-3 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Scheduled Automation & Unattended Pipeline</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-keep mb-3">
              정기 스케줄과 무인 자동화 — <br className="hidden sm:inline" />
              <span className="text-amber-600 underline decoration-amber-300 decoration-wavy underline-offset-4">사람이 잠든 사이 완성되는</span> 엑셀 파이프라인
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto break-keep leading-relaxed">
              매일 밤 자정 영수증 일괄 파싱, 택배 마감 시간 발주서 취합, 매주 월요일 아침 미수금 대조까지. 반복되는 문서 작업을 스케줄러에 맡기면 출근 즉시 완벽한 엑셀 장부를 만날 수 있습니다.
            </p>
          </div>

          {/* 4대 핵심 스케줄 자동화 카드 (2x2 그리드) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-8">
            {/* 1. 회계 심야 무인 일괄 파싱 */}
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:shadow-md hover:border-amber-300 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      매일 밤 00:00 (Cron)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">출근 즉시 장부 확인</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  [회계·경리] 심야 무인 일괄 파싱 (Overnight Batch)
                </h3>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  ⏰ 매일 자정, Google Drive / 지정 폴더의 신규 영수증·계산서 전수 감지 ➔ 자동 파싱
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  직원들이 낮 동안 업로드해 둔 수백 장의 영수증을 심야 시간에 AI가 전수 분석하여 월간 경비 시트에 적재합니다. 경리 담당자가 아침 9시에 출근하면 이미 완벽히 정렬된 엑셀 표가 준비되어 있습니다.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/80 mt-4 text-[11px] text-amber-700 font-bold flex items-center justify-between">
                <span>월말 정산 야근 100% 해소</span>
                <span className="font-mono">Unattended Auto-Parse</span>
              </div>
            </div>

            {/* 2. 이커머스 마감 발주서 자동 취합 */}
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-md">
                      매일 10:00 / 16:00
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">택배 마감 완벽 대응</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  [물류·이커머스] 발주서 자동 표준화 & 출고 큐 생성
                </h3>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  ⏰ 마감 정각마다 복수 쇼핑몰 발주서 수집 ➔ 본사 단일 출고 규격 시트로 병합
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  스마트스토어, 쿠팡, 자사몰 등 제각각인 양식의 발주서를 자동으로 표준화하고, 품목 마스터의 SKU 외래키를 조인하여 재고 부족 및 오배송 위험을 사전에 자동 경고합니다.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/80 mt-4 text-[11px] text-blue-700 font-bold flex items-center justify-between">
                <span>수기 복사-붙여넣기 0건 달성</span>
                <span className="font-mono">Order Batch Queue</span>
              </div>
            </div>

            {/* 3. 금융 주간 미수금 자동 반제 */}
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      매주 월요일 08:00
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">주간 경영회의 보고용</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  [금융·자금] 주간 통장 입출금 & 미수금 자동 반제
                </h3>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  ⏰ 주말 은행 거래내역 파싱 ➔ 매출 계산서 조인 ➔ 미입금 거래처 목록 자동 추출
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  주말 동안 발생한 모든 통장 입출금 내역을 파싱하여 매출 세금계산서와 거래처코드 외래키로 대조합니다. 금액이 일치하는 건은 자동 수납 처리하고, 미입금된 거래처 명단만 별도로 뽑아 리포트를 발행합니다.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/80 mt-4 text-[11px] text-emerald-700 font-bold flex items-center justify-between">
                <span>미수금 회수율 35% 증대</span>
                <span className="font-mono">Auto-Reconciliation</span>
              </div>
            </div>

            {/* 4. 프랜차이즈 지점 마감 매출 동기화 */}
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-2xs hover:shadow-md hover:border-purple-300 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-purple-800 bg-purple-100/70 px-2 py-0.5 rounded-md">
                      매일 밤 23:00 (마감 직후)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">전사 매출 실시간 집계</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  [다지점·프랜차이즈] 전국 매장 마감 매출 통합 동기화
                </h3>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-3 leading-relaxed">
                  ⏰ 전국 지점 수신함 인입 전표 취합 ➔ 본사 통합 시트 자동 갱신
                </div>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  전국 50개 매장에서 전송한 일일 마감 포스 영수증과 정산서를 스케줄러가 일괄 취합하여 본사 통합 매출 시트에 합산합니다. 마감 누락 매장을 자동 판별하여 본사 집계 업무를 당일 자정 전에 마감합니다.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/80 mt-4 text-[11px] text-purple-700 font-bold flex items-center justify-between">
                <span>지점별 마감 누락률 0%</span>
                <span className="font-mono">Multi-Branch Sync</span>
              </div>
            </div>
          </div>

          {/* 4단계 스케줄 자동화 파이프라인 흐름도 바 */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">대화창에서 바로 스케줄을 설정할 수 있습니다</h4>
                <p className="text-xs text-slate-300 break-keep">
                  채팅창에 <span className="text-amber-300 font-mono font-bold">/schedule</span> 명령어를 입력하여 원하는 정기 실행 주기와 폴더 경로를 자연어로 등록해 보세요.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="shrink-0 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs transition shadow-sm cursor-pointer"
            >
              스케줄 자동화 체험하기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FileToSheet만의 4대 차별화 핵심 기술 (Why Us? - max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-50/40 w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">WHY FILETOSHEET</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-keep">
              단순 OCR을 넘어선 엔터프라이즈급 데이터 인프라
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch w-full">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-2">스마트 분류 & 맞춤 규칙</h4>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  여러 파일을 한꺼번에 던져도 AI가 성격별로 자동 분배하며, 사용자가 시트에 한국어로 적어둔 자연어 규칙에 맞춰 완벽하게 가공·적재합니다.
                </p>
              </div>
              <span className="text-[11px] text-blue-600 font-bold mt-4 block">Auto-Router & Rules →</span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Eye className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-2">원본 증빙 1:1 대조 & 전수 감사</h4>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  변환된 표와 원본 문서를 1:1로 대조함은 물론, 셀 단위 수정 전/후 값과 삭제된 행 스냅샷까지 영구 보존하여 회계 감사 100% 무결성을 보장합니다.
                </p>
              </div>
              <span className="text-[11px] text-indigo-600 font-bold mt-4 block">Audit Trail 완비 →</span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-2">구글 시트 & My DB 동기화</h4>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  클릭 한 번으로 팀원들이 공유하는 구글 스프레드시트에 즉시 탭을 생성하거나 SQLite 파일 및 원격 My DB로 자동 백업합니다.
                </p>
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-4 block">클라우드 연동 완료 →</span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-purple-300 transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-2">철저한 보안 및 데이터 보호</h4>
                <p className="text-xs text-slate-600 leading-relaxed break-keep">
                  모든 업로드 파일은 최고 등급의 암호화 처리되며, AI 학습에 절대 사용되지 않고 사용자의 명시적 삭제 시 원천 파기됩니다.
                </p>
              </div>
              <span className="text-[11px] text-purple-600 font-bold mt-4 block">안심 보안 아키텍처 →</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 자주 묻는 질문 (FAQ - max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white w-full">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">FAQ</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">자주 묻는 질문</h3>
          </div>

          <div className="space-y-4 w-full">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-purple-600 font-black">Q.</span>
                <span>우리 회사만의 특별한 계정과목 분류나 부가세 계산 규칙이 있는데 적용할 수 있나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                네, 완벽하게 지원합니다! File to Sheet는 시트별로 원하는 분석 및 적재 지침을 자연어로 직접 설정할 수 있는 <strong className="text-purple-700 font-bold">‘자연어 AI 적재 규칙’</strong> 기능을 기본 탑재하고 있습니다. 하단 시트 탭 바에서 <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">[✨ 시트 AI 적재 규칙]</span> 버튼을 누르고 &quot;식대는 [복리후생비]로 분류&quot;, &quot;5만 원 이상은 [소액경비] 표기&quot;처럼 일상 언어로 입력해 두시면, 파일이 업로드될 때 AI가 해당 규칙을 스스로 인지하고 완벽하게 적용하여 표로 정리해 드립니다.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-indigo-600 font-black">Q.</span>
                <span>여러 시트에 나뉜 데이터(예: 영수증 전표와 거래처 마스터)를 서로 연결(JOIN)해서 볼 수 있나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                네, 강력하게 지원합니다! 표데이터 탭에서 <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">[+ 열 추가] ➔ [🔗 외래키(조인 열)]</span>을 선택하시면, 다른 시트의 기준 키(예: 사업자등록번호, 주문번호)를 연결할 수 있습니다. 외래키 열이 생성되면 하단에 <strong className="text-indigo-700 font-bold">‘🔗 다른 시트 조인 뷰’</strong> 토글 버튼이 생기며, 이를 켜는 즉시 복잡한 VLOOKUP 수식 없이도 거래처 대표자, 정산계좌, 여신한도 등의 상세 데이터가 우측에 실시간으로 매칭되어 결합 표시됩니다.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-amber-600 font-black">Q.</span>
                <span>매일 특정 시간이나 밤사이에 자동으로 문서를 파싱하고 시트를 갱신할 수 있나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                네, 스케줄 무인 자동화 파이프라인을 지원합니다! 매일 밤 자정(00:00)이나 택배 마감 시간(10:00, 16:00), 매주 월요일 아침 등 원하는 주기를 설정해 두면, 지정된 Google Drive나 로컬 공유 폴더에 인입된 신규 영수증·발주서·통장 내역을 <strong className="text-amber-700 font-bold">스케줄러가 백그라운드에서 무인(Unattended)으로 일괄 수집 및 파싱</strong>합니다. 사용자가 출근했을 때는 이미 전날 데이터가 완벽하게 적재된 엑셀 표를 즉시 확인하실 수 있습니다. 대화창에서 <span className="font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">/schedule</span> 명령어로 바로 지정할 수 있습니다.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-blue-600 font-black">Q.</span>
                <span>데이터가 누적되면 AI가 우리 회사의 양식을 스스로 학습하나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                네, 맞습니다! 기존 시트에 데이터가 누적되면, 다음 파일을 분석할 때 AI가 해당 시트에 성공적으로 적재된 최근 데이터 행들을 <strong className="text-blue-700 font-bold">‘모범 예시(Few-Shot Sample)’</strong>로 자동 참조합니다. 따라서 날짜 표기법(슬래시 또는 하이픈), 가맹점별 계정과목 태그, 부가세 10:1 분리 계산 스타일 등을 스스로 학습하여 완벽한 일관성으로 채워 넣습니다. 기업 기밀은 외부 모델에 무단 저장되지 않는 안전한 In-Context Learning 방식입니다.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-emerald-600 font-black">Q.</span>
                <span>실수로 엑셀 데이터를 잘못 수정하거나 행을 삭제하면 복구할 수 있나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                네, 안심하셔도 좋습니다! File to Sheet는 전용 감사 추적 엔진(<strong className="text-emerald-700 font-bold">data_change_logs</strong>)을 가동하고 있습니다. 표에서 셀 값을 수정할 때 변경 전/후 원본 값을 실시간 기록하며, 행을 삭제하더라도 해당 행의 모든 데이터 스냅샷을 영구 보존하므로 언제든 원본을 대조하고 안전하게 복구할 수 있습니다.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-blue-600 font-black">Q.</span>
                <span>어떤 형식의 파일을 올릴 수 있나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                엑셀 파일(.xlsx, .xls), 텍스트/표 데이터(.csv), PDF 문서(.pdf), 그리고 스마트폰으로 촬영하거나 스캔한 모든 이미지 포맷(.png, .jpg, .jpeg, .webp 등)을 완벽하게 지원합니다.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-blue-600 font-black">Q.</span>
                <span>여러 개의 영수증을 한 번에 올려도 되나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                네, 하단 중앙의 파일 업로드 버튼에서 여러 파일을 한 번에 선택하거나 테이블 영역으로 드래그 앤 드롭하시면, 우측 하단의 실시간 큐 모니터링 창이 작동하여 순차적으로 자동 파싱 및 분배 적재합니다.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-blue-600 font-black">Q.</span>
                <span>회사 기밀이나 개인정보 유출 위험은 없나요?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep">
                File to Sheet는 엔터프라이즈 보안 가이드라인을 준수합니다. 업로드된 문서는 고객님의 승인 없이 외부에 공유되지 않으며, 인공지능 모델의 학습 데이터로 재활용되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 최종 하단 전환 CTA 배너 (max-w-5xl w-full 완전 통일) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 text-center bg-slate-50/60 w-full">
        <div className="max-w-5xl mx-auto w-full rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 text-white shadow-xl shadow-indigo-500/15 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white mb-5 shadow-inner">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black mb-4 break-keep">
            더 이상 영수증과 서류 타이핑으로 <br className="hidden sm:inline" />
            시간을 낭비하지 마세요
          </h2>
          <p className="text-blue-100 text-sm max-w-lg mb-8 leading-relaxed break-keep">
            지금 바로 첫 파일을 업로드해 보세요. 3초 만에 정리된 엑셀 표를 직접 확인하실 수 있습니다.
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-700 font-black text-sm shadow-lg shadow-black/10 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>지금 무료로 시작하기</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 8. 푸터 (max-w-5xl w-full 완전 통일) */}
      <footer className="bg-white py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 border-t border-slate-200 w-full">
        <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span className="font-extrabold text-slate-700">FileToSheet</span>
            <span className="text-slate-300">|</span>
            <span>어떤 파일이든 업로드 즉시 엑셀 표로, FileToSheet</span>
          </div>
          <div>© 2026 FileToSheet. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
