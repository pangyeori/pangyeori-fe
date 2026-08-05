"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardHeaderProps = {
  title: string;
  description: string;
};

export function AuthCardHeader({ title, description }: AuthCardHeaderProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-1 py-2 text-center text-sm text-[var(--ink-faint)]">
      <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--line)]" />
      <span className="relative bg-white px-3">또는</span>
    </div>
  );
}

type AuthSwitchLinkProps = {
  prompt: string;
  href: string;
  linkLabel: string;
  accent?: "danger" | "blue";
};

export function AuthSwitchLink({
  prompt,
  href,
  linkLabel,
  accent = "danger",
}: AuthSwitchLinkProps) {
  const accentClass =
    accent === "blue" ? "text-[var(--brand-blue)]" : "text-[var(--danger)]";

  return (
    <p className="pt-1 text-center text-sm text-[var(--ink-muted)]">
      {prompt}{" "}
      <Link
        href={href}
        className={`font-semibold underline-offset-2 hover:underline ${accentClass}`}
      >
        {linkLabel}
      </Link>
    </p>
  );
}

export function FormAlert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success";
}) {
  if (tone === "success") {
    return (
      <p
        className="rounded-lg border border-[var(--success)] bg-[var(--success-bg)] px-3.5 py-3 text-sm text-[var(--success-fg)]"
        role="status"
      >
        {children}
      </p>
    );
  }

  return (
    <p
      className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-bg)] px-3.5 py-3 text-sm text-[var(--danger)]"
      role="alert"
    >
      {children}
    </p>
  );
}
