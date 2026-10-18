import type { DebateDetail, DebateFreeMessage } from "@/features/debates/api/debates";

export function mergeFreeMessages(...groups: DebateFreeMessage[][]): DebateFreeMessage[] {
  const messages = new Map(groups.flat().map((message) => [message.id, message]));
  // The server cursor is a descending TSID; ascending IDs give chronological chat order.
  return [...messages.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function freeMessageError(raw: string): string {
  try {
    const error = JSON.parse(raw);
    if (typeof error?.message === "string" && error.message.trim()) return error.message;
  } catch {
    // Malformed or empty server errors use the network fallback.
  }
  return "메시지를 전송하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function canSendFreeMessage(debate: DebateDetail | undefined, connected: boolean, now: number) {
  if (!debate || debate.status !== "IN_PROGRESS" || debate.currentStage !== "FREE" || !connected) return false;
  const value = debate.turnEndsAt;
  if (!value) return false;
  const deadline = Date.parse(value + (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? "" : "Z"));
  return Number.isFinite(deadline) && now < deadline;
}
