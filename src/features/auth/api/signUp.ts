import { apiClient } from "@/lib/api/client";
import type { SignUpRequest, SignUpResponse } from "@/types/auth";

export function signUp(body: SignUpRequest) {
  return apiClient<SignUpResponse>("/api/auth/signup", {
    method: "POST",
    body,
  });
}
