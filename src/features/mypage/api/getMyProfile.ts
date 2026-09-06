import { apiClient } from "@/lib/api/client";
import type { UserProfile, UserProfileResponse } from "@/types/user";

type ViewUrlResponse = {
  url: string;
  expiresInSeconds: number;
};

export function getProfileImageViewUrl(objectKey: string, token: string) {
  const query = new URLSearchParams({ objectKey });
  return apiClient<ViewUrlResponse>(`/api/v1/storage/view-urls?${query}`, {
    token,
  });
}

export async function getMyProfile(token: string): Promise<UserProfile> {
  const profile = await apiClient<UserProfileResponse>("/api/v1/users/me", {
    token,
  });
  const profileImageUrl = profile.profileImageKey
    ? (await getProfileImageViewUrl(profile.profileImageKey, token)).url
    : null;

  return { ...profile, profileImageUrl };
}
