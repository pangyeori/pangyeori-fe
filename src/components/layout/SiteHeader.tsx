"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

export function SiteHeader() {
  const { isAuthenticated, isReady } = useAuth();
  const signOutMutation = useSignOut();

  return (
    <header className="relative z-40 shrink-0 border-b border-[var(--line)] bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)]"
      >
        판겨리
      </Link>
      {!isReady ? (
        <div className="h-10 w-40" aria-hidden="true" />
      ) : isAuthenticated ? (
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationBell />
          <Link
            href="/mypage"
            className="rounded-lg px-2 py-2 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] sm:px-3"
          >
            마이페이지
          </Link>
          <Button
            variant="outline"
            className="!h-10 !w-auto px-2.5 text-sm sm:px-4"
            loading={signOutMutation.isPending}
            onClick={() => signOutMutation.mutate()}
          >
            로그아웃
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/signin"
            className="rounded-lg px-2 py-2 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] sm:px-3"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-[var(--btn-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-primary-hover)] sm:px-4"
          >
            회원가입
          </Link>
        </div>
      )}
      </div>
    </header>
  );
}
