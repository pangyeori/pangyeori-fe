"use client";

import { AccountSettingsShell } from "@/features/mypage/components/AccountSettingsShell";
import { PasswordChangeForm } from "@/features/mypage/components/PasswordChangeForm";

export default function PasswordChangePage() {
  return (
    <AccountSettingsShell
      title="비밀번호 수정"
      description="안전한 계정 사용을 위해 현재 비밀번호를 다시 확인합니다."
    >
      {() => <PasswordChangeForm />}
    </AccountSettingsShell>
  );
}
