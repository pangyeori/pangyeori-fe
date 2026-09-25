import type { Invitation, Position } from "@/features/debates/api/debates";

export type DebateRoomSnapshot = {
  debateId: string;
  title: string;
  description: string | null;
  hostPosition: Position;
  guestPosition: Position;
  turnTimeSeconds: number;
  freeDebateTimeSeconds: number;
  createdAt: string;
  inviteToken?: string;
};

const key = (debateId: string) => `pangyeori:debate-room:${debateId}`;

export function isHostInvitation(invitation: Invitation | undefined) {
  return invitation?.guestStatus === "ACCEPTED" && invitation.debateStatus === "WAITING";
}

export function rememberDebateRoom(room: DebateRoomSnapshot) {
  if (typeof window === "undefined") return;
  try {
    const previous = readDebateRoom(room.debateId);
    sessionStorage.setItem(
      key(room.debateId),
      JSON.stringify({ ...previous, ...room, inviteToken: room.inviteToken ?? previous?.inviteToken }),
    );
  } catch {
    // 세션 캐시는 선택 사항이며 저장 실패가 토론방 이동을 막으면 안 된다.
  }
}

export function readDebateRoom(debateId: string): DebateRoomSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(key(debateId)) ?? "null") as DebateRoomSnapshot | null;
    return value?.debateId === debateId ? value : null;
  } catch {
    return null;
  }
}
