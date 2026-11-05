export function isSessionRejected(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error
    && (error.status === 401 || error.status === 403));
}

export function sessionRetryDelay(failures: number, expiresAt: number, now: number) {
  return Math.max(0, Math.min(3000 * 2 ** Math.min(failures, 4), 30_000, expiresAt - now));
}
