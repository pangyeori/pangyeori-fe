import type { DebateEarlyEndStatus, DebateHistories, DebateHistory, DebatePresenceSnapshot, DebateRole, DebateStage, DebateVerdictStatus, WinnerPosition } from "@/features/debates/api/debates";

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
  | "FREE_MESSAGE_SENT"
  | "VERDICT_ISSUED"
  | "EARLY_END_PROPOSED"
  | "EARLY_END_ACCEPTED"
  | "EARLY_END_DECLINED"
  | "EARLY_END_CANCELLED"
  | "EARLY_END_EXPIRED"
  | "DEBATE_ENDED";

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
  messageId?: string | null;
  expiresAt?: string | null;
  participantProsScore?: number | null;
  participantConsScore?: number | null;
};

export type DebateEarlyEndAction = "propose" | "accept" | "decline" | "cancel";

export const initialDebateEarlyEnd: DebateEarlyEndStatus = {
  pending: false,
  proposerRole: null,
  expiresAt: null,
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
      "FREE_MESSAGE_SENT",
      "EARLY_END_PROPOSED",
      "EARLY_END_ACCEPTED",
      "EARLY_END_DECLINED",
      "EARLY_END_CANCELLED",
      "EARLY_END_EXPIRED",
      "DEBATE_ENDED",
    ].includes(type)) return null;
    if (type === "FREE_MESSAGE_SENT") {
      if ((value.role !== "HOST" && value.role !== "GUEST")
        || typeof value.messageId !== "string" || !value.messageId
        || typeof value.content !== "string"
        || typeof value.submittedAt !== "string" || !Number.isFinite(Date.parse(value.submittedAt))) return null;
    }
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
      if (value.stage === "FINAL_VERDICT" && value.verdictStatus === "SUCCESS") {
        const pros = value.participantProsScore;
        const cons = value.participantConsScore;
        if (typeof pros !== "number" || typeof cons !== "number"
          || !Number.isFinite(pros) || !Number.isFinite(cons)
          || pros < 0 || cons < 0 || Math.abs(pros + cons - 100) > 0.001) return null;
      }
    }
    if (type === "DEBATE_ENDED") {
      if (value.stage !== "FINAL_VERDICT"
        || (value.verdictStatus !== "SUCCESS" && value.verdictStatus !== "FAILED")) return null;
      if (value.verdictStatus === "SUCCESS" && !["PROS", "CONS", "DRAW"].includes(String(value.winnerPosition))) return null;
      if (value.verdictStatus === "FAILED" && value.winnerPosition != null) return null;
    }
    if (type === "STATEMENT_SUBMITTED" && typeof value.content !== "string") return null;
    if (["STATEMENT_SUBMITTED", "STATEMENT_TIMED_OUT"].includes(type)
      && (typeof value.submittedAt !== "string" || !Number.isFinite(Date.parse(value.submittedAt)))) return null;
    if (type === "STAGE_CHANGED" && value.turnEndsAt !== null && typeof value.turnEndsAt !== "string") return null;
    if (type.startsWith("EARLY_END_")) {
      if (value.role !== "HOST" && value.role !== "GUEST") return null;
      if (type === "EARLY_END_PROPOSED"
        && (typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(
          value.expiresAt + (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value.expiresAt) ? "" : "Z"),
        )))) return null;
    }
    return value as DebateConnectionEvent;
  } catch {
    return null;
  }
}

export function applyDebateConnectionEvent(
  current: DebatePresence,
  event: DebateConnectionEvent,
): DebatePresence {
  if (isDebateProgressEvent(event) || isDebateEarlyEndEvent(event) || event.type === "FREE_MESSAGE_SENT") return current;
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
    || event.type === "VERDICT_ISSUED"
    || event.type === "DEBATE_ENDED";
}

export function isDebateEarlyEndEvent(event: DebateConnectionEvent) {
  return event.type.startsWith("EARLY_END_");
}

export function shouldNotifyEarlyEndDeclined(
  event: DebateConnectionEvent | null,
  myRole: DebateRole | undefined,
) {
  return event?.type === "EARLY_END_DECLINED" && Boolean(myRole && event.role !== myRole);
}

export function applyDebateEarlyEndEvent(
  current: DebateEarlyEndStatus,
  event: DebateConnectionEvent,
): DebateEarlyEndStatus {
  if (event.type === "EARLY_END_PROPOSED") {
    return { pending: true, proposerRole: event.role, expiresAt: event.expiresAt! };
  }
  return isDebateEarlyEndEvent(event) ? initialDebateEarlyEnd : current;
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
