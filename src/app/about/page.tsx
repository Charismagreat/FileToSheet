'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  Lock,
  EyeOff,
  Server,
  Smartphone,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  Users,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface CompanyInfo {
  companyName: string;
  ceoName: string;
  bizNumber: string;
  mailOrderNumber: string;
  address: string;
  email: string;
  phone: string;
}

interface SnsLinks {
  kakaoChannel?: string;
  youtube?: string;
  instagram?: string;
  blog?: string;
}

export default function AboutPage() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: '(주)이지데스크',
    ceoName: '정인환',
    bizNumber: '123-45-67890',
    mailOrderNumber: '2026-서울강남-01234',
    address: '서울특별시 강남구 테헤란로 123, 이지빌딩 7층',
    email: 'support@filetosheet.com',
    phone: '1588-0000',
  });

  const [snsLinks, setSnsLinks] = useState<SnsLinks>({
    kakaoChannel: 'https://pf.kakao.com/_example',
    youtube: 'https://www.youtube.com/@EGDesk',
    instagram: 'https://www.instagram.com/egdesk_official',
    blog: 'https://blog.naver.com/egdesk',
  });

  const [loading, setLoading] = useState<boolean>(true);

  // 관리자 콘솔에서 실시간 설정한 회사정보 & SNS 링크 불러오기
  useEffect(() => {
    async function loadCompanySettings() {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success) {
          if (data.companyInfo) setCompanyInfo(data.companyInfo);
          if (data.snsLinks) setSnsLinks(data.snsLinks);
        }
      } catch (err) {
        console.warn('Failed to load company settings from admin DB:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanySettings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* 1. 상단 미니 헤더 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition flex items-center gap-1"
            >
              ← 서비스 홈으로 돌아가기
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                ABOUT US
              </span>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">회사소개 & 보안 헌장</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/use-cases"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition"
            >
              💡 활용사례 보기
            </Link>
            <Link
              href="/admin"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-2xs"
            >
              👑 관리자 콘솔
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 space-y-12">
        {/* 2. 메인 히어로 섹션 (팀 비전 & 슬로건) */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-black tracking-wide shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            B2B DATA EXTRACTION & WORKSPACE REVOLUTION
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            반복되는 서류 풀칠과 타이핑을 끝내고,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              세상의 모든 비정형 데이터를 1초 만에 엑셀 표로
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            <strong>FileToSheet(파일투시트)</strong>는 PDF, 사진, 종이 영수증, 발주서, 거래명세서 등 
            서로 다른 양식의 비정형 문서를 독자적인 AI 엔진과 SQLite 스트리밍 기술로 완벽한 정형 표로 재구조화하는
            차세대 비즈니스 데이터 자동화 솔루션입니다.
          </p>
        </section>

        {/* 3. 독자적 3대 핵심 기술력 */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 sm:p-10 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-black text-indigo-600 tracking-wider uppercase">CORE TECHNOLOGY</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">파일투시트를 지탱하는 3대 독자 기술</h2>
            <p className="text-xs text-slate-500">
              기존 단순 OCR 서비스의 한계를 뛰어넘어, 대용량 실무 엑셀 환경에 최적화된 아키텍처를 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">멀티모달 비전 OCR 엔진</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                구겨진 영수증, 기울어진 스캔본, 손글씨 품목명까지 문맥(Context)을 이해하여 컬럼별(일자, 가맹점명, 금액, 부가세)로 완벽히 자동 분할 정렬합니다.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">0초 로딩 & 실시간 DB 왓처</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                단일 통합 번들 로더(Unified Bundle Loader)와 SQLite DB Watcher를 통해 대량 데이터 적재 시에도 버벅임 없이 0.001초 만에 화면이 동기화됩니다.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">1초 QR 모바일 직결 인박스</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                복잡한 구글 드라이브나 클라우드 연동 없이, 현장에서 스마트폰으로 QR 코드를 찍고 카메라로 촬영하면 지정 엑셀 시트에 1초 만에 데이터가 꽂힙니다.
              </p>
            </div>
          </div>
        </section>

        {/* 4. 엄격한 엔터프라이즈 데이터 보안 및 프라이버시 헌장 */}
        <section className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ENTERPRISE SECURITY PLEDGE
              </div>
              <h2 className="text-2xl font-black tracking-tight">철저한 데이터 보호 및 프라이버시 원칙</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-sm">
              고객사의 소중한 회계·재무 및 비즈니스 문서는 최우선 보안 원칙에 따라 철통 보호됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <EyeOff className="w-4 h-4" />
                <span>AI 모델 학습 완전 차단</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                업로드된 고객의 문서 및 표 데이터는 어떠한 경우에도 외부 AI 모델의 재학습(Training)에 사용되지 않으며, 데이터 추출 즉시 격리됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span>종단간 전송 및 저장 암호화</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                모든 통신은 TLS 1.3 암호화 터널을 통과하며, 로컬 SQLite 저장소와 이지데스크 터널링 보안을 통해 무단 탈취를 원천 방지합니다.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>전수 변경 감사 추적 (Audit Trail)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                누가 언제 어떤 셀을 수정하거나 행을 추가/삭제했는지 모든 이력이 감사 로그에 영구 기록되어 위변조 방지 컴플라이언스를 충족합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 5. 공식 회사 정보 & SNS 링크 (관리자 콘솔 DB 실시간 연동) */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs font-black text-indigo-600 tracking-wider uppercase">COMPANY CREDENTIALS</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">공식 회사 정보 및 공식 채널</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>관리자 콘솔 실시간 연동 완료</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* 회사 법적 기본 정보 */}
            <div className="space-y-4 bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                사업자 법적 등록 정보
              </h3>

              <div className="divide-y divide-slate-200/60 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">상호명</span>
                  <span className="font-bold text-slate-900">{companyInfo.companyName}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">대표자명</span>
                  <span className="font-bold text-slate-900">{companyInfo.ceoName}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">사업자등록번호</span>
                  <span className="font-mono font-bold text-slate-900">{companyInfo.bizNumber}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">통신판매업신고번호</span>
                  <span className="font-mono text-slate-700">{companyInfo.mailOrderNumber}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">사업장 주소</span>
                  <span className="text-slate-800 text-right max-w-xs">{companyInfo.address}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">고객센터 / 대표전화</span>
                  <span className="font-mono font-bold text-indigo-600">{companyInfo.phone}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">대표 이메일</span>
                  <span className="font-mono text-slate-700">{companyInfo.email}</span>
                </div>
              </div>
            </div>

            {/* 공식 SNS & 고객 소통 채널 */}
            <div className="space-y-4 bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-indigo-600" />
                공식 소통 채널 및 미디어 바로가기
              </h3>
              <p className="text-xs text-slate-500">
                파일투시트의 최신 업데이트 소식과 활용 가이드를 공식 채널에서 만나보세요.
              </p>

              <div className="space-y-3 pt-2">
                {snsLinks.kakaoChannel && (
                  <a
                    href={snsLinks.kakaoChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 flex items-center justify-between text-xs transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xs">
                        K
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">카카오톡 공식 채널</div>
                        <div className="text-[11px] text-slate-400">1:1 빠른 실시간 상담 및 소식 받기</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
                  </a>
                )}

                {snsLinks.youtube && (
                  <a
                    href={snsLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 flex items-center justify-between text-xs transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                        ▶
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">유튜브 공식 채널</div>
                        <div className="text-[11px] text-slate-400">동영상 튜토리얼 및 실무 활용 팁</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition" />
                  </a>
                )}

                {snsLinks.instagram && (
                  <a
                    href={snsLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 flex items-center justify-between text-xs transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                        📷
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">인스타그램 공식 계정</div>
                        <div className="text-[11px] text-slate-400">카드뉴스 및 팀 소식</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
                  </a>
                )}

                {snsLinks.blog && (
                  <a
                    href={snsLinks.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 flex items-center justify-between text-xs transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                        N
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">네이버 공식 블로그</div>
                        <div className="text-[11px] text-slate-400">기술 심층 분석 및 비즈니스 인사이트</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 6. B2B 엔터프라이즈 맞춤 도입 및 제휴 안내 배너 */}
        <section className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              기업 맞춤형 온프레미스 구축 및 바우처 도입 상담
            </h3>
            <p className="text-xs text-indigo-100 leading-relaxed font-medium">
              대규모 문서 일괄 처리, 사내 ERP 연동, 대량 바우처 구매가 필요하신 기업 고객께는 
              전문 엔지니어가 1:1 맞춤형 기술 컨설팅과 전용 파이프라인 설계를 지원해 드립니다.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <a
              href={`mailto:${companyInfo.email}?subject=[B2B 도입문의] FileToSheet 기업 맞춤 상담 신청`}
              className="px-6 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>이메일로 도입 문의</span>
            </a>
            <a
              href={`tel:${companyInfo.phone}`}
              className="px-6 py-3 rounded-xl bg-indigo-800/80 hover:bg-indigo-900 text-white font-bold text-xs transition flex items-center justify-center gap-2 border border-white/20"
            >
              <Phone className="w-4 h-4" />
              <span>전화 상담: {companyInfo.phone}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
