"use client";

import { AccountSettingsShell } from "@/features/mypage/components/AccountSettingsShell";
import { ProfileEditForm } from "@/features/mypage/components/ProfileEditForm";

export default function ProfileEditPage() {
  return (
    <AccountSettingsShell
      title="내 정보 수정"
      description="프로필 이미지와 닉네임을 변경할 수 있습니다."
    >
      {(profile) => <ProfileEditForm profile={profile} />}
    </AccountSettingsShell>
  );
}
