import { apiClient } from "@/lib/api/client";

export type Position = "PROS" | "CONS";
export type GuestStatus = "PENDING" | "REJECTED" | "CANCELLED" | "ACCEPTED" | null;

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

export function createDebate(token: string, body: {
  title: string;
  description?: string;
  hostPosition: Position;
  turnTimeSeconds: number;
  freeDebateTimeSeconds: number;
}) {
  return apiClient<CreatedDebate>("/api/v1/debates", { method: "POST", token, body });
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
