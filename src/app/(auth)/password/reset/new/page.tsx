import Link from "next/link";

import { AuthCenterLayout } from "@/components/layout/AuthCenterLayout";
import { NewPasswordForm } from "@/features/auth/components/NewPasswordForm";

export default function NewPasswordPage() {
  return (
    <AuthCenterLayout
      variant="modern"
      headerRight={
        <Link
          href="/signin"
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
        >
          로그인
        </Link>
      }
    >
      <NewPasswordForm />
    </AuthCenterLayout>
  );
}
