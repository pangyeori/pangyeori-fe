"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthProvider";

export function HomeActions({ variant = "hero" }: { variant?: "hero" | "closing" }) {
  const { isAuthenticated } = useAuth();
  const debateHref = isAuthenticated ? "/debates/new" : "/signin";

  if (variant === "closing") {
    return <Link href={debateHref} className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-[15px] font-bold text-[var(--ink)] hover:bg-slate-100">토론방 만들기 <ArrowIcon /></Link>;
  }

  return (
    <div className="mt-9 flex flex-col gap-3 sm:flex-row">
      <Link href={debateHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--btn-primary)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--btn-primary-hover)]">토론 시작하기 <ArrowIcon /></Link>
      {!isAuthenticated ? <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-6 text-[15px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]">무료로 가입하기</Link> : null}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
