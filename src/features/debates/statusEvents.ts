import type { DebateStatus } from "@/features/debates/api/debates";

export function applyStatusEvent(current: DebateStatus, event: string, raw: string): DebateStatus {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
    if (!data || typeof data !== "object") return current;
  } catch {
    return current;
  }

  if (event === "snapshot" && typeof data.debateStatus === "string") {
    return {
      debateStatus: data.debateStatus,
      guestStatus: typeof data.guestStatus === "string" || data.guestStatus === null ? data.guestStatus as DebateStatus["guestStatus"] : current.guestStatus,
      requestList: Array.isArray(data.requestList) || data.requestList === null ? data.requestList as DebateStatus["requestList"] : current.requestList,
    };
  }
  if (event === "queue-changed" && Array.isArray(data.requestList)) return { ...current, requestList: data.requestList };
  if (event === "guest-status-changed" && typeof data.guestStatus === "string") return { ...current, guestStatus: data.guestStatus as DebateStatus["guestStatus"] };
  if (event === "debate-status-changed" && typeof data.debateStatus === "string") return { ...current, debateStatus: data.debateStatus };
  return current;
}
