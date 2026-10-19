import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FileToSheet 실무 활용사례 100선 | 영수증·발주서·견적서 엑셀 즉시 변환',
  description: '영수증 100장 10초 장부화, 제각각 발주서 단일 규격 통합, 다단 공사 견적서 원가 분해까지! 6대 직무별 FileToSheet AI 실무 활용사례를 확인하세요.',
  keywords: [
    'FileToSheet',
    '파일투시트',
    '영수증 OCR',
    '엑셀 변환',
    '발주서 취합',
    '공사 견적서 원가',
    '스프레드시트 자동화',
    'PDF 엑셀 변환',
  ],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet/use-cases',
    siteName: 'FileToSheet (파일투시트)',
    title: 'FileToSheet 실무 활용사례 100선 | 어떤 파일이든 즉시 엑셀 표로',
    description: '영수증 100장 10초 장부화, 제각각 발주서 단일 규격 통합, 다단 견적서 원가 분해! 6대 직무별 실무 활용사례를 확인하세요.',
    images: [
      {
        url: 'https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet/images/og-use-cases.png',
        width: 1200,
        height: 630,
        alt: 'FileToSheet 실무 활용사례 - 영수증·발주서·견적서 엑셀 즉시 변환',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FileToSheet 실무 활용사례 100선 | 어떤 파일이든 즉시 엑셀 표로',
    description: '영수증 100장 10초 장부화, 제각각 발주서 단일 규격 통합, 다단 견적서 원가 분해! 6대 직무별 실무 활용사례를 확인하세요.',
    images: ['https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet/images/og-use-cases.png'],
  },
};

export default function UseCasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
