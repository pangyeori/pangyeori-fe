import { apiClient } from "@/lib/api/client";

type PasswordResetTokenResponse = {
  passwordResetToken: string;
};

type ConfirmPasswordResetRequest = {
  passwordResetToken: string;
  newPassword: string;
};

export function issuePasswordResetToken(email: string) {
  return apiClient<PasswordResetTokenResponse>("/api/v1/password-resets", {
    method: "POST",
    body: { email },
  });
}

export function confirmPasswordReset(body: ConfirmPasswordResetRequest) {
  return apiClient<void>("/api/v1/password-resets/confirm", {
    method: "POST",
    body,
  });
}
