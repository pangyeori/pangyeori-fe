import type { DebateHistories, DebateStage, Position } from "@/features/debates/api/debates";

const statementStages: DebateStage[] = [
  "OPENING_PROS",
  "OPENING_CONS",
  "REBUTTAL_PROS",
  "REBUTTAL_CONS",
];

export function isStatementStage(stage: DebateStage) {
  return statementStages.includes(stage);
}

export function nextStatementStage(stage: DebateStage, position: Position) {
  const current = statementStages.indexOf(stage);
  if (current < 0) return null;
  return statementStages.slice(current + 1).find(item => item.endsWith(position)) ?? null;
}

export function canSubmitStatement(stage: DebateStage, data: DebateHistories | undefined) {
  return Boolean(data) && isStatementStage(stage)
    && !data?.histories.some((history) => history.stage === stage);
}

export function awaitingVerdictStage(
  stage: DebateStage,
  data: DebateHistories | undefined,
): DebateStage | null {
  const hasVerdict = (verdictStage: DebateStage) => data?.verdicts.some((verdict) => verdict.stage === verdictStage);
  const hasStatement = (statementStage: DebateStage) => data?.histories.some((history) => history.stage === statementStage);

  // The server has already moved on; missing historical intermediate results must not mask the final wait.
  if (stage === "FINAL_VERDICT") return hasVerdict("FINAL_VERDICT") ? null : "FINAL_VERDICT";
  if (stage === "FREE") return null;
  const opening = stage === "NONE" || stage.startsWith("OPENING") || stage === "VERDICT_1";
  if (opening && !hasVerdict("VERDICT_1") && (stage === "VERDICT_1"
    || Boolean(hasStatement("OPENING_PROS") && hasStatement("OPENING_CONS")))) return "VERDICT_1";
  if (!opening && !hasVerdict("VERDICT_2") && (stage === "VERDICT_2"
    || Boolean(hasStatement("REBUTTAL_PROS") && hasStatement("REBUTTAL_CONS")))) return "VERDICT_2";
  return null;
}

export function shouldPollVerdicts(stage: DebateStage, data: DebateHistories | undefined) {
  if (awaitingVerdictStage(stage, data)) return true;
  if (stage !== "FINAL_VERDICT") {
    const missing = (verdict: DebateStage, pros: DebateStage, cons: DebateStage) =>
      !data?.verdicts.some(item => item.stage === verdict)
      && Boolean(data?.histories.some(item => item.stage === pros) && data.histories.some(item => item.stage === cons));
    // Backfill delayed old results without blocking the server's current speaking stage.
    return missing("VERDICT_1", "OPENING_PROS", "OPENING_CONS") || missing("VERDICT_2", "REBUTTAL_PROS", "REBUTTAL_CONS");
  }
  const final = data?.verdicts.find(item => item.stage === "FINAL_VERDICT");
  const pros = final?.participantProsScore;
  const cons = final?.participantConsScore;
  return stage === "FINAL_VERDICT" && final?.status === "SUCCESS"
    && (!final.winnerPosition || !final.reasoning?.trim()
      || typeof pros !== "number" || typeof cons !== "number"
      || !Number.isFinite(pros) || !Number.isFinite(cons) || pros < 0 || cons < 0 || pros > 100 || cons > 100
      || Math.abs(pros + cons - 100) >= 0.001
      || final.winnerPosition !== (pros > cons ? "PROS" : cons > pros ? "CONS" : "DRAW"));
}
