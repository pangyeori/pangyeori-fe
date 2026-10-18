import { Button } from "@/components/ui/Button";

export function TermsQueryStatus({ pending, error, empty, onRetry, fetching }: {
  pending: boolean; error: Error | null; empty: boolean; onRetry: () => void; fetching: boolean;
}) {
  if (pending) return (
    <div role="status" className="animate-pulse rounded-xl bg-[var(--surface-muted)] p-5 text-sm">
      약관을 불러오고 있습니다.
    </div>
  );
  if (!error && !empty) return null;
  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] p-4 text-sm">
      <p role="alert">{error?.message ?? "현재 확인할 수 있는 약관이 없습니다. 잠시 후 다시 시도해주세요."}</p>
      <Button variant="outline" loading={fetching} onClick={onRetry}>약관 다시 불러오기</Button>
    </div>
  );
}
