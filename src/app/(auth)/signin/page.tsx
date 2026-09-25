import { AuthLayout } from "@/components/layout/AuthLayout";
import { SignInForm } from "@/features/auth/components/SignInForm";

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
    <AuthLayout
      heroTitle={
        <>
          평등하고 객관적인{" "}
          <span className="text-[var(--brand-blue)]">AI 판사</span>와 함께{" "}
          <span className="text-[var(--brand-blue)]">공정한 토론</span>을
          시작하세요
        </>
      }
      heroDescription="로그인하여 재판에 참여하고 AI 판사의 공정한 판결을 받아보세요"
    >
      <SignInForm notice={notice} next={next} />
    </AuthLayout>
  );
}
