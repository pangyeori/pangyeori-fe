"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthProvider";
import { getMyDebates } from "@/features/debates/api/debates";
import { ApiError } from "@/lib/api/client";

export function useMyDebates() {
  const { accessToken, isReady } = useAuth();

  return useInfiniteQuery({
    queryKey: ["debates", "me"],
    queryFn: ({ pageParam }) => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      return getMyDebates(accessToken, pageParam);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasNext ? page.nextCursor ?? undefined : undefined,
    enabled: isReady && Boolean(accessToken),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 1,
  });
}
