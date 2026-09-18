import { SiteHeader } from "@/components/layout/SiteChrome";

export default function DebateStartingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <div role="status" className="text-center">
          <h1 className="text-3xl font-bold text-[var(--ink)]">곧 토론이 시작됩니다</h1>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">상대방과 연결되었습니다. 토론 페이지로 자동 이동합니다.</p>
        </div>
        <div aria-hidden="true" className="mt-10 grid gap-6 motion-safe:animate-pulse lg:grid-cols-[250px_1fr_200px]">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <div className="h-5 w-28 rounded bg-slate-200" />
            <div className="mt-6 space-y-3">
              {[1, 2, 3, 4].map((step) => <div key={step} className="h-16 rounded-xl bg-slate-100" />)}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
            <div className="border-b border-[var(--line)] p-6">
              <div className="h-6 w-3/4 rounded bg-slate-200" />
              <div className="mt-4 h-3 w-full rounded bg-slate-100" />
            </div>
            <div className="space-y-6 p-6">
              <div className="h-24 w-4/5 rounded-2xl bg-slate-100" />
              <div className="ml-auto h-24 w-4/5 rounded-2xl bg-slate-200" />
              <div className="h-24 w-4/5 rounded-2xl bg-slate-100" />
            </div>
            <div className="border-t border-[var(--line)] p-6"><div className="h-12 rounded-xl bg-slate-100" /></div>
          </div>
          <div className="space-y-4">
            {[1, 2].map((card) => (
              <div key={card} className="rounded-2xl border border-[var(--line)] bg-white p-5">
                <div className="h-5 w-24 rounded bg-slate-200" />
                <div className="mt-5 h-14 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
