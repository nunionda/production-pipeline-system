import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "누니온다 — 영상 제작 프로덕션 관리",
  description: "기획부터 납품까지, 영상 제작 프로덕션 파이프라인 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
