import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit } from "next/font/google";

import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { AppQueryProvider } from "@/lib/query/provider";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "판겨리",
  description: "AI가 판정하는 1:1 토론, 판겨리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${outfit.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-[family-name:var(--font-sans-kr)]">
        <AppQueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
