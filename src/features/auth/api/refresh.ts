import { apiClient } from "@/lib/api/client";
import type { SignInResponse } from "@/types/auth";

export function refreshAccessToken() {
  return apiClient<SignInResponse>("/api/v1/users/refresh", {
    method: "POST",
  });
}
