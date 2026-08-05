import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";

type AuthLayoutProps = {
  children: ReactNode;
  headerRight?: ReactNode;
  heroTitle: ReactNode;
  heroDescription: string;
};

export function AuthLayout({
  children,
  headerRight,
  heroTitle,
  heroDescription,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader rightSlot={headerRight} />

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center px-5 py-10 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-14">
        <section className="auth-enter hidden lg:block">
          <h1 className="text-3xl font-bold leading-snug tracking-tight text-[var(--ink)] sm:text-4xl">
            {heroTitle}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {heroDescription}
          </p>
          <div
            className="mt-8 aspect-[4/3] w-full max-w-lg overflow-hidden rounded-xl border border-[var(--line)]"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#d9d9d9 0% 25%, #fff 0% 50%)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
        </section>

        <section className="auth-enter auth-enter-delay w-full">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_12px_40px_rgba(16,24,40,0.08)] sm:p-8">
            {children}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
