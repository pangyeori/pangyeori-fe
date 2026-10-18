export type UserProfile = {
  id: string;
  email: string;
  nickname: string;
  profileImageKey: string | null;
  profileImageUrl: string | null;
  joinedAt: string;
  marketingAgreed: boolean;
};

export type UserProfileResponse = Omit<UserProfile, "profileImageUrl">;
