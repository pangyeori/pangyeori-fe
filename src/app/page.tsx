"use client";

import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { useSignOut } from "@/features/auth/hooks/useSignOut";

export default function HomePage() {
  const { user, isReady, isAuthenticated } = useAuth();
  const signOutMutation = useSignOut();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader
        rightSlot={
          isReady && isAuthenticated ? (
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
            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                className="rounded-lg bg-[var(--btn-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
              >
                회원가입
              </Link>
            </div>
          )
        }
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16">
        <p className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-[var(--ink)]">
          판겨리
        </p>

        {!isReady ? (
          <p className="mt-6 text-[var(--ink-muted)]">세션 확인 중…</p>
        ) : isAuthenticated && user ? (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_12px_40px_rgba(16,24,40,0.08)]">
            <p className="text-sm font-semibold text-[var(--success-fg)]">
              로그인 성공
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--ink)]">
              {user.nickname}님, 환영합니다
            </h1>
            <dl className="mt-5 space-y-2 text-sm text-[var(--ink-muted)]">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 font-medium text-[var(--ink)]">
                  이메일
                </dt>
                <dd>{user.email}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 font-medium text-[var(--ink)]">
                  닉네임
                </dt>
                <dd>{user.nickname}</dd>
              </div>
            </dl>
            <Button
              type="button"
              className="mt-6"
              loading={signOutMutation.isPending}
              onClick={() => signOutMutation.mutate()}
            >
              로그아웃
            </Button>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
              AI가 판정하는 1:1 토론 서비스입니다. 로그인하면 메인에서 로그인
              상태를 확인할 수 있습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--btn-primary)] px-6 text-[15px] font-semibold text-white"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-6 text-[15px] font-semibold text-[var(--ink)]"
              >
                회원가입
              </Link>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
