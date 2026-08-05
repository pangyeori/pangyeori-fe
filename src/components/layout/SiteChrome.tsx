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
    <footer className="border-t border-[var(--line)] bg-white py-4 text-center text-sm text-[var(--ink-faint)]">
      Footer
    </footer>
  );
}
