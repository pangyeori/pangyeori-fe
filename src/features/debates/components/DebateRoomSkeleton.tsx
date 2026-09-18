import { SiteHeader } from "@/components/layout/SiteChrome";

export function DebateRoomSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader />
      <main
        aria-label="토론방 정보를 불러오는 중"
        aria-busy="true"
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16"
      >
        <div className="motion-safe:animate-pulse">
          <div className="mx-auto h-9 w-64 max-w-full rounded-lg bg-slate-200" />
          <div className="mx-auto mt-4 h-4 w-80 max-w-full rounded bg-slate-100" />
          <div className="mt-12 grid items-start gap-6 lg:grid-cols-[270px_1fr]">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
              <div className="h-5 w-24 rounded bg-slate-200" />
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 rounded bg-slate-200" />
                      <div className="h-3 w-36 max-w-full rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              <div className="border-b border-[var(--line)] p-6 sm:p-8">
                <div className="h-5 w-28 rounded-full bg-slate-100" />
                <div className="mt-5 h-7 w-3/4 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
              </div>
              <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
                <div className="h-32 rounded-2xl bg-slate-100" />
                <div className="h-32 rounded-2xl bg-slate-100" />
                <div className="mt-4 h-12 rounded-xl bg-slate-200 sm:col-span-2" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
