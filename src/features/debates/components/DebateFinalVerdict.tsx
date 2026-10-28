"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import type { DebateVerdict, Position } from "@/features/debates/api/debates";
import { DebateMessagesSkeleton } from "@/features/debates/components/DebateRoomSkeleton";
import { debateOutcome } from "@/features/debates/debateList";
import { validFinalScores } from "../debatePresentation";
import styles from "./DebateRoom.module.css";

const scoreFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

const debateQuotes = [
  { text: "자기 편의 주장만 아는 사람은 그 주장조차 제대로 알지 못한다.", author: "존 스튜어트 밀" },
  { text: "반박하거나 그대로 믿기 위해 읽지 말고, 헤아리고 숙고하기 위해 읽어라.", author: "프랜시스 베이컨" },
  { text: "성찰하지 않는 삶은 살 가치가 없다.", author: "소크라테스" },
  { text: "배우기만 하고 생각하지 않으면 얻는 것이 없고, 생각만 하고 배우지 않으면 위태롭다.", author: "공자" },
  { text: "다른 사람의 이성이 나를 충분히 설득한다면, 그것은 곧 나의 이성이 된다.", author: "조너선 스위프트" },
  { text: "판단하기 전에 시간을 두고, 당사자의 말을 거듭 들어라.", author: "세네카" },
  { text: "확인하기 어렵고 믿기 위험한 일에는 확신보다 의심 쪽에 기우는 편이 낫다.", author: "미셸 드 몽테뉴" },
  { text: "누군가 내 생각이 틀렸음을 보여준다면 기꺼이 바꾸겠다. 내가 찾는 것은 진실이다.", author: "마르쿠스 아우렐리우스" },
  { text: "중요한 것을 위해 싸우되, 다른 사람들이 함께할 수 있는 방식으로 하라.", author: "루스 베이더 긴즈버그" },
  { text: "나와 다른 생각을 가진 사람의 말을 끝까지 듣는 것은, 그 사람의 의견에 동의해서가 아니라 그 사람을 존중하기 때문이다.", author: "신동엽" },
];

export function DebateFinalVerdict({ title, verdict, myPosition, isLoading, unavailable, children }: {
  title: string;
  verdict: DebateVerdict | undefined;
  myPosition: Position | undefined;
  isLoading: boolean;
  unavailable?: string;
  children?: ReactNode;
}) {
  if (isLoading) return <DebateFinalVerdictSkeleton />;

  if (!verdict && unavailable) return <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-12 sm:px-8">
    <section className="rounded-3xl border border-[var(--line)] bg-white px-6 py-12 text-center">
      <h1 className="text-xl font-bold">토론 기록을 확인해주세요</h1>
      <p className="mt-4 text-sm text-[var(--ink-muted)]" role="status">{unavailable}</p>
      <Link href="/mypage" className="mt-6 inline-block min-h-11 text-sm underline">내 토론으로 돌아가기</Link>
    </section>{children}
  </main>;

  if (!verdict) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-12 sm:px-8">
        <section className="w-full rounded-3xl border border-[var(--line)] bg-white px-6 py-12 text-center shadow-[0_16px_50px_rgba(16,24,40,0.08)] sm:px-10">
          <span className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-50 ring-8 ring-blue-50/60">
            <Image src="/images/mascot/owl-holding-star.png" alt="" width={96} height={96} priority />
          </span>
          <p className="mt-7 text-sm font-bold text-[var(--brand-blue)]">최종 판결</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--ink)] sm:text-3xl">판겨리 AI가 토론을 분석하고 있습니다</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
            입론부터 자유 토론까지 전체 내용을 종합하고 있습니다.<br className="hidden sm:block" /> 판결이 완료되면 결과가 자동으로 표시됩니다.
          </p>
          <FinalVerdictWaiting />
          <RotatingDebateQuote />
        </section>
        {children}
      </main>
    );
  }

  const participantProsScore = verdict.participantProsScore;
  const participantConsScore = verdict.participantConsScore;
  const reasoning = verdict.reasoning?.trim();
  const failed = verdict.status === "FAILED";

  if (failed) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-12 sm:px-8">
        <section className="w-full rounded-3xl border border-[var(--line)] bg-white px-6 py-12 text-center shadow-[0_16px_50px_rgba(16,24,40,0.08)] sm:px-10">
          <span className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-50 ring-1 ring-[var(--line)]">
            <Image src="/images/mascot/owl-holding-star.png" alt="" width={80} height={80} />
          </span>
          <p className="mt-6 text-sm font-bold text-[var(--ink-muted)]">최종 판결 안내</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--ink)]">이번 토론의 판결은 제공되지 않았습니다</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">토론 기록은 보존되며 마이페이지에서 다시 확인할 수 있습니다.</p>
          <Link href="/mypage" className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-[var(--btn-primary)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--btn-primary-hover)]">
            내 토론으로 돌아가기
          </Link>
        </section>
        {children}
      </main>
    );
  }

  const scoresAvailable = validFinalScores(verdict);
  const prosScore = scoresAvailable ? participantProsScore! : null;
  const consScore = scoresAvailable ? participantConsScore! : null;
  const winnerLabel = verdict.winnerPosition === "PROS"
    ? "찬성 측 승리"
    : verdict.winnerPosition === "CONS" ? "반대 측 승리" : verdict.winnerPosition === "DRAW" ? "무승부" : "판결 결과 확인 중";
  const winnerKnown = verdict.winnerPosition === "PROS" || verdict.winnerPosition === "CONS" || verdict.winnerPosition === "DRAW";
  const outcome = myPosition && winnerKnown ? debateOutcome(myPosition, verdict.winnerPosition) : null;
  const myResult = outcome === "승리"
    ? "토론에서 승리했습니다"
    : outcome === "패배" ? "토론에서 패배했습니다" : outcome === "무승부" ? "토론 결과는 무승부입니다" : winnerKnown ? "토론 결과가 확정되었습니다" : "최종 판결 결과를 확인하고 있습니다";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-8 sm:py-12">
      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_16px_50px_rgba(16,24,40,0.08)]">
        <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff1f2_100%)] px-6 py-10 text-center sm:px-10 sm:py-12">
          <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--brand-blue)] shadow-sm ring-1 ring-blue-100">최종 판결</span>
          <h1 className="mx-auto mt-4 max-w-2xl text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">{title}</h1>
          <p className="mt-6 text-sm font-semibold text-[var(--ink-muted)]">{myResult}</p>
          <p className="mt-2 text-3xl font-extrabold text-[var(--ink)] sm:text-4xl">{winnerLabel}</p>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            <Score position="PROS" score={prosScore} mine={myPosition === "PROS"} />
            <span className="text-2xl font-bold text-[var(--ink-faint)]" aria-hidden>:</span>
            <Score position="CONS" score={consScore} mine={myPosition === "CONS"} />
          </div>
          <p className="mt-3 text-center text-xs text-[var(--ink-muted)]">{scoresAvailable ? "AI 평가 점수 · 승률을 의미하지 않습니다." : "평가 점수를 정리하고 있어요."}</p>
          {prosScore !== null && consScore !== null && Math.abs(prosScore + consScore - 100) < 0.01 ? (
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`AI 평가 점수: 찬성 ${scoreFormatter.format(prosScore)}점, 반대 ${scoreFormatter.format(consScore)}점`}>
              <span className="h-full bg-blue-500" style={{ width: `${prosScore}%` }} />
              <span className="h-full bg-rose-500" style={{ width: `${consScore}%` }} />
            </div>
          ) : null}

          <article className="mt-8 rounded-2xl bg-[var(--surface-muted)] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[var(--line)]">
                <Image src="/images/mascot/owl-holding-star.png" alt="" width={48} height={48} />
              </span>
              <div>
                <p className="text-xs font-bold text-[var(--ink-muted)]">판겨리 AI</p>
                <h2 className="mt-1 font-bold text-[var(--ink)]">최종 판결 근거</h2>
              </div>
            </div>
            {reasoning ? <p className="mt-5 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-7 text-[var(--ink)]">{reasoning}</p> : <div className="mt-5 space-y-3" aria-label="판결 근거를 불러오는 중" aria-busy="true"><div className={styles.reasonSkeleton} /><div className={`${styles.reasonSkeleton} w-4/5`} /><div className={`${styles.reasonSkeleton} w-3/5`} /></div>}
          </article>

          <div className="mt-8 flex justify-center">
            <Link href="/mypage" className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--btn-primary)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--btn-primary-hover)]">
              내 토론으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
      {children}
    </main>
  );
}

function FinalVerdictWaiting() {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDelayed(true), 30000);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="mt-7 text-sm text-[var(--ink-muted)]">
    <div className={styles.verdictLoading} role="progressbar" aria-label="최종 판결 분석 중"><span /></div>
    <p role="status" className="mt-4">{delayed ? "분석이 길어지고 있어요. 결과가 도착하면 자동으로 표시됩니다." : "AI 분석 결과를 기다리고 있어요."}</p>
  </div>;
}

function RotatingDebateQuote() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const rotate = () => {
      setQuoteIndex((current) => {
        const next = Math.floor(Math.random() * (debateQuotes.length - 1));
        return next >= current ? next + 1 : next;
      });
    };
    const firstQuote = window.setTimeout(rotate, 0);
    const timer = window.setInterval(rotate, 5000);
    return () => {
      window.clearTimeout(firstQuote);
      window.clearInterval(timer);
    };
  }, []);

  const quote = debateQuotes[quoteIndex];
  return (
    <blockquote className="mx-auto mt-8 max-w-lg text-sm font-medium leading-6 text-[var(--ink-muted)]">
      <p>“{quote.text}”</p>
      <cite className="mt-2 block text-xs font-semibold not-italic text-[var(--ink-faint)]">- {quote.author} -</cite>
    </blockquote>
  );
}

export function DebateFinalVerdictSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-8 sm:py-12"
      aria-label="최종 판결 불러오는 중"
      aria-busy="true"
    >
      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_16px_50px_rgba(16,24,40,0.08)] motion-safe:animate-pulse">
        <div className="px-6 py-10 text-center sm:px-10 sm:py-12">
          <div className="mx-auto h-7 w-20 rounded-full bg-slate-100" />
          <div className="mx-auto mt-5 h-8 w-3/5 rounded-lg bg-slate-200" />
          <div className="mx-auto mt-7 h-4 w-36 rounded bg-slate-100" />
          <div className="mx-auto mt-3 h-10 w-44 rounded-lg bg-slate-200" />
        </div>
        <div className="border-t border-[var(--line)] px-6 py-8 sm:px-10 sm:py-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 rounded-2xl bg-blue-50" />
            <div className="h-28 rounded-2xl bg-rose-50" />
          </div>
          <div className="mt-5 h-4 rounded-full bg-slate-100" />
          <div className="mt-8 h-40 rounded-2xl bg-slate-100" />
        </div>
      </section>
      <section className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-7">
        <div className="mb-6 h-6 w-32 rounded bg-slate-200 motion-safe:animate-pulse" />
        <DebateMessagesSkeleton label="지난 토론 내용 불러오는 중" />
      </section>
    </main>
  );
}

function Score({ position, score, mine }: { position: Position; score: number | null; mine: boolean }) {
  const pros = position === "PROS";
  return (
    <div className={`rounded-2xl border p-4 text-center ${pros ? "border-blue-100 bg-blue-50" : "border-rose-100 bg-rose-50"}`}>
      <div className="flex items-center justify-center gap-1.5">
        <span className={`text-md font-bold ${pros ? "text-blue-700" : "text-rose-700"}`}>{pros ? "찬성" : "반대"}</span>
        {mine ? <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-muted)]">나</span> : null}
      </div>
      <p className={`mt-2 text-3xl font-bold sm:text-4xl ${pros ? "text-blue-700" : "text-rose-700"}`}>
        {score === null ? <span className={styles.scoreSkeleton} aria-label="평가 점수를 불러오는 중" aria-busy="true" /> : <>{scoreFormatter.format(score)}<span className="ml-1 text-base">점</span></>}
      </p>
    </div>
  );
}
