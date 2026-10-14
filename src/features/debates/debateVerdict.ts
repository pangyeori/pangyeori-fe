import type { DebateHistories, DebateStage } from "@/features/debates/api/debates";

const statementStages: DebateStage[] = [
  "OPENING_PROS",
  "OPENING_CONS",
  "REBUTTAL_PROS",
  "REBUTTAL_CONS",
];

export function isStatementStage(stage: DebateStage) {
  return statementStages.includes(stage);
}

export function canSubmitStatement(stage: DebateStage, data: DebateHistories | undefined) {
  return isStatementStage(stage)
    && !data?.histories.some((history) => history.stage === stage);
}

export function awaitingVerdictStage(
  stage: DebateStage,
  data: DebateHistories | undefined,
): DebateStage | null {
  const hasVerdict = (verdictStage: DebateStage) => data?.verdicts.some((verdict) => verdict.stage === verdictStage);
  const hasStatement = (statementStage: DebateStage) => data?.histories.some((history) => history.stage === statementStage);

  if (!hasVerdict("VERDICT_1") && (stage === "VERDICT_1"
    || Boolean(hasStatement("OPENING_PROS") && hasStatement("OPENING_CONS")))) return "VERDICT_1";
  if (!hasVerdict("VERDICT_2") && (stage === "VERDICT_2"
    || Boolean(hasStatement("REBUTTAL_PROS") && hasStatement("REBUTTAL_CONS")))) return "VERDICT_2";
  if (!hasVerdict("FINAL_VERDICT") && stage === "FINAL_VERDICT") return "FINAL_VERDICT";
  return null;
}
