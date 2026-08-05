import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";

type AuthCenterLayoutProps = {
  children: ReactNode;
  headerRight?: ReactNode;
};

/** 비밀번호 찾기처럼 중앙 정렬 폼용 레이아웃 */
export function AuthCenterLayout({
  children,
  headerRight,
}: AuthCenterLayoutProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader rightSlot={headerRight} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="auth-enter rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_12px_40px_rgba(16,24,40,0.08)] sm:p-8">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
