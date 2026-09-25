"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthProvider";
import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/features/notifications/api/notifications";
import { ApiError } from "@/lib/api/client";

const retryUnlessUnauthorized = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && error.status === 401) && failureCount < 1;

export function useNotifications(enabled: boolean) {
  const { accessToken, isReady } = useAuth();

  return useInfiniteQuery({
    queryKey: ["notifications", "list", accessToken],
    queryFn: ({ pageParam }) => getNotifications(accessToken!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasNext ? page.nextCursor ?? undefined : undefined,
    enabled: enabled && isReady && Boolean(accessToken),
    retry: retryUnlessUnauthorized,
  });
}

export function useUnreadNotificationCount() {
  const { accessToken, isReady } = useAuth();

  return useQuery({
    queryKey: ["notifications", "unread-count", accessToken],
    queryFn: () => getUnreadNotificationCount(accessToken!),
    enabled: isReady && Boolean(accessToken),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    retry: retryUnlessUnauthorized,
  });
}
