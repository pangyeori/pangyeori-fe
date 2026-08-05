import { apiClient } from "@/lib/api/client";

export function signOutRequest(token: string | null) {
  return apiClient<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
    token,
  });
}
