import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { queryTable, updateRows, insertRows } from '@/egdesk-helpers';
import { realtimeHub } from '@/lib/realtime-hub';
import { invalidateCache } from '@/lib/server-cache';

/**
 * GET /api/admin/settings - 푸터, 회사정보, SNS, AI 모델 설정 조회
 * POST /api/admin/settings - 설정 업데이트
 */
export async function GET(req: NextRequest) {
  try {
    const res = await queryTable('admin_settings', { limit: 50 });
    let companyInfo = {
      companyName: '(주)이지데스크',
      ceoName: '정인환',
      bizNumber: '123-45-67890',
      mailOrderNumber: '2026-서울강남-01234',
      address: '서울특별시 강남구 테헤란로 123, 이지빌딩 7층',
      email: 'support@filetosheet.com',
      phone: '1588-0000',
    };
    let snsLinks = {
      kakaoChannel: 'https://pf.kakao.com/_example',
      youtube: 'https://www.youtube.com/@EGDesk',
      instagram: 'https://www.instagram.com/egdesk_official',
      blog: 'https://blog.naver.com/egdesk',
    };
    let aiModelConfig = {
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-2.5-pro',
      temperature: 0.2,
      maxOutputTokens: 8192,
      systemPrompt: '당신은 거래명세서, 세금계산서, 영수증 등 비정형 문서를 정밀한 2차원 스프레드시트 표로 완벽하게 변환하는 Gemini 최신 비전 파서 AI입니다.',
    };

    (res.rows || []).forEach((r: any) => {
      try {
        const val = JSON.parse(r.setting_value);
        if (r.setting_key === 'company_info') companyInfo = val;
        if (r.setting_key === 'sns_links') snsLinks = val;
        if (r.setting_key === 'ai_model_config') aiModelConfig = val;
      } catch {}
    });

    return NextResponse.json({
      success: true,
      companyInfo,
      snsLinks,
      aiModelConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { key, value, category = 'general' } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'key와 value가 필요합니다.' }, { status: 400 });
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const now = new Date().toISOString();

    const existing = await queryTable('admin_settings', {
      where: { setting_key: key },
      limit: 1,
    });

    if (existing.rows && existing.rows.length > 0) {
      await updateRows(
        'admin_settings',
        {
          setting_value: valueStr,
          category,
          updated_at: now,
        },
        { ids: [existing.rows[0].id] }
      );
    } else {
      await insertRows('admin_settings', [
        {
          setting_key: key,
          setting_value: valueStr,
          category,
          updated_at: now,
        },
      ]);
    }

    invalidateCache('admin_bootstrap_bundle');
    realtimeHub.notifyTableChange('admin_settings', 'update');

    return NextResponse.json({ success: true, message: '설정이 성공적으로 저장되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
