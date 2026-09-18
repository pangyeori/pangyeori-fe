import { SiteHeader } from "@/components/layout/SiteChrome";

export default function DebateStartingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <section role="status" className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white px-8 py-14 text-center shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[var(--brand-blue)]">
            <svg className="h-8 w-8 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-[var(--ink)] sm:text-3xl">곧 토론이 시작됩니다</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
            상대방과 연결되었습니다. 토론 페이지로 자동 이동합니다.
          </p>
          <p className="mt-8 text-xs text-[var(--ink-faint)]">토론 페이지가 준비되면 자동으로 연결됩니다.</p>
        </section>
      </main>
    </div>
  );
}
