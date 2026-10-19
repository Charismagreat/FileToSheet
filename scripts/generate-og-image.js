const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const width = 1200;
const height = 630;

function createSvg({ title, headline1, headline2, subtitle, badgeText }) {
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 배경 그라데이션 -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080e1e" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#070c18" />
    </linearGradient>

    <!-- 앰비언트 글로우 -->
    <radialGradient id="glowBlue" cx="15%" cy="25%" r="50%">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.38" />
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowCyan" cx="85%" cy="30%" r="55%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowTeal" cx="50%" cy="92%" r="50%">
      <stop offset="0%" stop-color="#059669" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#059669" stop-opacity="0" />
    </radialGradient>

    <!-- 메인 카드 배경 -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
    </linearGradient>

    <!-- 로고 그라데이션 -->
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>

    <!-- 카드 테두리 그라데이션 -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.4" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.3" />
    </linearGradient>
  </defs>

  <!-- 1. 배경 베이스 -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- 2. 부드러운 앰비언트 라이트 -->
  <circle cx="200" cy="180" r="380" fill="url(#glowBlue)" />
  <circle cx="980" cy="220" r="420" fill="url(#glowCyan)" />
  <circle cx="600" cy="580" r="340" fill="url(#glowTeal)" />

  <!-- 3. 은은한 스프레드시트 격자 그리드 패턴 -->
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="85" x2="${width}" y2="85" />
    <line x1="0" y1="170" x2="${width}" y2="170" />
    <line x1="0" y1="255" x2="${width}" y2="255" />
    <line x1="0" y1="340" x2="${width}" y2="340" />
    <line x1="0" y1="425" x2="${width}" y2="425" />
    <line x1="0" y1="510" x2="${width}" y2="510" />
    <line x1="120" y1="0" x2="120" y2="${height}" />
    <line x1="240" y1="0" x2="240" y2="${height}" />
    <line x1="360" y1="0" x2="360" y2="${height}" />
    <line x1="480" y1="0" x2="480" y2="${height}" />
    <line x1="600" y1="0" x2="600" y2="${height}" />
    <line x1="720" y1="0" x2="720" y2="${height}" />
    <line x1="840" y1="0" x2="840" y2="${height}" />
    <line x1="960" y1="0" x2="960" y2="${height}" />
    <line x1="1080" y1="0" x2="1080" y2="${height}" />
  </g>

  <!-- 4. 메인 컨테이너 프레임 -->
  <rect x="55" y="48" width="1090" height="534" rx="28" fill="url(#cardGrad)" stroke="url(#borderGrad)" stroke-width="1.5" />

  <!-- 5. 상단 뱃지 섹션 -->
  <g transform="translate(95, 90)">
    <rect width="360" height="38" rx="19" fill="#2563eb" fill-opacity="0.18" stroke="#38bdf8" stroke-opacity="0.4" stroke-width="1.2" />
    <text x="180" y="24" text-anchor="middle" font-family="'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" font-size="14" font-weight="700" fill="#38bdf8">
      ${badgeText}
    </text>
  </g>

  <g transform="translate(915, 90)">
    <rect width="190" height="38" rx="19" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1" />
    <text x="95" y="24" text-anchor="middle" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="600" fill="#cbd5e1">
      ⚡ 실무 활용사례 100선
    </text>
  </g>

  <!-- 6. 브랜드 로고 & 타이틀 -->
  <g transform="translate(95, 155)">
    <!-- 3D 느낌의 FileToSheet 브랜드 로고 스퀘어 -->
    <rect width="82" height="82" rx="22" fill="url(#logoGrad)" />
    
    <!-- 스프레드시트 격자 & 화살표 변환 심볼 -->
    <g transform="translate(18, 18)" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <!-- 서류/파일 외곽선 -->
      <path d="M4 4h26c2.2 0 4 1.8 4 4v28c0 2.2-1.8 4-4 4H4c-2.2 0-4-1.8-4-4V8c0-2.2 1.8-4 4-4z" stroke="rgba(255,255,255,0.7)" />
      <!-- 내부 시트 격자 -->
      <line x1="0" y1="14" x2="34" y2="14" stroke="#ffffff" />
      <line x1="0" y1="24" x2="34" y2="24" stroke="#ffffff" />
      <line x1="12" y1="4" x2="12" y2="40" stroke="#ffffff" />
      <line x1="23" y1="4" x2="23" y2="40" stroke="#ffffff" />
      <!-- 하이라이트 셀 -->
      <rect x="13.5" y="15.5" width="8" height="7" fill="#38bdf8" stroke="none" />
      <!-- 반짝임 스파클 -->
      <polygon points="38,2 41,7 46,7 42,11 44,16 38,13 32,16 34,11 30,7 35,7" fill="#fbbf24" stroke="none" />
    </g>

    <!-- 브랜드 텍스트 -->
    <text x="104" y="44" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="-0.5">FileToSheet</text>
    <text x="312" y="44" font-family="'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="24" font-weight="800" fill="#38bdf8">파일투시트</text>
    <text x="104" y="73" font-family="'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="15" font-weight="500" fill="#94a3b8">어떤 파일이든 드래그 한 번으로 완벽한 엑셀 스프레드시트 완성</text>
  </g>

  <!-- 7. 메인 헤드라인 텍스트 -->
  <text x="95" y="298" font-family="'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="-1.2">
    ${headline1}
  </text>
  <text x="95" y="348" font-family="'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" font-size="44" font-weight="900" fill="#38bdf8" letter-spacing="-1.2">
    ${headline2}
  </text>

  <!-- 8. 서브 카피 -->
  <text x="95" y="394" font-family="'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" font-size="18" font-weight="500" fill="#cbd5e1" letter-spacing="-0.3">
    ${subtitle}
  </text>

  <!-- 9. 4대 실무 활용사례 피처 카드 그리드 -->
  <g transform="translate(95, 428)">
    <!-- 카드 1: 영수증/경비 -->
    <g transform="translate(0, 0)">
      <rect width="242" height="122" rx="16" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.2" />
      <rect x="20" y="20" width="8" height="8" rx="2" fill="#34d399" />
      <text x="36" y="28" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="800" fill="#34d399">회계 · 세무 · 경리</text>
      <text x="20" y="62" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="18" font-weight="800" fill="#ffffff">영수증 100장 10초</text>
      <text x="20" y="90" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="500" fill="#94a3b8">월말 경비 전표 자동 장부화</text>
    </g>

    <!-- 카드 2: 물류/발주서 -->
    <g transform="translate(262, 0)">
      <rect width="242" height="122" rx="16" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.2" />
      <rect x="20" y="20" width="8" height="8" rx="2" fill="#38bdf8" />
      <text x="36" y="28" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="800" fill="#38bdf8">이커머스 · 물류 · 유통</text>
      <text x="20" y="62" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="18" font-weight="800" fill="#ffffff">제각각 발주서 취합</text>
      <text x="20" y="90" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="500" fill="#94a3b8">거래명세서 단일 규격 통합</text>
    </g>

    <!-- 카드 3: 건설/원가 견적서 -->
    <g transform="translate(524, 0)">
      <rect width="242" height="122" rx="16" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.2" />
      <rect x="20" y="20" width="8" height="8" rx="2" fill="#fbbf24" />
      <text x="36" y="28" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="800" fill="#fbbf24">건설 · 시공 · 원가</text>
      <text x="20" y="62" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="18" font-weight="800" fill="#ffffff">다단 견적서 원가 분해</text>
      <text x="20" y="90" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="500" fill="#94a3b8">자재비·노무비 즉시 산출</text>
    </g>

    <!-- 카드 4: AI 스마트 라우팅 -->
    <g transform="translate(786, 0)">
      <rect width="242" height="122" rx="16" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.2" />
      <rect x="20" y="20" width="8" height="8" rx="2" fill="#a78bfa" />
      <text x="36" y="28" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="800" fill="#a78bfa">금융 · 법무 · 스마트 라우팅</text>
      <text x="20" y="62" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="18" font-weight="800" fill="#ffffff">거래내역·계약서 DB화</text>
      <text x="20" y="90" font-family="'Pretendard', 'Malgun Gothic', sans-serif" font-size="13" font-weight="500" fill="#94a3b8">문서 자동 분류 및 시트 적재</text>
    </g>
  </g>
</svg>
`;
}

async function run() {
  const imagesDir = path.join(__dirname, '..', 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // 1. og-use-cases.png (활용사례 전용 썸네일)
  const useCasesSvg = createSvg({
    badgeText: '✨ AI 문서 데이터화 · 엑셀 자동 변환',
    headline1: '영수증 · 발주서 · 견적서 PDF 문서를',
    headline2: '완벽한 엑셀 스프레드시트로 즉시 변환',
    subtitle: '수기 타이핑과 야근 없이, 파일만 드래그하면 2차원 표로 정규화 완성!',
  });

  const useCasesPath = path.join(imagesDir, 'og-use-cases.png');
  await sharp(Buffer.from(useCasesSvg))
    .png({ quality: 95 })
    .toFile(useCasesPath);
  console.log('✅ Created:', useCasesPath);

  // 2. og-filetosheet.png (전체 서비스 기본 썸네일)
  const defaultSvg = createSvg({
    badgeText: '✨ 어떤 파일이든 업로드 즉시 엑셀 표로',
    headline1: '복잡한 문서와 이미지를 던지면',
    headline2: '정밀한 엑셀 시트로 실시간 생성',
    subtitle: 'PDF, 영수증, 발주서, 거래내역서까지 AI 스마트 라우터가 완벽 정리',
  });

  const defaultPath = path.join(imagesDir, 'og-filetosheet.png');
  await sharp(Buffer.from(defaultSvg))
    .png({ quality: 95 })
    .toFile(defaultPath);
  console.log('✅ Created:', defaultPath);
}

run().catch(err => {
  console.error('❌ Error generating OG image:', err);
  process.exit(1);
});
