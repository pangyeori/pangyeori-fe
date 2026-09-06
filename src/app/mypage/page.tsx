"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import { PastDebatesSkeleton } from "@/features/mypage/components/PastDebatesSkeleton";
import { ProfileAvatar } from "@/features/mypage/components/ProfileAvatar";
import { ProfileSkeleton } from "@/features/mypage/components/ProfileSkeleton";
import { useMyProfile } from "@/features/mypage/hooks/useMyProfile";
import { ApiError } from "@/lib/api/client";

function formatJoinedAt(joinedAt: string) {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(joinedAt);
  if (!dateParts) return "날짜 정보 없음";

  const [, year, month, day] = dateParts;
  return `${year}. ${month}. ${day}`;
}

export default function MyPage() {
  const router = useRouter();
  const { clearAuth, isAuthenticated, isReady } = useAuth();
  const profileQuery = useMyProfile();
  const signOutMutation = useSignOut();

  const isUnauthorized =
    profileQuery.error instanceof ApiError &&
    profileQuery.error.status === 401;

  useEffect(() => {
    if (isUnauthorized) {
      clearAuth();
      router.replace("/signin");
    }
  }, [clearAuth, isUnauthorized, router]);

  const showSkeleton =
    !isReady || (isAuthenticated && profileQuery.isPending) || isUnauthorized;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader
        rightSlot={
          isAuthenticated ? (
            <Button
              type="button"
              variant="outline"
              className="!h-10 !w-auto px-4"
              loading={signOutMutation.isPending}
              onClick={() => signOutMutation.mutate()}
            >
              로그아웃
            </Button>
          ) : (
            <Link
              href="/signin"
              className="rounded-lg bg-[var(--btn-primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              로그인
            </Link>
          )
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ink-muted)]">
              내 계정
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--ink)]">
              마이페이지
            </h1>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--ink-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
          >
            홈으로
          </Link>
        </div>

        {showSkeleton ? <ProfileSkeleton /> : null}

        {isReady && !isAuthenticated ? (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              로그인이 필요합니다
            </h2>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              회원 정보는 로그인 후 확인할 수 있습니다.
            </p>
            <Link
              href="/signin"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--btn-primary)] px-6 text-sm font-semibold text-white"
            >
              로그인하기
            </Link>
          </section>
        ) : null}

        {profileQuery.isSuccess ? (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-[var(--ink)]">회원 정보</h2>
              <Link
                href="/mypage/edit"
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
              >
                내 정보 수정
              </Link>
            </div>
            <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <ProfileAvatar
                nickname={profileQuery.data.nickname}
                profileImageUrl={profileQuery.data.profileImageUrl}
              />
              <div className="min-w-0 text-center sm:text-left">
                <p className="break-words text-2xl font-bold text-[var(--ink)]">
                  {profileQuery.data.nickname}
                </p>
                <p className="mt-2 break-all text-[15px] text-[var(--ink-muted)]">
                  {profileQuery.data.email}
                </p>
                <p className="mt-5 text-sm text-[var(--ink-muted)]">
                  가입일{" "}
                  <time dateTime={profileQuery.data.joinedAt}>
                    {formatJoinedAt(profileQuery.data.joinedAt)}
                  </time>
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {profileQuery.isError && !isUnauthorized ? (
          <section
            role="alert"
            className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-bg)] p-6 text-center"
          >
            <h2 className="text-lg font-bold text-[var(--ink)]">
              회원 정보를 불러오지 못했습니다
            </h2>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "잠시 후 다시 시도해주세요."}
            </p>
            <Button
              type="button"
              className="mx-auto mt-5 !w-auto px-6"
              onClick={() => profileQuery.refetch()}
            >
              다시 시도
            </Button>
          </section>
        ) : null}

        <PastDebatesSkeleton />
      </main>

      <SiteFooter />
    </div>
  );
}
