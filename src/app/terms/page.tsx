'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ShieldCheck, ChevronRight, ArrowLeft, Building2 } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {/* 1. 상단 미니 헤더 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/about"
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>회사소개로 돌아가기</span>
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
            >
              서비스 홈
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/about"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>ABOUT US</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. 본문 메인 영역 */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1">
        {/* 상단 타이틀 & 탭 네비게이션 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200/80 mb-2">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>LEGAL NOTICES & POLICIES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">서비스 이용약관</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              File to Sheet(이하 &quot;서비스&quot;)의 비정형 문서 정밀 표 변환 및 데이터 자동화 솔루션 이용 규정입니다.
            </p>
          </div>

          {/* 3대 약관 빠른 전환 탭 */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-lg bg-white text-indigo-600 shadow-2xs">이용약관</span>
            <Link
              href="/privacy"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition"
            >
              개인정보처리방침
            </Link>
            <Link
              href="/finance-terms"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition"
            >
              전자금융거래
            </Link>
          </div>
        </div>

        {/* 약관 본문 카드 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-10 space-y-8 text-xs sm:text-sm leading-relaxed text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div><strong>시행일자:</strong> 2026년 1월 1일 (최신 개정: 2026년 10월 18일)</div>
            <div><strong>서비스명:</strong> File to Sheet (비정형 문서 멀티모달 비전 OCR ➔ 2차원 스프레드시트 정형 변환 솔루션)</div>
            <div><strong>운영 주체:</strong> (주)이지데스크 (대표자: 정인환)</div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제1조 (목적)</h2>
            <p>
              본 약관은 (주)이지데스크(이하 &quot;회사&quot;라 합니다)가 제공하는 비정형 문서(PDF, 이미지, 영수증, 발주서, 거래명세서 등)의 정밀 표 변환, 실시간 엑셀 시트 스트리밍 적재, 모바일 QR 직결 인박스, 정기 스케줄 무인 자동화 및 AI 업무 솔루션인 &quot;File to Sheet&quot;(이하 &quot;서비스&quot;라 합니다)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제2조 (용어의 정의)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>&quot;서비스&quot;</strong>란 회사가 웹 브라우저 및 모바일 연동 인프라를 통해 제공하는 멀티모달 AI 비전 파서, 스프레드시트 뷰어, SQLite DB 변환, 실시간 알림 문자 발송 등의 일체 솔루션을 의미합니다.</li>
              <li><strong>&quot;이용자&quot;</strong>란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
              <li><strong>&quot;토큰(Token)&quot;</strong>이란 서비스 내에서 AI 문서 파싱 및 고난도 표 구조화, AI 질의응답을 수행하기 위해 차감 또는 충전되는 디지털 크레딧을 의미합니다.</li>
              <li><strong>&quot;시트봇 모바일앱 연동&quot;</strong>이란 이용자가 모바일 카메라를 통해 영수증이나 문서를 촬영하고 실시간 웹훅 토큰을 통해 지정 엑셀 시트에 즉시 행을 적재하는 기능을 말합니다.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제3조 (약관의 효력 및 변경)</h2>
            <p>1. 본 약관은 서비스 웹사이트 초기 화면 또는 연결 화면에 게시함으로써 효력이 발생합니다.</p>
            <p>2. 회사는 관계 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있으며, 약관이 개정되는 경우 적용일자 및 개정사유를 명시하여 적용일자 7일 전(이용자에게 불리한 변경 시 30일 전)부터 웹사이트 공지사항을 통해 고지합니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제4조 (회원가입 및 계정 관리)</h2>
            <p>1. 회원가입은 이용자가 휴대폰 번호 인증 절차를 거쳐 약관에 동의함으로써 완료됩니다.</p>
            <p>2. 이용자는 본인의 인증 계정 정보를 타인에게 양도하거나 대여할 수 없으며, 계정 관리 소홀로 인해 발생하는 모든 불이익에 대한 책임은 이용자 본인에게 있습니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제5조 (서비스 제공 및 유료 토큰 결제/환불)</h2>
            <p>1. 회사는 기본 무료 티어(Free Tier) 및 유료 요금제(Starter, Pro, Enterprise)를 제공하며, 문서 파싱 시 사전에 고지된 토큰이 차감됩니다.</p>
            <p>2. 유료 토큰 충전 및 구독 결제는 신용카드, 계좌이체 등 전자지급결제 수단을 통해 이루어집니다.</p>
            <p>3. 사용하지 않은 유료 충전 토큰은 결제일로부터 7일 이내에 전액 환불을 요청할 수 있습니다. 단, 이미 문서 파싱에 사용된 토큰 분량에 대해서는 환불이 제한될 수 있습니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제6조 (데이터 보안 및 격리 원칙)</h2>
            <p>1. 회사는 이용자가 업로드한 원본 문서(영수증, 전표, 계약서 등)와 추출된 표 데이터를 외부 인공지능 모델의 학습 데이터로 일체 재활용하지 않습니다.</p>
            <p>2. 이용자별 워크스페이스 데이터는 철저한 멀티유저 데이터 격리(Multi-User Isolation) 원칙에 따라 분리되어 보관되며, 셀 단위 수정 및 행 삭제 이력은 전수 감사 추적 대장(Audit Trail)에 영구 기록되어 위변조 방지 컴플라이언스를 충족합니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제7조 (면책 조항)</h2>
            <p>1. 회사는 천재지변, 클라우드 API 공급사의 장애 또는 정책 변경, 기타 불가항력적인 사유로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
            <p>2. AI 비전 모델이 자동 추출한 표 데이터는 원본 문서의 상태(구김, 오염, 해상도 저하 등)에 따라 일부 오탈자가 발생할 수 있으므로, 이용자는 실무 전표 처리 전 화면의 1:1 증빙 대조 기능을 통해 최종 확인을 진행해야 합니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제8조 (분쟁 해결 및 관할법원)</h2>
            <p>본 약관과 관련하여 회사와 이용자 간에 발생한 분쟁에 대해서는 대한민국 법률을 준거법으로 하며, 회사의 본사 소재지를 관할하는 법원을 전속 관할법원으로 합니다.</p>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              문의사항: support@filetosheet.com | 고객센터: 1588-0000 (평일 09:00 - 18:00)
            </div>
            <Link
              href="/about"
              className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
            >
              <span>회사소개 & 보안 헌장 보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* 3. 푸터 */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-400 text-center">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 (주)이지데스크 File to Sheet. All rights reserved.</p>
          <div className="flex items-center gap-3 text-slate-500">
            <span className="font-bold text-indigo-600">이용약관</span>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-900">개인정보처리방침</Link>
            <span>•</span>
            <Link href="/finance-terms" className="hover:text-slate-900">전자금융거래 이용약관</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
