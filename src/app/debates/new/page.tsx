"use client";

import Link from "next/link";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { DebateCreateForm } from "@/features/debates/components/DebateCreateForm";

function PageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl animate-pulse px-5 py-10 sm:px-8 sm:py-14"
      aria-label="로그인 상태 확인 중"
      aria-busy="true"
    >
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-3 h-9 w-64 max-w-full rounded bg-slate-200" />
      <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-100" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[440px] rounded-2xl bg-white" />
        <div className="h-80 rounded-2xl bg-white" />
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-5 py-16 sm:px-8">
      <section className="w-full rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-10">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl"
          aria-hidden
        >
          💬
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--ink)]">
          로그인 후 토론방을 만들 수 있어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          로그인하면 토론 주제를 정하고 상대방을 초대할 수 있습니다.
        </p>
        <Link
          href="/signin?next=/debates/new"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-lg bg-[var(--btn-primary)] px-7 text-[15px] font-semibold text-white transition hover:bg-[var(--btn-primary-hover)]"
        >
          로그인하기
        </Link>
      </section>
    </main>
  );
}

export default function NewDebatePage() {
  const { accessToken, isReady } = useAuth();
  const [exitOpen, setExitOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader />

      {!isReady ? (
        <PageSkeleton />
      ) : !accessToken ? (
        <LoginRequired />
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-9">
            <p className="text-sm font-semibold text-[var(--brand-blue)]">
              새 토론
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              토론방 만들기
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-base">
              함께 이야기하고 싶은 주제와 토론 방식을 설정해주세요.
            </p>
          </div>
          <DebateCreateForm accessToken={accessToken} onExit={() => setExitOpen(true)} />
        </main>
      )}

      <SiteFooter />

      <Modal
        open={exitOpen}
        title="토론방 작성을 종료할까요?"
        onClose={() => setExitOpen(false)}
      >
        <p>
          지금 나가면 작성 중인 토론방 정보가 저장되지 않고 지워질 수 있습니다.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setExitOpen(false)}>
            계속 작성
          </Button>
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--btn-primary)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--btn-primary-hover)]"
          >
            나가기
          </Link>
        </div>
      </Modal>
    </div>
  );
}
