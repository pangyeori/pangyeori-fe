"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyProfile } from "@/features/mypage/api/getMyProfile";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { ApiError } from "@/lib/api/client";

export function useMyProfile() {
  const { accessToken, isReady } = useAuth();

  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => {
      if (!accessToken) {
        throw new Error("로그인이 필요합니다.");
      }
      return getMyProfile(accessToken);
    },
    enabled: isReady && Boolean(accessToken),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 1,
  });
}
