// c:\dev\FileToSheet\src\lib\inbox-templates.ts
import { insertRows, queryTable } from '@/egdesk-helpers';

export interface DefaultSheetTemplate {
  type: 'receipt' | 'business_card' | 'payment_sms' | 'call_recording';
  sheetName: string;
  headers: string[];
}

export const CORE_2_SHEETS: DefaultSheetTemplate[] = [
  {
    type: 'receipt',
    sheetName: '영수증대장',
    headers: ['일련번호', '거래일자', '상호', '품목', '공급가액', '부가가치세', '합계금액', '결제수단', '증빙서등록일시'],
  },
  {
    type: 'business_card',
    sheetName: '명함관리',
    headers: ['일련번호', '등록일시', '성명', '회사명', '부서직책', '휴대폰번호', '이메일', '회사주소', '비고'],
  },
];

export const ON_DEMAND_SHEETS: Record<string, DefaultSheetTemplate> = {
  payment_sms: {
    type: 'payment_sms',
    sheetName: '결제입금내역',
    headers: ['일련번호', '거래일시', '금융사', '입출구분', '거래금액', '거래대상', '잔액', '메모'],
  },
  call_recording: {
    type: 'call_recording',
    sheetName: '통화녹음대장',
    headers: ['일련번호', '통화일시', '상대방번호', '상대방이름', '통화시간', '통화구분', 'AI요약', '핵심키워드', '녹취파일'],
  },
};

export function generateInboxToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'fts_inbox_';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function buildPublicInboxUrl(token: string): string {
  return `https://file2sheet.cloud/api/inbox/${token}`;
}

/**
 * 특정 프로젝트의 특정 시트에 대한 모바일 수신 토큰 조회 또는 신규 발급
 */
export async function getOrCreateInboxToken(
  projectId: string | number,
  projectName: string,
  sheetName: string,
  userPhone?: string
): Promise<{ token: string; webhookUrl: string }> {
  const pid = String(projectId);

  // 1. 기존 토큰 조회
  const res = await queryTable('share_links', {
    filters: { project_id: pid, status: 'active' },
    limit: 50,
  });

  if (res && Array.isArray(res.rows)) {
    const match = res.rows.find((r: any) => {
      try {
        const payload = typeof r.payload_data === 'string' ? JSON.parse(r.payload_data) : r.payload_data;
        return payload?.mode === 'mobile_sheet_ingest' && payload?.sheetName === sheetName;
      } catch {
        return false;
      }
    });

    if (match) {
      return {
        token: match.token,
        webhookUrl: buildPublicInboxUrl(match.token),
      };
    }
  }

  // 2. 신규 토큰 발급 및 등록
  const token = generateInboxToken();
  const nowIso = new Date().toISOString();
  const payloadData = {
    mode: 'mobile_sheet_ingest',
    projectId: pid,
    projectName,
    sheetName,
    createdAt: nowIso,
  };

  await insertRows('share_links', [
    {
      token,
      project_id: pid,
      project_name: projectName,
      sender_phone: userPhone || null,
      sender_branch: 'SheetBot Mobile Agent',
      allowed_sheets: JSON.stringify([sheetName]),
      payload_data: JSON.stringify(payloadData),
      status: 'active',
      created_at: nowIso,
    },
  ]);

  return {
    token,
    webhookUrl: buildPublicInboxUrl(token),
  };
}
