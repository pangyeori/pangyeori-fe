import { AuthLayout } from "@/components/layout/AuthLayout";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { SignInIntro } from "@/features/auth/components/SignInIntro";

type SignInPageProps = {
  searchParams: Promise<{ reason?: string; next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { reason, next } = await searchParams;
  const notice =
    reason === "password-changed"
      ? "비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요."
      : reason === "withdrawn"
        ? "회원 탈퇴가 완료되었습니다."
        : undefined;

  return (
    <AuthLayout hero={<SignInIntro />}>
      <SignInForm notice={notice} next={next} />
    </AuthLayout>
  );
}
