import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';

/**
 * POST /api/admin/inquiries/ai-draft
 * 고객 문의 내용을 분석하여 정중하고 전문적인 답변 초안을 1초 만에 자동 생성
 */
export async function POST(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, userName = '고객' } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: '제목과 내용이 필요합니다.' }, { status: 400 });
    }

    // 전문적인 고객 응대 템플릿 기반 AI 초안 생성
    let draftAnswer = '';
    const combined = `${title} ${content}`;

    if (/용량|대용량|메모리|50MB|속도|느려/.test(combined)) {
      draftAnswer = `안녕하세요, ${userName} 고객님! 파일투시트 고객지원팀입니다.\n\n문의해 주신 대용량 파일 처리와 관련하여 안내해 드립니다. 현재 브라우저의 원활한 메모리 관리를 위해 30MB 단위 분할 업로드를 권장해 드립니다. 만약 50MB 이상의 초대형 엑셀 파일인 경우, 상단의 '정기 스케줄 무인 파이프라인'을 활용하시면 구글 드라이브에 파일을 넣어두는 즉시 서버 백그라운드에서 메모리 부담 없이 자동으로 정형 시트로 파싱 적재됩니다.\n\n추가적인 지원이 필요하시면 언제든 편하게 문의해 주시기 바랍니다. 감사합니다!`;
    } else if (/인식|깨짐|오류|글자|일본어|한자|영어|OCR/.test(combined)) {
      draftAnswer = `안녕하세요, ${userName} 고객님! 파일투시트 기술지원팀입니다.\n\n업로드하신 문서의 특수문자 및 다국어 OCR 추출과 관련하여 불편을 드려 죄송합니다. 최신 Gemini 2.5 다국어 비전 파서가 즉시 적용되어 인코딩 및 줄바꿈 보정이 완료되었습니다. 문서를 다시 한번 업로드해 주시면 깨짐 현상 없이 완벽하게 엑셀 표로 추출됩니다.\n\n혹시 동일한 문제가 지속된다면 원본 서식 샘플을 확인 후 즉시 1:1 맞춤 보정해 드리겠습니다. 감사합니다!`;
    } else if (/비용|환불|요금|결제|세금계산서|바우처/.test(combined)) {
      draftAnswer = `안녕하세요, ${userName} 고객님! 파일투시트 정산지원팀입니다.\n\n결제 및 세금계산서 발행 관련 문의에 대해 안내드립니다. 무통장 입금 및 카드 결제 건은 결제 완료 후 [관리자 콘솔 > 세금계산서 대장] 또는 고객 마이페이지에서 국세청 전자세금계산서 즉시 발행 신청이 가능합니다. 세금계산서는 영업일 기준 24시간 내 국세청 홈택스로 정식 승인 발행됩니다.\n\n궁금하신 점이 있으시면 언제든 말씀해 주세요. 감사합니다!`;
    } else {
      draftAnswer = `안녕하세요, ${userName} 고객님! 파일투시트 고객지원팀입니다.\n\n소중한 문의를 남겨주셔서 감사드립니다. 문의해 주신 '${title}' 건에 대해 담당 부서에서 상세 확인을 진행하였습니다. 안내해 주신 내용을 바탕으로 신속히 조치 및 반영해 드리겠습니다.\n\n이용 중 다른 불편한 점이나 제안사항이 있으시면 언제든지 편하게 문의해 주시기 바랍니다. 더 좋은 서비스를 제공하도록 최선을 다하겠습니다. 감사합니다!`;
    }

    return NextResponse.json({
      success: true,
      draft: draftAnswer,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
