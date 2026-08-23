export function ProfileSkeleton() {
  return (
    <section
      aria-label="회원 정보 불러오는 중"
      aria-busy="true"
      className="animate-pulse rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8"
    >
      <div className="h-5 w-20 rounded bg-[var(--line)]" />
      <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="size-28 shrink-0 rounded-full bg-[var(--line)] sm:size-32" />
        <div className="w-full flex-1">
          <div className="h-7 w-40 rounded bg-[var(--line)]" />
          <div className="mt-3 h-4 w-56 max-w-full rounded bg-[var(--line)]" />
          <div className="mt-6 h-4 w-28 rounded bg-[var(--line)]" />
        </div>
      </div>
    </section>
  );
}
