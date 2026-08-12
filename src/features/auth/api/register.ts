import { apiClient } from "@/lib/api/client";
import type { RegisterRequest } from "@/types/auth";

export function register(body: RegisterRequest) {
  return apiClient<unknown>("/api/v1/users", {
    method: "POST",
    body,
  });
}
