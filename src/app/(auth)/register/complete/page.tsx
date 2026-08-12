import Link from "next/link";

import { AuthCenterLayout } from "@/components/layout/AuthCenterLayout";

const CONFETTI_COLORS = ["#2563eb", "#f59e0b", "#ec4899", "#16a34a"];

export default function RegisterCompletePage() {
  return (
    <AuthCenterLayout>
      <div className="text-center">
        <div aria-hidden>
          {Array.from({ length: 36 }, (_, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={{
                left: `${(index * 29 + 7) % 100}%`,
                backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                animationDelay: `${(index % 9) * 0.08}s`,
                animationDuration: `${2.4 + (index % 5) * 0.18}s`,
              }}
            />
          ))}
        </div>

        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)]">
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--ink)]">
          회원가입이 완료되었습니다!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          판겨리의 회원이 되신 것을 환영합니다.
          <br />
          로그인하고 첫 토론을 시작해보세요.
        </p>

        <Link
          href="/signin"
          className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--btn-primary)] px-5 text-[15px] font-semibold text-white transition hover:bg-[var(--btn-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)]"
        >
          로그인하러 가기
        </Link>
      </div>
    </AuthCenterLayout>
  );
}
