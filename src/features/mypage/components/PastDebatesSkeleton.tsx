const DEBATE_SKELETON_COUNT = 3;

export function PastDebatesSkeleton() {
  return (
    <section
      aria-label="지난 토론 기능 준비 중"
      className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
        <h2 className="text-base font-bold text-[var(--ink)]">지난 토론</h2>
        <span className="text-xs font-medium text-[var(--ink-faint)]">
          API 연동 예정
        </span>
      </div>

      <div className="mt-5 space-y-3" aria-hidden="true">
        {Array.from({ length: DEBATE_SKELETON_COUNT }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl bg-[var(--surface-muted)] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="h-5 w-36 max-w-full rounded bg-[var(--line)]" />
              <div className="mt-3 h-3 w-64 max-w-full rounded bg-[var(--line)]" />
            </div>
            <div className="mt-4 h-9 w-24 rounded-lg bg-[var(--line)] sm:mt-0" />
          </div>
        ))}
      </div>
    </section>
  );
}
