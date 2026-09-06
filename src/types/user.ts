export type UserProfile = {
  id: string;
  email: string;
  nickname: string;
  profileImageKey: string | null;
  profileImageUrl: string | null;
  joinedAt: string;
};

export type UserProfileResponse = Omit<UserProfile, "profileImageUrl">;
