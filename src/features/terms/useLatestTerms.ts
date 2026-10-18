"use client";

import { useQuery } from "@tanstack/react-query";
import { getLatestTerms } from "@/features/terms/api";

export function useLatestTerms(enabled = true) {
  return useQuery({
    queryKey: ["terms", "latest"], queryFn: getLatestTerms, enabled,
    staleTime: 0, retry: false, refetchOnWindowFocus: true,
  });
}
