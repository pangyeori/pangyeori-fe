import type { DebateVerdict } from "@/features/debates/api/debates";

const resultLabels = { PROS: "찬성 측 우세", CONS: "반대 측 우세", DRAW: "무승부" };

export function DebateVerdictCard({ verdict }: { verdict: DebateVerdict }) {
  const failed = verdict.status === "FAILED";

  return (
    <article className={`rounded-2xl border p-5 ${failed ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`} aria-label="AI 1차 판결 결과">
      <p className="text-xs font-bold text-[var(--ink-muted)]">판결이 · AI 1차 판결</p>
      <h3 className="mt-2 text-lg font-bold text-[var(--ink)]">
        {failed ? "AI 판결을 완료하지 못했습니다" : verdict.winnerPosition ? resultLabels[verdict.winnerPosition] : "판결 결과 확인 중"}
      </h3>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--ink)]">
        {failed ? "서버에서 AI 판결에 실패했습니다. 이번 입론의 판결 결과는 제공되지 않습니다." : verdict.reasoning}
      </p>
      {!failed ? <p className="mt-3 text-xs text-[var(--ink-muted)]">양측 입론을 바탕으로 한 중간 판결입니다. 최종 결과는 아닙니다.</p> : null}
    </article>
  );
}
