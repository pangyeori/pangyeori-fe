import { apiClient } from "@/lib/api/client";
import type { UserProfile } from "@/types/user";

export function getMyProfile(token: string) {
  return apiClient<UserProfile>("/api/v1/users/me", { token });
}
