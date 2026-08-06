import Link from "next/link";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthLayout
      headerRight={
        <Link
          href="/signin"
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
        >
          로그인
        </Link>
      }
      heroTitle={
        <>
          무료로 회원가입하고{" "}
          <span className="text-[var(--brand-blue)]">AI 재판</span>에 참여하세요
        </>
      }
      heroDescription="계정을 만들고 AI 판사의 공정한 판결을 경험해보세요"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
