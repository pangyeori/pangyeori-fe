import { apiClient } from "@/lib/api/client";

export function signOutRequest() {
  return apiClient<void>("/api/v1/users/signout", {
    method: "POST",
  });
}
