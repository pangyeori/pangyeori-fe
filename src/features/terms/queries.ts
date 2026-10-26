import { queryOptions } from "@tanstack/react-query";

import { getPendingTerms } from "@/features/terms/api";

export function pendingTermsQueryOptions(accessToken: string) {
  return queryOptions({
    queryKey: ["terms", "pending", accessToken],
    queryFn: () => getPendingTerms(accessToken),
    // Let the consent gate reuse the result prepared during sign-in.
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: "always",
  });
}
