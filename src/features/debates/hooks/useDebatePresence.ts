"use client";

import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";

import { useAuth } from "@/features/auth/context/AuthProvider";
import type { DebateRole } from "@/features/debates/api/debates";
import {
  applyDebateConnectionEvent,
  confirmDebateDeparture,
  initialDebatePresence,
  isDebateProgressEvent,
  parseDebateConnectionEvent,
  type DebateConnectionEvent,
} from "@/features/debates/presenceEvents";
import { websocketUrl } from "@/lib/api/client";

export type DebateConnectionStatus = "connecting" | "connected" | "reconnecting" | "error";

const RECONNECT_GRACE_MS = 10_000;

export function useDebatePresence(debateId: string, enabled: boolean) {
  const { accessToken } = useAuth();
  const [presence, setPresence] = useState(initialDebatePresence);
  const [connectionStatus, setConnectionStatus] = useState<DebateConnectionStatus>("connecting");
  const [connectedAt, setConnectedAt] = useState(0);
  const [latestProgressEvent, setLatestProgressEvent] = useState<DebateConnectionEvent | null>(null);

  useEffect(() => {
    if (!accessToken || !enabled) return;

    let active = true;
    const leaveTimers: Partial<Record<DebateRole, ReturnType<typeof setTimeout>>> = {};
    const clearLeaveTimer = (role: DebateRole) => {
      if (leaveTimers[role]) clearTimeout(leaveTimers[role]);
      delete leaveTimers[role];
    };
    const clearLeaveTimers = () => {
      clearLeaveTimer("HOST");
      clearLeaveTimer("GUEST");
    };

    const client = new Client({
      brokerURL: websocketUrl("/ws"),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 3000,
      debug: () => {},
    });

    client.onConnect = () => {
      if (!active) return;
      setConnectionStatus("connected");
      setConnectedAt(Date.now());
      client.subscribe(`/sub/debates/${debateId}`, ({ body }) => {
        const event = parseDebateConnectionEvent(body, debateId);
        if (!event) return;

        if (isDebateProgressEvent(event)) {
          setLatestProgressEvent(event);
          return;
        }

        if (event.type === "LEFT" && event.role) {
          const role = event.role;
          clearLeaveTimer(role);
          setPresence((current) => applyDebateConnectionEvent(current, event));
          leaveTimers[role] = setTimeout(() => {
            delete leaveTimers[role];
            if (active) setPresence((current) => confirmDebateDeparture(current, role));
          }, RECONNECT_GRACE_MS);
          return;
        }

        if (event.type === "STARTED") clearLeaveTimers();
        else if (event.role) clearLeaveTimer(event.role);
        setPresence((current) => applyDebateConnectionEvent(current, event));
      });
    };
    client.onStompError = () => active && setConnectionStatus("error");
    client.onWebSocketError = () => active && setConnectionStatus("error");
    client.onWebSocketClose = () => {
      if (!active) return;
      clearLeaveTimers();
      setPresence(initialDebatePresence);
      setConnectionStatus("reconnecting");
    };

    client.activate();
    return () => {
      active = false;
      clearLeaveTimers();
      void client.deactivate();
    };
  }, [accessToken, debateId, enabled]);

  return { ...presence, connectionStatus, connectedAt, latestProgressEvent };
}
