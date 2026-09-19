"use client";

import { AccountSettingsShell } from "@/features/mypage/components/AccountSettingsShell";
import { PasswordVerificationForm } from "@/features/mypage/components/PasswordVerificationForm";

export default function PasswordVerificationPage() {
  return (
    <AccountSettingsShell
      title="비밀번호 확인"
      description="회원정보를 안전하게 수정하기 위해 본인 확인이 필요합니다."
    >
      {() => <PasswordVerificationForm />}
    </AccountSettingsShell>
  );
}
