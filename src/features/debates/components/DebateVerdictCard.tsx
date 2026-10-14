"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { DebateStage, DebateVerdict } from "@/features/debates/api/debates";
import { debateStageLabels } from "@/features/debates/debateProgress";

const resultLabels = { PROS: "찬성 측 우세", CONS: "반대 측 우세", DRAW: "무승부" };

export function DebateVerdictPendingCard({ stage, isFetching, onRetry }: {
  stage: DebateStage;
  isFetching: boolean;
  onRetry: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 sm:p-5" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[var(--line)]">
          <Image src="/images/mascot/owl-holding-star.png" alt="" width={48} height={48} />
        </span>
        <div>
          <p className="text-xs font-bold text-[var(--ink-muted)]">판겨리 AI</p>
          <p className="mt-1 font-bold text-[var(--ink)] motion-safe:animate-pulse">{debateStageLabels[stage]}을 정리하고 있습니다...</p>
        </div>
      </div>
      <button className="mt-3 text-xs font-semibold text-[var(--brand-blue)] underline disabled:opacity-50" type="button" disabled={isFetching} onClick={onRetry}>
        {isFetching ? "결과 확인 중…" : "결과 다시 확인"}
      </button>
    </article>
  );
}

export function DebateVerdictCard({ verdict }: { verdict: DebateVerdict }) {
  const failed = verdict.status === "FAILED";
  const reasoning = verdict.reasoning?.trim() ?? "";
  const [visibleReasoning, setVisibleReasoning] = useState("");

  useEffect(() => {
    if (!reasoning) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setVisibleReasoning(reasoning));
      return () => window.cancelAnimationFrame(frame);
    }

    let length = 0;
    const timer = window.setInterval(() => {
      length = Math.min(reasoning.length, length + 1);
      setVisibleReasoning(reasoning.slice(0, length));
      if (length === reasoning.length) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [reasoning]);

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 sm:p-5" aria-label={`AI ${debateStageLabels[verdict.stage]} 결과`}>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[var(--line)]">
          <Image src="/images/mascot/owl-holding-star.png" alt="" width={48} height={48} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[var(--ink-muted)]">판겨리 AI</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[var(--ink)]">{debateStageLabels[verdict.stage]}</h3>
            {!failed && verdict.winnerPosition ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${verdict.winnerPosition === "PROS" ? "bg-blue-100 text-blue-700" : verdict.winnerPosition === "CONS" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"}`}>
                {resultLabels[verdict.winnerPosition]}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {failed ? (
        <p className="mt-4 text-sm leading-6 text-[var(--danger)]">AI 판결을 완료하지 못했습니다.</p>
      ) : reasoning ? (
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--ink)]" aria-label={reasoning}>
          <span aria-hidden>{visibleReasoning}</span>
          {visibleReasoning.length < reasoning.length ? <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--ink-muted)] align-middle" aria-hidden /> : null}
        </p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">판결 결과를 확인하고 있습니다.</p>
      )}
      {!failed && verdict.stage !== "FINAL_VERDICT" ? <p className="mt-3 text-xs text-[var(--ink-muted)]">중간 판결이며 최종 결과는 아닙니다.</p> : null}
    </article>
  );
}
