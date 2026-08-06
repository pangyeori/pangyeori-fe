import { apiClient } from "@/lib/api/client";
import type { SignInRequest, SignInResponse } from "@/types/auth";

export function signIn(body: SignInRequest) {
  return apiClient<SignInResponse>("/api/auth/signin", {
    method: "POST",
    body,
  });
}
