import { apiClient } from "@/lib/api/client";

/** BE 인증코드 TTL과 동일 (5분) */
export const EMAIL_CODE_TTL_SECONDS = 5 * 60;

export function requestEmailVerification(email: string) {
  return apiClient<unknown>("/api/v1/email-verifications", {
    method: "POST",
    body: { email },
  });
}

export function confirmEmailVerification(email: string, code: string) {
  return apiClient<unknown>("/api/v1/email-verifications/confirm", {
    method: "POST",
    body: { email, code },
  });
}
