import { apiClient } from "@/lib/api/client";
import type { UserProfileResponse } from "@/types/user";

export type UpdateProfileRequest = {
  nickname?: string;
  profileImageKey?: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export function updateProfile(body: UpdateProfileRequest, token: string) {
  return apiClient<UserProfileResponse>("/api/v1/users/me", {
    method: "PATCH",
    token,
    body,
  });
}

export function changePassword(body: ChangePasswordRequest, token: string) {
  return apiClient<void>("/api/v1/users/me/password", {
    method: "PATCH",
    token,
    body,
  });
}

export function withdrawAccount(token: string) {
  return apiClient<void>("/api/v1/users/me", {
    method: "DELETE",
    token,
  });
}
