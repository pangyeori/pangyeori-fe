"use client";

import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { useSignOut } from "@/features/auth/hooks/useSignOut";

const steps = [
  ["01", "토론 주제를 정해요", "함께 이야기하고 싶은 주제와 내 입장을 선택해요."],
  ["02", "상대와 근거를 나눠요", "정해진 순서에 맞춰 주장과 반론을 또렷하게 전달해요."],
  ["03", "AI 판정을 확인해요", "논리와 설득력을 바탕으로 정리된 판정 결과를 확인해요."],
];

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  const { isReady, isAuthenticated } = useAuth();
  const signOutMutation = useSignOut();
  const debateHref = isAuthenticated ? "/debates/new" : "/signin";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader
        rightSlot={isReady && isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link href="/mypage" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] sm:block">마이페이지</Link>
            <Button variant="outline" className="!h-10 !w-auto px-4" loading={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>로그아웃</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/signin" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]">로그인</Link>
            <Link href="/register" className="rounded-lg bg-[var(--btn-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--btn-primary-hover)]">회원가입</Link>
          </div>
        )}
      />

      <main className="flex-1 overflow-hidden">
        <section className="relative border-b border-[var(--line)] bg-white">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-32">
            <div className="max-w-2xl">
              <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-[var(--brand-blue)]">✦ AI가 함께하는 1:1 토론</p>
              <h1 className="mt-7 text-4xl font-bold leading-[1.18] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl">생각을 겨루고,<br />더 나은 답을 만나요.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--ink-muted)] sm:text-lg sm:leading-8">판겨리는 근거 있는 주장과 건강한 반론을 돕는 1:1 토론 서비스예요. 토론이 끝나면 AI가 양쪽의 논리와 설득력을 정리해 판정합니다.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={debateHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--btn-primary)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--btn-primary-hover)]">토론 시작하기 <ArrowIcon /></Link>
                {!isAuthenticated ? <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-6 text-[15px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]">무료로 가입하기</Link> : null}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-5 rotate-3 rounded-[2rem] bg-blue-100/60" />
              <div className="relative rounded-[1.75rem] border border-[var(--line)] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
                <div className="flex items-center justify-between"><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">토론 준비</span><span className="text-xs font-semibold text-[var(--ink-faint)]">1 : 1</span></div>
                <p className="mt-8 text-sm font-semibold text-[var(--brand-blue)]">오늘의 논제</p>
                <p className="mt-2 text-2xl font-bold leading-9 tracking-tight text-[var(--ink)]">AI의 판단은 사람보다<br /> 더 공정할 수 있을까?</p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><span className="text-xs font-semibold text-blue-600">찬성</span><p className="mt-2 text-sm font-bold text-[var(--ink)]">근거를 준비해요</p></div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><span className="text-xs font-semibold text-rose-600">반대</span><p className="mt-2 text-sm font-bold text-[var(--ink)]">반론을 펼쳐요</p></div>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--ink-muted)]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] font-bold text-white">AI</span>토론이 끝나면 판결이가 정리해드려요.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <p className="text-sm font-bold text-[var(--brand-blue)]">HOW IT WORKS</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">어렵지 않게 시작해요</h2>
          <p className="mt-4 max-w-xl leading-7 text-[var(--ink-muted)]">주제를 정하는 순간부터 AI 판정을 확인할 때까지, 토론에만 집중할 수 있도록 안내합니다.</p>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <li key={number} className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--brand-blue)]">{number}</span>
                <h3 className="mt-7 text-xl font-bold text-[var(--ink)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mb-20 w-[calc(100%-2.5rem)] max-w-6xl rounded-3xl bg-[var(--ink)] px-6 py-12 text-center text-white sm:mb-24 sm:px-10 sm:py-16">
          <p className="text-sm font-semibold text-blue-300">생각을 말할 준비가 됐나요?</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">첫 번째 토론을 만들어보세요.</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-300">정답보다 중요한 건 이유를 나누는 과정이에요. 판겨리가 공정한 대화를 도와드릴게요.</p>
          <Link href={debateHref} className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-[15px] font-bold text-[var(--ink)] hover:bg-slate-100">토론방 만들기 <ArrowIcon /></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
