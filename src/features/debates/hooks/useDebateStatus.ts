"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthProvider";
import { issueDebateStreamTicket, type DebateStatus } from "@/features/debates/api/debates";
import { applyStatusEvent } from "@/features/debates/statusEvents";
import { ApiError, apiClient, apiUrl } from "@/lib/api/client";

export type { GuestStatus } from "@/features/debates/api/debates";

export function useDebateStatus(debateId: string | null) {
  const { accessToken, isReady } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["debates", debateId, "status", accessToken],
    queryFn: () => {
      if (!debateId || !accessToken) throw new Error("토론방 정보를 확인할 수 없습니다.");
      return apiClient<DebateStatus>(
        `/api/v1/debates/${encodeURIComponent(debateId)}/status`,
        { token: accessToken },
      );
    },
    enabled: isReady && Boolean(debateId && accessToken),
    refetchInterval: (query) => {
      if (query.state.error instanceof ApiError && [401, 403, 404].includes(query.state.error.status)) return false;
      return !query.state.data || query.state.data.debateStatus === "WAITING" ? 3000 : false;
    },
    retry: (failureCount, error) =>
      !(error instanceof ApiError && [401, 403, 404].includes(error.status)) &&
      failureCount < 1,
  });

  useEffect(() => {
    if (!debateId || !accessToken || query.data?.debateStatus !== "WAITING") return;
    let closed = false;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const connect = async () => {
      try {
        const { ticket } = await issueDebateStreamTicket(debateId, accessToken);
        if (closed) return;
        source = new EventSource(apiUrl(`/api/v1/debates/${encodeURIComponent(debateId)}/status/stream?ticket=${encodeURIComponent(ticket)}`));
        for (const name of ["snapshot", "queue-changed", "guest-status-changed", "debate-status-changed"]) {
          source.addEventListener(name, (event) => {
            queryClient.setQueryData<DebateStatus>(["debates", debateId, "status", accessToken], (current) =>
              current ? applyStatusEvent(current, name, (event as MessageEvent).data) : current,
            );
          });
        }
        source.onerror = () => {
          source?.close();
          if (!closed) retry = setTimeout(connect, 3000);
        };
      } catch (error) {
        if (!closed && !(error instanceof ApiError && [401, 403, 404].includes(error.status))) retry = setTimeout(connect, 3000);
      }
    };
    void connect();
    return () => {
      closed = true;
      source?.close();
      if (retry) clearTimeout(retry);
    };
  }, [debateId, accessToken, query.data?.debateStatus, queryClient]);

  return query;
}
