import type { DebateHistories, DebateHistory, DebatePresenceSnapshot, DebateRole, DebateStage, DebateVerdictStatus, WinnerPosition } from "@/features/debates/api/debates";

const debateStages: DebateStage[] = [
  "NONE",
  "OPENING_PROS",
  "OPENING_CONS",
  "VERDICT_1",
  "REBUTTAL_PROS",
  "REBUTTAL_CONS",
  "VERDICT_2",
  "FREE",
  "FINAL_VERDICT",
];

export type DebateConnectionEventType =
  | "ENTERED"
  | "LEFT"
  | "STARTED"
  | "STAGE_CHANGED"
  | "STATEMENT_SUBMITTED"
  | "STATEMENT_TIMED_OUT"
  | "VERDICT_ISSUED";

export type DebateConnectionEvent = {
  debateId: string;
  type: DebateConnectionEventType;
  role: DebateRole | null;
  stage?: DebateStage | null;
  content?: string | null;
  turnEndsAt?: string | null;
  submittedAt?: string | null;
  verdictStatus?: DebateVerdictStatus | null;
  winnerPosition?: WinnerPosition | null;
  reasoning?: string | null;
};

export type PresenceStatus = "unknown" | "entered" | "reconnecting" | "left";

export type DebatePresence = {
  roles: Record<DebateRole, PresenceStatus>;
  started: boolean;
  message: string;
};

export const initialDebatePresence: DebatePresence = {
  roles: { HOST: "unknown", GUEST: "unknown" },
  started: false,
  message: "참여자 입장을 기다리고 있습니다.",
};

export function applyDebatePresenceSnapshot(
  current: DebatePresence,
  snapshot: DebatePresenceSnapshot,
  roles: DebateRole[] = ["HOST", "GUEST"],
): DebatePresence {
  const nextRoles = { ...current.roles };
  if (roles.includes("HOST")) nextRoles.HOST = snapshot.hostConnected ? "entered" : "left";
  if (roles.includes("GUEST")) nextRoles.GUEST = snapshot.guestConnected ? "entered" : "left";
  return {
    ...current,
    roles: nextRoles,
    message: "현재 접속 상태를 확인했습니다.",
  };
}

export function parseDebateConnectionEvent(raw: string, debateId: string): DebateConnectionEvent | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const type = String(value.type) as DebateConnectionEventType;
    if (value.debateId !== debateId || ![
      "ENTERED",
      "LEFT",
      "STARTED",
      "STAGE_CHANGED",
      "STATEMENT_SUBMITTED",
      "STATEMENT_TIMED_OUT",
      "VERDICT_ISSUED",
    ].includes(type)) return null;
    if (["ENTERED", "LEFT", "STATEMENT_SUBMITTED", "STATEMENT_TIMED_OUT"].includes(type)
      && value.role !== "HOST" && value.role !== "GUEST") return null;
    if (["STAGE_CHANGED", "STATEMENT_SUBMITTED", "STATEMENT_TIMED_OUT", "VERDICT_ISSUED"].includes(type)
      && !debateStages.includes(value.stage as DebateStage)) return null;
    if (type === "VERDICT_ISSUED") {
      if (!["VERDICT_1", "VERDICT_2", "FINAL_VERDICT"].includes(String(value.stage))) return null;
      if (value.verdictStatus !== "SUCCESS" && value.verdictStatus !== "FAILED") return null;
      if (value.verdictStatus === "SUCCESS"
        && (!["PROS", "CONS", "DRAW"].includes(String(value.winnerPosition)) || typeof value.reasoning !== "string")) return null;
      if (value.verdictStatus === "FAILED"
        && (value.winnerPosition != null || value.reasoning != null)) return null;
    }
    if (type === "STATEMENT_SUBMITTED" && typeof value.content !== "string") return null;
    if (["STATEMENT_SUBMITTED", "STATEMENT_TIMED_OUT"].includes(type)
      && (typeof value.submittedAt !== "string" || !Number.isFinite(Date.parse(value.submittedAt)))) return null;
    if (type === "STAGE_CHANGED" && value.turnEndsAt !== null && typeof value.turnEndsAt !== "string") return null;
    return value as DebateConnectionEvent;
  } catch {
    return null;
  }
}

export function applyDebateConnectionEvent(
  current: DebatePresence,
  event: DebateConnectionEvent,
): DebatePresence {
  if (isDebateProgressEvent(event)) return current;
  if (event.type === "STARTED") {
    return {
      roles: { HOST: "entered", GUEST: "entered" },
      started: true,
      message: "두 참여자가 모두 입장해 토론이 시작되었습니다.",
    };
  }

  const role = event.role!;
  const name = role === "HOST" ? "개설자" : "게스트";
  return {
    ...current,
    roles: { ...current.roles, [role]: event.type === "ENTERED" ? "entered" : "reconnecting" },
    message: event.type === "ENTERED" ? `${name}가 입장했습니다.` : `${name}의 재연결을 기다리고 있습니다.`,
  };
}

export function isDebateProgressEvent(event: DebateConnectionEvent) {
  return event.type === "STAGE_CHANGED"
    || event.type === "STATEMENT_SUBMITTED"
    || event.type === "STATEMENT_TIMED_OUT"
    || event.type === "VERDICT_ISSUED";
}

export function mergeDebateHistoriesEvent(
  data: DebateHistories | undefined,
  event: DebateConnectionEvent,
): DebateHistories | undefined {
  const histories = mergeDebateHistoryEvent(data?.histories, event);
  if (!histories || histories === data?.histories) return data;
  return { histories, verdicts: data?.verdicts ?? [] };
}

export function mergeDebateHistoryEvent(
  histories: DebateHistory[] | undefined,
  event: DebateConnectionEvent,
) {
  if (!event.stage || !event.submittedAt
    || (event.type !== "STATEMENT_SUBMITTED" && event.type !== "STATEMENT_TIMED_OUT")) return histories;

  const existing = histories?.find(({ stage }) => stage === event.stage);
  const history: DebateHistory = {
    id: existing?.id ?? `realtime-${event.stage}`,
    stage: event.stage,
    content: event.type === "STATEMENT_SUBMITTED" ? event.content ?? null : null,
    createdAt: event.submittedAt,
  };
  if (!histories || !existing) return [...(histories ?? []), history];
  return histories.map((current) => current.stage === event.stage ? history : current);
}

export function confirmDebateDeparture(current: DebatePresence, role: DebateRole): DebatePresence {
  if (current.roles[role] !== "reconnecting") return current;
  const name = role === "HOST" ? "개설자" : "게스트";
  return {
    ...current,
    roles: { ...current.roles, [role]: "left" },
    message: `${name}가 퇴장했습니다.`,
  };
}
