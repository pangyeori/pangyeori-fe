import { apiClient } from "@/lib/api/client";
import type { RegisterRequest, RegisterResponse } from "@/types/auth";

export function register(body: RegisterRequest) {
  return apiClient<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body,
  });
}
