"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { changeTermsAgreement } from "@/features/terms/api";
import { TermsDetails } from "@/features/terms/components/TermsDetails";
import { TermsQueryStatus } from "@/features/terms/components/TermsQueryStatus";
import { needsTermsRefresh, type Terms } from "@/features/terms/terms";
import { useLatestTerms } from "@/features/terms/useLatestTerms";
import { ApiError, apiClient } from "@/lib/api/client";

const agreementSchema = z.object({ marketingAgreed: z.boolean() });

function MarketingControl({ term, agreed, token, refresh, refreshTerms, refreshing }: {
  term: Terms; agreed: boolean; token: string; refresh: () => Promise<unknown>;
  refreshTerms: () => Promise<unknown>; refreshing: boolean;
}) {
  const mutation = useMutation({
    mutationFn: (next: boolean) => changeTermsAgreement(term.termsId, next, token),
    onSuccess: async () => { await refresh(); },
    onError: async (error) => {
      if (error instanceof ApiError && needsTermsRefresh(error.code)) await refreshTerms().catch(() => undefined);
    },
  });
  return (
    <div className="space-y-4">
      <p className="text-sm">현재 마케팅 정보 수신: <strong>{agreed ? "동의" : "미동의"}</strong></p>
      <TermsDetails term={term} />
      <p className="text-xs text-[var(--ink-muted)]">선택 동의이며 언제든 철회할 수 있습니다.</p>
      <Button variant="outline" disabled={refreshing} loading={mutation.isPending} onClick={() => mutation.mutate(!agreed)}>
        {agreed ? "마케팅 수신 동의 철회" : "마케팅 수신에 동의"}
      </Button>
      {mutation.error ? <p role="alert" className="text-sm text-[var(--danger)]">{mutation.error.message}</p> : null}
      {mutation.isSuccess ? <p role="status" className="text-sm">마케팅 수신 설정을 저장했습니다.</p> : null}
    </div>
  );
}

export function MarketingAgreement() {
  const { accessToken, isReady } = useAuth();
  const client = useQueryClient();
  const enabled = isReady && Boolean(accessToken);
  const terms = useLatestTerms(enabled);
  const state = useQuery({
    queryKey: ["terms", "marketing", accessToken], enabled,
    queryFn: async () => {
      const result = agreementSchema.safeParse(await apiClient<unknown>("/api/v1/users/me", { token: accessToken }));
      if (!result.success) throw new Error("마케팅 수신 설정을 확인하지 못했습니다. 다시 시도해주세요.");
      return result.data;
    },
    staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true,
  });
  const marketing = terms.data?.find((term) => term.type === "MARKETING");
  if (!enabled) return null;

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
      <h2 className="font-bold">마케팅 정보 수신 설정</h2>
      <TermsQueryStatus pending={terms.isPending || state.isPending} error={terms.error ?? state.error}
        empty={false} fetching={terms.isFetching || state.isFetching}
        onRetry={() => { void terms.refetch(); void state.refetch(); }} />
      {terms.isSuccess && state.isSuccess && (!marketing || marketing.required) ? (
        <p className="text-sm">현재 변경할 수 있는 선택 마케팅 약관이 없습니다.</p>
      ) : null}
      {terms.isSuccess && state.isSuccess && marketing && !marketing.required ? (
        <MarketingControl key={accessToken} term={marketing}
          token={accessToken!} agreed={state.data.marketingAgreed} refreshing={terms.isFetching || state.isFetching}
          refresh={async () => {
            await state.refetch({ throwOnError: true });
            await client.invalidateQueries({ queryKey: ["users", "me"] });
          }} refreshTerms={() => terms.refetch({ throwOnError: true })} />
      ) : null}
    </section>
  );
}
