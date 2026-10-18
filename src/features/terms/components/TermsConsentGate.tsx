"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import { TermsAgreement } from "@/features/auth/components/shared/TermsAgreement";
import { agreeTerms, getPendingTerms } from "@/features/terms/api";
import { canAgreeToTerms, needsTermsRefresh, selectedTermsIds, type Terms } from "@/features/terms/terms";
import { TermsQueryStatus } from "@/features/terms/components/TermsQueryStatus";
import { ApiError } from "@/lib/api/client";

function PendingAgreement({ terms, token, refresh, refreshing }: {
  terms: Terms[]; token: string; refresh: () => Promise<unknown>; refreshing: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: () => agreeTerms(selectedTermsIds(terms, selected), token),
    onSuccess: async () => { await refresh(); },
    onError: async (error) => {
      if (error instanceof ApiError && needsTermsRefresh(error.code)) {
        setSelected([]);
        // Preserve the original error while recovering the latest documents.
        await refresh().catch(() => undefined);
      }
    },
  });

  return (
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      if (!refreshing && !mutation.isPending && canAgreeToTerms(terms, selected)) mutation.mutate();
    }}>
      <p className="text-sm text-[var(--ink-muted)]">계속 이용하려면 아래 필수 약관의 최신 내용을 확인하고 동의해주세요.</p>
      <TermsAgreement terms={terms} value={selected} onChange={setSelected} disabled={refreshing || mutation.isPending} />
      {mutation.error ? <p role="alert" className="text-sm text-[var(--danger)]">{mutation.error.message}</p> : null}
      <Button type="submit" loading={mutation.isPending} disabled={refreshing || !canAgreeToTerms(terms, selected)}>동의하고 계속하기</Button>
    </form>
  );
}

export function TermsConsentGate({ children }: { children: ReactNode }) {
  const { accessToken, isReady } = useAuth();
  const signOut = useSignOut();
  const pending = useQuery({
    queryKey: ["terms", "pending", accessToken],
    queryFn: () => getPendingTerms(accessToken!),
    enabled: isReady && Boolean(accessToken),
    staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true,
  });

  if (!isReady || !accessToken) return children;
  if (pending.isSuccess && pending.data.length === 0) return children;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-5 py-12">
      <h1 className="text-2xl font-bold">필수 약관 확인</h1>
      <TermsQueryStatus pending={pending.isPending} error={pending.error} empty={false}
        fetching={pending.isFetching} onRetry={() => { void pending.refetch(); }} />
      {pending.isSuccess && pending.data.length > 0 ? (
        <PendingAgreement key={accessToken} terms={pending.data} token={accessToken}
          refreshing={pending.isFetching} refresh={() => pending.refetch({ throwOnError: true })} />
      ) : null}
      <Button variant="outline" loading={signOut.isPending} onClick={() => signOut.mutate()}>로그아웃</Button>
    </main>
  );
}
