/**
 * FileToSheet 결제, 충전, 사용 내역 관리 및 엑셀/세금계산서/영수증 유틸
 */

import * as XLSX from 'xlsx';
import { getUsedCoupons } from './coupon-helpers';

export interface TaxInvoiceInfo {
  businessNumber: string; // 사업자등록번호 (10자리)
  companyName: string;    // 상호(법인명)
  representative: string; // 대표자 성명
  email: string;          // 세금계산서 수신 이메일
  address?: string;       // 사업장 주소
  bizType?: string;       // 업태
  bizItem?: string;       // 종목
  requestedAt: string;    // 신청 일시
}

export interface BillingRecord {
  id: string;             // 주문/거래번호 (예: TX-20261018-8421)
  date: string;           // 결제 일시 (ISO)
  type: 'charge' | 'coupon' | 'subscription' | 'pro_trial';
  title: string;          // 결제/충전 상품명
  originalAmount: number; // 정가 (원)
  finalAmount: number;    // 실제 결제 금액 (원, 0원 무료 포함)
  paymentMethod: string;  // 결제 수단 (카드, 카카오페이, 웰컴 바우처 등)
  couponCode?: string;    // 적용 쿠폰 코드
  benefitsDesc: string;   // 지급 혜택 설명
  benefits: {
    tokens?: number;
    docs?: number;
    durationMonths?: number;
  };
  status: 'completed' | 'cancelled';
  taxInvoiceStatus: 'none' | 'requested' | 'issued';
  taxInvoiceInfo?: TaxInvoiceInfo;
}

export interface UsageItem {
  id: string;
  date: string;
  type: 'ai_chat' | 'doc_parse';
  title: string;
  detail: string;
  model?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  docsUsed?: number;
}

const BILLING_STORAGE_KEY = 'filetosheet_billing_history';

/**
 * 결제 및 충전 내역 목록 조회 (WELCOME2026 등 기존 쿠폰 자동 보정 반영)
 */
export function getBillingHistory(): BillingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BILLING_STORAGE_KEY);
    let list: BillingRecord[] = raw ? JSON.parse(raw) : [];

    // WELCOME2026 등 기존 등록된 쿠폰이 내역에 없으면 자동 초기 등록
    const usedCoupons = getUsedCoupons();
    if (usedCoupons.includes('WELCOME2026')) {
      const exists = list.some((r) => r.couponCode === 'WELCOME2026');
      if (!exists) {
        const welcomeRecord: BillingRecord = {
          id: 'TX-20261018-WELCOME',
          date: new Date().toISOString(),
          type: 'coupon',
          title: '신규 가입 웰컴 바우처 (라이트 팩)',
          originalAmount: 2000,
          finalAmount: 0,
          paymentMethod: '프로모션 바우처 (100% 무료 지원)',
          couponCode: 'WELCOME2026',
          benefitsDesc: 'Gemini 3.8 Flash 토큰 25만 + AI 문서 파싱 50장',
          benefits: { tokens: 250000, docs: 50 },
          status: 'completed',
          taxInvoiceStatus: 'none',
        };
        list.unshift(welcomeRecord);
        localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(list));
      }
    }

    return list;
  } catch {
    return [];
  }
}

/**
 * 원격 물리 DB(billing_history)로부터 결제 내역 동기화
 */
export async function fetchBillingHistoryFromDb(): Promise<BillingRecord[]> {
  if (typeof window === 'undefined') return [];
  try {
    let phone = '';
    const userRaw = localStorage.getItem('filetosheet_user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      phone = u.phone || '';
    }

    const res = await fetch(`/api/billing?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.records) && data.records.length > 0) {
      const mapped: BillingRecord[] = data.records.map((r: any) => ({
        id: r.order_id,
        date: r.created_at || new Date().toISOString(),
        type: r.transaction_type || 'charge',
        title: r.title,
        originalAmount: Number(r.original_amount) || 0,
        finalAmount: Number(r.final_amount) || 0,
        paymentMethod: r.payment_method,
        couponCode: r.coupon_code || undefined,
        benefitsDesc: r.benefits_desc,
        benefits: {},
        status: r.status || 'completed',
        taxInvoiceStatus: r.tax_invoice_status || 'none',
        taxInvoiceInfo: r.tax_invoice_info ? (typeof r.tax_invoice_info === 'string' ? JSON.parse(r.tax_invoice_info) : r.tax_invoice_info) : undefined,
      }));

      // 로컬 캐시 업데이트
      localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(mapped));
      window.dispatchEvent(new Event('filetosheet_billing_updated'));
      return mapped;
    }
  } catch (err) {
    console.warn('Failed to fetch billing from DB:', err);
  }
  return getBillingHistory();
}

/**
 * 신규 결제 / 충전 거래 내역 추가 (물리 DB billing_history 및 로컬 캐시 동시 동기화)
 */
export function addBillingRecord(data: {
  type: 'charge' | 'coupon' | 'subscription' | 'pro_trial';
  title: string;
  originalAmount: number;
  finalAmount: number;
  paymentMethod: string;
  couponCode?: string;
  benefitsDesc: string;
  benefits: {
    tokens?: number;
    docs?: number;
    durationMonths?: number;
  };
}): BillingRecord {
  const current = getBillingHistory();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const newRecord: BillingRecord = {
    ...data,
    id: `TX-${dateStr}-${rand}`,
    date: new Date().toISOString(),
    status: 'completed',
    taxInvoiceStatus: 'none',
  };

  const updated = [newRecord, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('filetosheet_billing_updated'));

    // 물리 DB (billing_history) 영구 적재 API 비동기 호출
    let phone = 'anonymous';
    try {
      const userRaw = localStorage.getItem('filetosheet_user');
      if (userRaw) {
        phone = JSON.parse(userRaw).phone || phone;
      }
    } catch {}

    fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        orderId: newRecord.id,
        type: newRecord.type,
        title: newRecord.title,
        originalAmount: newRecord.originalAmount,
        finalAmount: newRecord.finalAmount,
        paymentMethod: newRecord.paymentMethod,
        couponCode: newRecord.couponCode,
        benefitsDesc: newRecord.benefitsDesc,
        status: newRecord.status,
        taxInvoiceStatus: newRecord.taxInvoiceStatus,
      }),
    }).catch((err) => console.error('Failed to sync billing record to DB:', err));
  }
  return newRecord;
}

/**
 * 세금계산서 발행 요청 정보 등록 (물리 DB billing_history 및 로컬 캐시 동시 동기화)
 */
export function requestTaxInvoice(recordId: string, info: Omit<TaxInvoiceInfo, 'requestedAt'>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getBillingHistory();
    const idx = list.findIndex((r) => r.id === recordId);
    if (idx === -1) return false;

    list[idx].taxInvoiceStatus = 'requested';
    list[idx].taxInvoiceInfo = {
      ...info,
      requestedAt: new Date().toISOString(),
    };

    localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('filetosheet_billing_updated'));

    // 물리 DB (billing_history) 세금계산서 정보 업데이트 API 비동기 호출
    fetch('/api/billing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: recordId,
        taxInvoiceStatus: 'requested',
        taxInvoiceInfo: list[idx].taxInvoiceInfo,
      }),
    }).catch((err) => console.error('Failed to sync tax invoice request to DB:', err));

    return true;
  } catch {
    return false;
  }
}

/**
 * 로컬 스토리지 대화 세션 및 원본 파일 데이터로부터 실제 사용 이력 집계
 */
export function getAggregatedUsageHistory(originalFiles: any[] = []): {
  aiUsages: UsageItem[];
  docUsages: UsageItem[];
} {
  const aiUsages: UsageItem[] = [];
  const docUsages: UsageItem[] = [];

  if (typeof window === 'undefined') {
    return { aiUsages, docUsages };
  }

  try {
    // 1. AI 비서 대화 세션별 토큰 사용 이력 추출
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('filetosheet_ai_sessions_')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const sessions = JSON.parse(raw);
        if (Array.isArray(sessions)) {
          for (const sess of sessions) {
            if (Array.isArray(sess.messages)) {
              for (const msg of sess.messages) {
                if (msg.role === 'assistant' && msg.usage) {
                  aiUsages.push({
                    id: msg.id || Math.random().toString(36).substring(2, 9),
                    date: msg.timestamp || sess.updatedAt || new Date().toISOString(),
                    type: 'ai_chat',
                    title: sess.title || '데이터 질의응답',
                    detail: msg.content?.slice(0, 100) || '',
                    model: 'Gemini 3.8 Flash',
                    tokensUsed: {
                      prompt: msg.usage.promptTokens || 0,
                      completion: msg.usage.completionTokens || 0,
                      total: msg.usage.totalTokens || 0,
                    },
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse AI usage:', e);
  }

  // 2. 문서 파싱 내역 집계
  try {
    if (Array.isArray(originalFiles) && originalFiles.length > 0) {
      originalFiles.forEach((file, idx) => {
        docUsages.push({
          id: `DOC-${idx + 1}`,
          date: file.uploadedAt || new Date().toISOString(),
          type: 'doc_parse',
          title: file.name || `문서 파일 #${idx + 1}`,
          detail: `${file.type || '문서'} (${file.size ? (file.size / 1024).toFixed(1) + ' KB' : '완료'})`,
          docsUsed: 1,
        });
      });
    } else {
      // 샘플 기본 파싱 1건
      docUsages.push({
        id: 'DOC-INIT-1',
        date: new Date().toISOString(),
        type: 'doc_parse',
        title: '신규 프로젝트 기본 시트 파싱',
        detail: '기본 템플릿 표 생성 (3개 증빙 대조 연동)',
        docsUsed: 1,
      });
    }
  } catch (e) {
    console.error('Failed to parse Doc usage:', e);
  }

  return {
    aiUsages: aiUsages.reverse(),
    docUsages: docUsages.reverse(),
  };
}

/**
 * 결제 및 이용 내역을 다중 시트 엑셀(.xlsx) 파일로 내보내기 다운로드
 */
export function exportBillingAndUsageToExcel(params: {
  billingList: BillingRecord[];
  aiUsages: UsageItem[];
  docUsages: UsageItem[];
}) {
  const wb = XLSX.utils.book_new();

  // 1. 결제 & 충전 내역 시트
  const billingRows = [
    ['거래번호', '일시', '구분', '상품명', '정가(원)', '결제금액(원)', '결제수단', '적용쿠폰', '지급혜택', '상태', '세금계산서'],
    ...params.billingList.map((r) => [
      r.id,
      r.date.replace('T', ' ').slice(0, 19),
      r.type === 'coupon' ? '쿠폰/바우처' : r.type === 'subscription' ? '구독' : '종량충전',
      r.title,
      r.originalAmount,
      r.finalAmount,
      r.paymentMethod,
      r.couponCode || '-',
      r.benefitsDesc,
      r.status === 'completed' ? '결제완료' : '취소',
      r.taxInvoiceStatus === 'requested' ? '신청완료' : r.taxInvoiceStatus === 'issued' ? '발행완료' : (r.finalAmount === 0 ? '대상아님(0원)' : '미신청'),
    ]),
  ];
  const wsBilling = XLSX.utils.aoa_to_sheet(billingRows);
  XLSX.utils.book_append_sheet(wb, wsBilling, '결제및충전내역');

  // 2. AI 토큰 사용 내역 시트
  const aiRows = [
    ['일시', '대화주제', '모델명', '입력토큰(Prompt)', '출력토큰(Completion)', '합계토큰(Total)', '요약내용'],
    ...params.aiUsages.map((u) => [
      u.date,
      u.title,
      u.model || 'Gemini 3.8 Flash',
      u.tokensUsed?.prompt || 0,
      u.tokensUsed?.completion || 0,
      u.tokensUsed?.total || 0,
      u.detail,
    ]),
  ];
  const wsAi = XLSX.utils.aoa_to_sheet(aiRows);
  XLSX.utils.book_append_sheet(wb, wsAi, 'AI토큰사용내역');

  // 3. 문서 파싱 내역 시트
  const docRows = [
    ['일시', '파일명', '상세정보', '차감장수'],
    ...params.docUsages.map((d) => [
      d.date.replace('T', ' ').slice(0, 19),
      d.title,
      d.detail,
      d.docsUsed || 1,
    ]),
  ];
  const wsDoc = XLSX.utils.aoa_to_sheet(docRows);
  XLSX.utils.book_append_sheet(wb, wsDoc, '문서파싱내역');

  // 파일 다운로드 실행
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `FileToSheet_결제및사용내역_${todayStr}.xlsx`);
}
