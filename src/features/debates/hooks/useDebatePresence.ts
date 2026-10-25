"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";

import { useAuth } from "@/features/auth/context/AuthProvider";
import { getDebateEarlyEndStatus, getDebatePresence, type DebateFreeMessage, type DebateRole } from "@/features/debates/api/debates";
import { freeMessageError, mergeFreeMessages } from "@/features/debates/freeDebateMessages";
import { parseServerTime } from "@/features/debates/debateProgress";
import {
  applyDebateConnectionEvent,
  applyDebateEarlyEndEvent,
  applyDebatePresenceSnapshot,
  confirmDebateDeparture,
  initialDebateEarlyEnd,
  initialDebatePresence,
  isDebateEarlyEndEvent,
  isDebateProgressEvent,
  parseDebateConnectionEvent,
  type DebateEarlyEndAction,
  type DebateConnectionEvent,
} from "@/features/debates/presenceEvents";
import { websocketUrl } from "@/lib/api/client";

export type DebateConnectionStatus = "connecting" | "connected" | "reconnecting" | "error";

const RECONNECT_GRACE_MS = 10_000;
const earlyEndResult: Record<DebateEarlyEndAction, DebateConnectionEvent["type"]> = {
  propose: "EARLY_END_PROPOSED",
  accept: "EARLY_END_ACCEPTED",
  decline: "EARLY_END_DECLINED",
  cancel: "EARLY_END_CANCELLED",
};

export function useDebatePresence(debateId: string, enabled: boolean) {
  const { accessToken } = useAuth();
  const [presence, setPresence] = useState(initialDebatePresence);
  const [connectionStatus, setConnectionStatus] = useState<DebateConnectionStatus>("connecting");
  const [connectedAt, setConnectedAt] = useState(0);
  const [latestProgressEvent, setLatestProgressEvent] = useState<DebateConnectionEvent | null>(null);
  const [latestEarlyEndEvent, setLatestEarlyEndEvent] = useState<DebateConnectionEvent | null>(null);
  const [freeMessages, setFreeMessages] = useState<DebateFreeMessage[]>([]);
  const [earlyEnd, setEarlyEnd] = useState(initialDebateEarlyEnd);
  const clientRef = useRef<Client | null>(null);
  const earlyEndRevision = useRef(0);
  const pendingMessage = useRef<{
    content: string;
    role: DebateRole;
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const pendingEarlyEnd = useRef<{
    expectedType: DebateConnectionEvent["type"];
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const settleMessage = useCallback((error?: string) => {
    const pending = pendingMessage.current;
    if (!pending) return;
    pendingMessage.current = null;
    clearTimeout(pending.timer);
    if (error) pending.reject(new Error(error));
    else pending.resolve();
  }, []);

  const settleEarlyEnd = useCallback((error?: string) => {
    const pending = pendingEarlyEnd.current;
    if (!pending) return;
    pendingEarlyEnd.current = null;
    clearTimeout(pending.timer);
    if (error) pending.reject(new Error(error));
    else pending.resolve();
  }, []);

  const sendFreeMessage = useCallback((content: string, role: DebateRole) => new Promise<void>((resolve, reject) => {
    const client = clientRef.current;
    if (!client?.connected) return reject(new Error("채팅 연결을 확인한 뒤 다시 시도해주세요."));
    if (pendingMessage.current) return reject(new Error("이전 메시지를 전송하고 있습니다."));
    if (pendingEarlyEnd.current) return reject(new Error("조기 종료 요청을 처리하고 있습니다."));
    pendingMessage.current = {
      content, role, resolve, reject,
      timer: setTimeout(() => settleMessage("전송 결과를 확인하지 못했습니다. 대화 내역을 확인한 뒤 다시 시도해주세요."), 10_000),
    };
    try {
      client.publish({
        destination: `/pub/debates/${debateId}/free-messages`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch {
      settleMessage("메시지를 전송하지 못했습니다. 연결을 확인한 뒤 다시 시도해주세요.");
    }
  }), [debateId, settleMessage]);

  const sendEarlyEndAction = useCallback((action: DebateEarlyEndAction) => new Promise<void>((resolve, reject) => {
    const client = clientRef.current;
    if (!client?.connected) return reject(new Error("토론방 연결을 확인한 뒤 다시 시도해주세요."));
    if (pendingMessage.current || pendingEarlyEnd.current) return reject(new Error("이전 요청을 처리하고 있습니다."));
    pendingEarlyEnd.current = {
      expectedType: earlyEndResult[action],
      resolve,
      reject,
      timer: setTimeout(() => settleEarlyEnd("처리 결과를 확인하지 못했습니다. 조기 종료 상태를 다시 확인해주세요."), 10_000),
    };
    try {
      client.publish({ destination: `/pub/debates/${debateId}/early-end/${action}`, body: "" });
    } catch {
      settleEarlyEnd("요청을 전송하지 못했습니다. 연결을 확인한 뒤 다시 시도해주세요.");
    }
  }), [debateId, settleEarlyEnd]);

  const refreshEarlyEnd = useCallback(async () => {
    if (!accessToken || !enabled) return;
    const requestedRevision = earlyEndRevision.current;
    const snapshot = await getDebateEarlyEndStatus(debateId, accessToken);
    if (earlyEndRevision.current === requestedRevision) setEarlyEnd(snapshot);
  }, [accessToken, debateId, enabled]);

  useEffect(() => {
    if (!earlyEnd.pending || !earlyEnd.expiresAt) return;
    const expiresAt = parseServerTime(earlyEnd.expiresAt);
    if (!Number.isFinite(expiresAt)) return;
    const timer = setTimeout(() => void refreshEarlyEnd().catch(() => {}), Math.max(0, expiresAt - Date.now()) + 300);
    return () => clearTimeout(timer);
  }, [earlyEnd.expiresAt, earlyEnd.pending, refreshEarlyEnd]);

  useEffect(() => {
    if (!accessToken || !enabled) return;

    let active = true;
    let connectionRevision = 0;
    const roleVersions: Record<DebateRole, number> = { HOST: 0, GUEST: 0 };
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
    clientRef.current = client;

    client.onConnect = () => {
      if (!active) return;
      const currentConnectionRevision = ++connectionRevision;
      setConnectionStatus("connected");
      setConnectedAt(Date.now());
      client.subscribe("/user/queue/errors", ({ body }) => {
        if (!active) return;
        const error = freeMessageError(body);
        if (pendingEarlyEnd.current) settleEarlyEnd(error);
        else settleMessage(error);
      });
      client.subscribe(`/sub/debates/${debateId}`, ({ body }) => {
        if (!active) return;
        const event = parseDebateConnectionEvent(body, debateId);
        if (!event) return;

        if (isDebateEarlyEndEvent(event)) {
          earlyEndRevision.current += 1;
          setLatestEarlyEndEvent(event);
          setEarlyEnd((current) => applyDebateEarlyEndEvent(current, event));
          if (pendingEarlyEnd.current?.expectedType === event.type) settleEarlyEnd();
          return;
        }

        if (event.type === "FREE_MESSAGE_SENT") {
          const message: DebateFreeMessage = {
            id: event.messageId!, role: event.role!, content: event.content!, createdAt: event.submittedAt!,
          };
          // Merge inside the socket callback so batched React renders never drop messages.
          setFreeMessages((current) => mergeFreeMessages(current, [message]));
          if (pendingMessage.current?.role === message.role && pendingMessage.current.content === message.content) settleMessage();
          return;
        }

        if (isDebateProgressEvent(event)) {
          setLatestProgressEvent(event);
          return;
        }

        if (event.type === "STARTED") {
          roleVersions.HOST += 1;
          roleVersions.GUEST += 1;
        } else if (event.role) {
          roleVersions[event.role] += 1;
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

      const requestedRoleVersions = { ...roleVersions };
      void getDebatePresence(debateId, accessToken).then((snapshot) => {
        if (!active || connectionRevision !== currentConnectionRevision) return;
        const unchangedRoles = (["HOST", "GUEST"] as DebateRole[])
          .filter((role) => roleVersions[role] === requestedRoleVersions[role]);
        if (unchangedRoles.length > 0) {
          setPresence((current) => applyDebatePresenceSnapshot(current, snapshot, unchangedRoles));
        }
      }).catch(() => {
        // WebSocket events keep presence usable when snapshot recovery fails.
      });
      void refreshEarlyEnd().catch(() => {
        // WebSocket events keep the proposal usable when snapshot recovery fails.
      });
    };
    client.onStompError = ({ body }) => {
      if (!active) return;
      const error = freeMessageError(body);
      if (pendingEarlyEnd.current) settleEarlyEnd(error);
      else settleMessage(error);
      setConnectionStatus("error");
    };
    client.onWebSocketError = () => active && setConnectionStatus("error");
    client.onWebSocketClose = () => {
      if (!active) return;
      settleMessage("연결이 끊겨 전송 결과를 확인하지 못했습니다. 재연결 후 대화 내역을 확인해주세요.");
      settleEarlyEnd("연결이 끊겨 처리 결과를 확인하지 못했습니다. 재연결 후 상태를 확인해주세요.");
      connectionRevision += 1;
      clearLeaveTimers();
      setPresence(initialDebatePresence);
      setConnectionStatus("reconnecting");
    };

    client.activate();
    return () => {
      active = false;
      clientRef.current = null;
      settleMessage("채팅 연결이 종료되었습니다.");
      settleEarlyEnd("토론방 연결이 종료되었습니다.");
      clearLeaveTimers();
      void client.deactivate();
    };
  }, [accessToken, debateId, enabled, refreshEarlyEnd, settleEarlyEnd, settleMessage]);

  return {
    ...presence,
    connectionStatus,
    connectedAt,
    latestProgressEvent,
    latestEarlyEndEvent,
    freeMessages,
    earlyEnd,
    sendFreeMessage,
    sendEarlyEndAction,
    refreshEarlyEnd,
  };
}
