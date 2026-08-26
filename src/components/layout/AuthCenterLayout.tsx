import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";

type AuthCenterLayoutProps = {
  children: ReactNode;
  headerRight?: ReactNode;
  variant?: "default" | "modern";
};

/** 비밀번호 찾기처럼 중앙 정렬 폼용 레이아웃 */
export function AuthCenterLayout({
  children,
  headerRight,
  variant = "default",
}: AuthCenterLayoutProps) {
  const isModern = variant === "modern";

  return (
    <div
      className={`flex min-h-full flex-1 flex-col ${
        isModern
          ? "bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_30%),var(--page-bg)]"
          : "bg-[var(--page-bg)]"
      }`}
    >
      <SiteHeader rightSlot={headerRight} />
      <main
        className={`mx-auto flex w-full flex-1 flex-col justify-center px-5 py-12 ${
          isModern ? "max-w-lg sm:py-16" : "max-w-md"
        }`}
      >
        <div
          className={`auth-enter ${
            isModern
              ? "rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-9"
              : "rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_12px_40px_rgba(16,24,40,0.08)] sm:p-8"
          }`}
        >
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
