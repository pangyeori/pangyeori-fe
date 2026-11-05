// Socket failures have no HTTP status. Mark transport failures at their source,
// so application errors received over STOMP keep the server's message.
export class DebateTransportError extends Error {}

export function isUncertainDebateActionError(error: unknown) {
  return error instanceof DebateTransportError
    || Boolean(error && typeof error === "object" && "status" in error && error.status === 0);
}

// Temporary read failures recover quietly; access and validation failures need a visible action.
export function isRecoverableReadError(error: unknown) {
  if (!error) return false;
  const status = typeof error === "object" && "status" in error ? Number(error.status) : 0;
  return !status || status === 408 || status === 429 || status >= 500;
}

export function readRecoveryInterval(error: unknown, failures = 1): number | false {
  if (!isRecoverableReadError(error)) return false;
  return Math.min(3000 * 2 ** Math.max(0, failures - 1), 30_000);
}

export function debateActionFeedback(error: unknown) {
  // A write timeout does not prove failure. Never automatically resend a possibly saved message.
  if (isUncertainDebateActionError(error)) return "작성한 내용은 그대로 남아 있어요. 대화 내역을 확인한 뒤 다시 보내주세요.";
  return error instanceof Error && error.message.trim() ? error.message : "작성한 내용을 확인하고 다시 보내주세요.";
}
