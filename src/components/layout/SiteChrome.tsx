import Link from "next/link";
import type { ReactNode } from "react";

type SiteHeaderProps = {
  rightSlot?: ReactNode;
};

export function SiteHeader({ rightSlot }: SiteHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--line)] bg-white px-5 sm:px-8">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)]"
      >
        판겨리
      </Link>
      {rightSlot}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-white px-5 py-7 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-[family-name:var(--font-display)] font-bold text-[var(--ink)]">
          판겨리
        </p>
        <p className="text-xs text-[var(--ink-faint)]">
          AI 판정은 토론을 돕기 위한 참고 정보입니다.
        </p>
      </div>
    </footer>
  );
}
