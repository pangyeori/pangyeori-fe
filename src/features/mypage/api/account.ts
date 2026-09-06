import { apiClient } from "@/lib/api/client";
import type { UserProfileResponse } from "@/types/user";

export type UpdateProfileRequest = {
  nickname?: string;
  profileImageKey?: string;
};

export function updateProfile(body: UpdateProfileRequest, token: string) {
  return apiClient<UserProfileResponse>("/api/v1/users/me", {
    method: "PATCH",
    token,
    body,
  });
}
