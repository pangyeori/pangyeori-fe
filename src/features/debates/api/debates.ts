import { apiClient } from "@/lib/api/client";

export type Position = "PROS" | "CONS";
export type GuestStatus = "PENDING" | "REJECTED" | "CANCELLED" | "ACCEPTED" | null;
export type DebateLifecycleStatus =
  | "WAITING"
  | "READY"
  | "IN_PROGRESS"
  | "PAUSED"
  | "FINISHED"
  | "CANCELLED";
export type DebateRole = "HOST" | "GUEST";
export const debateStages = [
  "NONE",
  "OPENING_PROS",
  "OPENING_CONS",
  "VERDICT_1",
  "REBUTTAL_PROS",
  "REBUTTAL_CONS",
  "VERDICT_2",
  "FREE",
  "FINAL_VERDICT",
] as const;
export type DebateStage = (typeof debateStages)[number];

export type DebateStatus = {
  debateStatus: string;
  guestStatus: GuestStatus;
  requestList: {
    userId: string;
    nickname: string;
    profileImageKey: string | null;
    status: "PENDING";
    requestedAt: string;
  }[] | null;
};

export type DebatePresenceSnapshot = {
  hostConnected: boolean;
  guestConnected: boolean;
};

export type Invitation = {
  debateId: string;
  title: string;
  description: string | null;
  hostNickname: string;
  guestPosition: Position;
  debateStatus: string;
  guestStatus: GuestStatus;
  turnTimeSeconds: number;
  freeDebateTimeSeconds: number;
  createdAt: string;
};

export type CreatedDebate = {
  id: string;
  title: string;
  description: string | null;
  hostPosition: Position;
  guestPosition: Position;
  status: string;
  turnTimeSeconds: number;
  freeDebateTimeSeconds: number;
  inviteToken: string;
};

export type DebateDetail = {
  id: string;
  title: string;
  description: string | null;
  hostPosition: Position;
  guestPosition: Position;
  status: DebateLifecycleStatus;
  currentStage: DebateStage;
  turnEndsAt: string | null;
  turnTimeSeconds: number;
  freeDebateTimeSeconds: number;
  inviteToken: string | null;
};

export type MyDebate = {
  debateId: string;
  title: string;
  description: string | null;
  debateStatus: DebateLifecycleStatus;
  currentStage: DebateStage;
  myRole: DebateRole;
  myPosition: Position;
  opponent: {
    userId: string;
    nickname: string;
    profileImageKey: string | null;
  } | null;
  turnTimeSeconds: number;
  freeDebateTimeSeconds: number;
  createdAt: string;
};

export type DebateHistory = {
  id: string;
  stage: DebateStage;
  content: string | null;
  createdAt: string;
};

export type DebateVerdictStatus = "SUCCESS" | "FAILED";
export type WinnerPosition = Position | "DRAW";

export type DebateVerdict = {
  id: string;
  stage: DebateStage;
  status: DebateVerdictStatus;
  winnerPosition: WinnerPosition | null;
  reasoning: string | null;
  createdAt: string;
};

export type DebateHistories = {
  histories: DebateHistory[];
  verdicts: DebateVerdict[];
};

export type MyDebatesPage = {
  items: MyDebate[];
  nextCursor: string | null;
  hasNext: boolean;
};

export function createDebate(token: string, body: {
  title: string;
  description?: string;
  hostPosition: Position;
  turnTimeSeconds: number;
  freeDebateTimeSeconds: number;
}) {
  return apiClient<CreatedDebate>("/api/v1/debates", { method: "POST", token, body });
}

export function getDebate(debateId: string, token: string) {
  return apiClient<DebateDetail>(`/api/v1/debates/${encodeURIComponent(debateId)}`, { token });
}

export function getDebatePresence(debateId: string, token: string) {
  return apiClient<DebatePresenceSnapshot>(`/api/v1/debates/${encodeURIComponent(debateId)}/presence`, { token });
}

export function getDebateHistories(debateId: string, token: string) {
  return apiClient<DebateHistories>(`/api/v1/debates/${encodeURIComponent(debateId)}/histories`, { token });
}

export function submitDebateHistory(debateId: string, content: string, token: string) {
  return apiClient<DebateHistory>(`/api/v1/debates/${encodeURIComponent(debateId)}/histories`, {
    method: "POST",
    token,
    body: { content },
  });
}

export function getMyDebates(
  token: string,
  cursor: string | null = null,
  options: { role?: DebateRole; status?: DebateLifecycleStatus[]; pageSize?: number } = {},
) {
  const query = new URLSearchParams({ pageSize: String(options.pageSize ?? 20) });
  if (cursor) query.set("cursor", cursor);
  if (options.role) query.set("role", options.role);
  options.status?.forEach((status) => query.append("status", status));
  return apiClient<MyDebatesPage>(`/api/v1/debates/me?${query}`, { token });
}

export async function getMyDebate(debateId: string, token: string) {
  let cursor: string | null = null;
  do {
    const page = await getMyDebates(token, cursor, {
      status: ["READY", "IN_PROGRESS"],
      pageSize: 50,
    });
    const debate = page.items.find((item) => item.debateId === debateId);
    if (debate) return debate;
    cursor = page.nextCursor;
  } while (cursor);
  return null;
}

export function getInvitation(inviteToken: string, token: string) {
  return apiClient<Invitation>(`/api/v1/debate-invitations/${encodeURIComponent(inviteToken)}`, { token });
}

export function requestDebate(debateId: string, token: string) {
  return apiClient(`/api/v1/debates/${encodeURIComponent(debateId)}/invitations/request`, { method: "POST", token });
}

export function cancelDebateRequest(debateId: string, token: string) {
  return apiClient(`/api/v1/debates/${encodeURIComponent(debateId)}/invitations/request`, { method: "DELETE", token });
}

export function acceptDebateGuest(debateId: string, userId: string, token: string) {
  return apiClient<{ debateId: string; status: string }>(`/api/v1/debates/${encodeURIComponent(debateId)}/guest/accept`, {
    method: "POST", token, body: { userId },
  });
}

export function issueDebateStreamTicket(debateId: string, token: string) {
  return apiClient<{ ticket: string; expiresInSeconds: number }>(`/api/v1/debates/${encodeURIComponent(debateId)}/status/stream-tickets`, {
    method: "POST", token,
  });
}
