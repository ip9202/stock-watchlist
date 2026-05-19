import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { initializeEnv } from "@/lib/env";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/auth/SessionProvider";

// Validate environment variables at startup
initializeEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Watchlist - 관심종목 모니터링",
  description: "내 관심종목들의 주가, 뉴스, 커뮤니티 반응을 한번에 확인하세요",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 서버에서 세션을 가져와 클라이언트 Provider에 초기값으로 전달
  const session = await auth();

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
