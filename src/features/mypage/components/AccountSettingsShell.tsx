"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { ProfileSkeleton } from "@/features/mypage/components/ProfileSkeleton";
import { useMyProfile } from "@/features/mypage/hooks/useMyProfile";
import { ApiError } from "@/lib/api/client";
import type { UserProfile } from "@/types/user";

type AccountSettingsShellProps = {
  title: string;
  description: string;
  children: (profile: UserProfile) => ReactNode;
};

export function AccountSettingsShell({
  title,
  description,
  children,
}: AccountSettingsShellProps) {
  const router = useRouter();
  const { clearAuth, isAuthenticated, isReady } = useAuth();
  const profileQuery = useMyProfile();
  const isUnauthorized =
    profileQuery.error instanceof ApiError && profileQuery.error.status === 401;

  useEffect(() => {
    if (isReady && (!isAuthenticated || isUnauthorized)) {
      if (isUnauthorized) clearAuth();
      router.replace("/signin");
    }
  }, [clearAuth, isAuthenticated, isReady, isUnauthorized, router]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader
        rightSlot={
          <Link
            href="/mypage"
            className="text-sm font-semibold text-[var(--ink-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
          >
            마이페이지로
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold text-[var(--ink-muted)]">내 계정</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--ink)]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{description}</p>
        </div>

        {!isReady || profileQuery.isPending || isUnauthorized ? (
          <ProfileSkeleton />
        ) : null}
        {profileQuery.isSuccess ? children(profileQuery.data) : null}
        {profileQuery.isError && !isUnauthorized ? (
          <section className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-bg)] p-6 text-sm text-[var(--danger)]" role="alert">
            {profileQuery.error.message}
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
