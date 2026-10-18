'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Lock, CheckCircle2, ChevronRight, ArrowLeft, Building2 } from 'lucide-react';

export default function PrivacyPage() {
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200/80 mb-2">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>PRIVACY & SECURITY CHARTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">개인정보처리방침</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              (주)이지데스크 File to Sheet는 이용자의 개인정보 및 비즈니스 회계 문서를 철통같이 보호합니다.
            </p>
          </div>

          {/* 3대 약관 빠른 전환 탭 */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
            <Link
              href="/terms"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition"
            >
              이용약관
            </Link>
            <span className="px-3 py-1.5 rounded-lg bg-white text-emerald-600 shadow-2xs">개인정보처리방침</span>
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
            <div><strong>개인정보보호책임자:</strong> 정인환 (privacy@filetosheet.com)</div>
            <div><strong>문의처:</strong> support@filetosheet.com | 1588-0000 (평일 09:00 - 18:00)</div>
          </div>

          {/* 🌟 핵심 3대 보안 공약 배너 */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>File to Sheet의 비즈니스 데이터 보호 3대 헌장</span>
            </div>
            <ul className="text-xs space-y-1.5 text-emerald-700">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>외부 AI 모델 학습 완전 차단:</strong> 업로드된 고객의 문서 및 추출된 표 데이터는 어떠한 경우에도 외부 AI 모델의 재학습(Training)에 사용되지 않으며, 표 추출 즉시 분리됩니다.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>은행급 암호화 터널:</strong> 모든 데이터 전송은 TLS 1.3 암호화 채널을 거치며, 사용자별 SQLite 저장소와 격리된 세션 토큰으로 안전하게 보관됩니다.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>멀티유저 데이터 격리 (Multi-User Isolation):</strong> 이용자별 워크스페이스와 시트 데이터는 물리적·논리적으로 완전 분리되어 타 회원에게 절대 노출되지 않습니다.</span>
              </li>
            </ul>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제1조 (수집하는 개인정보의 항목 및 수집 방법)</h2>
            <p>회사는 편리한 서비스 제공 및 본인 확인을 위해 최소한의 개인정보만을 수집합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>회원가입 및 본인인증 시:</strong> 휴대폰 번호, 닉네임, 인증 SMS 발송 기록</li>
              <li><strong>문서 파싱 및 시트 작업 시:</strong> 업로드 파일명, 파일 크기, 추출된 표 데이터, 1:1 대조 메타데이터</li>
              <li><strong>유료 결제 및 세금계산서 발행 시:</strong> 카드 승인번호, 상호명, 사업자등록번호, 대표자명, 담당자 이메일, 사업장 주소</li>
              <li><strong>서비스 이용 중 자동 생성되는 정보:</strong> 접속 IP 주소, 브라우저 정보, 쿠키, 감사 로그(Audit Trail), 토큰 차감 이력</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제2조 (개인정보의 이용 목적)</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>문서 파싱 서비스 제공:</strong> 멀티모달 비전 OCR 표 추출, 엑셀/SQLite 파일 내보내기, 구글 스프레드시트 동기화</li>
              <li><strong>회원 관리:</strong> 휴대폰 번호 기반 로그인, 토큰 잔여량 관리, 비정상적 부정 이용 방지</li>
              <li><strong>정산 및 과금:</strong> 토큰 결제 내역 보존, 환불 처리, 국세청 전자세금계산서 정식 발행</li>
              <li><strong>고객 지원 및 알림:</strong> 1:1 고객문의 AI 초안 생성 및 답변 발송, 자율 알림 문자(SMS) 발송</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제3조 (개인정보의 보유 및 파기 절차)</h2>
            <p>1. 회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
            <p>2. 단, 전자상거래 등에서의 소비자보호에 관한 법률 등 관계 법령에 의하여 보존할 필요가 있는 경우 다음과 같이 법정 기간 동안 안전하게 보관합니다:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
              <li>웹사이트 방문 기록: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제4조 (개인정보의 제3자 제공 및 위탁)</h2>
            <p>1. 회사는 이용자의 사전 동의 없이 개인정보를 외부에 제공하지 않습니다.</p>
            <p>2. 원활한 서비스 운영 및 결제 정산을 위해 다음과 같이 업무를 위탁하고 있습니다:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>전자결제 대행(PG): 토스페이먼츠 / 나이스페이먼츠 (신용카드 결제 및 정산 에스크로)</li>
              <li>문자메시지 발송: 알리고(Aligo) / 구글 메시지 게이트웨이 (인증번호 및 알림 문자 발송)</li>
              <li>클라우드 인프라: EGDesk Cloud & Host Infrastructure</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제5조 (이용자의 권리와 행사 방법)</h2>
            <p>1. 이용자는 언제든지 본인의 개인정보 및 시트 데이터를 열람하거나 수정을 요구할 수 있으며, 회원 탈퇴를 통해 개인정보 이용 동의를 철회할 수 있습니다.</p>
            <p>2. 이용자가 개인정보의 오류에 대한 정정을 요청하신 경우에는 정정을 완료하기 전까지 당해 개인정보를 이용 또는 제공하지 않습니다.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">제6조 (개인정보보호책임자 및 권익침해 구제)</h2>
            <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다.</p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 mt-2">
              <div><strong>개인정보보호책임자:</strong> 정인환 대표이사</div>
              <div><strong>직책:</strong> 개인정보보호최고책임자(CPO)</div>
              <div><strong>연락처:</strong> 1588-0000 (평일 09:00 - 18:00) | <strong>이메일:</strong> privacy@filetosheet.com</div>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              개인정보 침해 신고: 한국인터넷진흥원 개인정보침해신고센터 (국번없이 118)
            </div>
            <Link
              href="/about"
              className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline"
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
            <Link href="/terms" className="hover:text-slate-900">이용약관</Link>
            <span>•</span>
            <span className="font-bold text-emerald-600">개인정보처리방침</span>
            <span>•</span>
            <Link href="/finance-terms" className="hover:text-slate-900">전자금융거래 이용약관</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
