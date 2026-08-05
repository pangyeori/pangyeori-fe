import Link from "next/link";

import { AuthCenterLayout } from "@/components/layout/AuthCenterLayout";
import { PasswordResetForm } from "@/features/auth/components/PasswordResetForm";

export default function PasswordResetPage() {
  return (
    <AuthCenterLayout
      headerRight={
        <Link
          href="/signup"
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
        >
          로그인
        </Link>
      }
    >
      <PasswordResetForm />
    </AuthCenterLayout>
  );
}
