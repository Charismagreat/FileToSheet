import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FileToSheet - 어떤 파일이든 업로드 즉시 엑셀 표로",
  description: "영수증, 전표 이미지, PDF, 엑셀, CSV 파일을 업로드 즉시 2차원 스프레드시트로 변환하는 FileToSheet SaaS",
  keywords: ["FileToSheet", "파일투시트", "영수증 OCR", "엑셀 변환", "스프레드시트 AI", "발주서 취합", "문서 자동화"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet",
    siteName: "FileToSheet (파일투시트)",
    title: "FileToSheet - 어떤 파일이든 업로드 즉시 엑셀 표로",
    description: "영수증, 전표 이미지, PDF, 엑셀, CSV 파일을 업로드 즉시 2차원 스프레드시트로 변환하는 FileToSheet SaaS",
    images: [
      {
        url: "https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet/images/og-filetosheet.png",
        width: 1200,
        height: 630,
        alt: "FileToSheet - 어떤 파일이든 업로드 즉시 엑셀 표로",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FileToSheet - 어떤 파일이든 업로드 즉시 엑셀 표로",
    description: "영수증, 전표 이미지, PDF, 엑셀, CSV 파일을 업로드 즉시 2차원 스프레드시트로 변환하는 FileToSheet SaaS",
    images: ["https://tunneling-service.onrender.com/t/mcp-server-fxkud1/p/FileToSheet/images/og-filetosheet.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
