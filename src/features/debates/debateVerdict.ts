import type { DebateHistories, DebateStage } from "@/features/debates/api/debates";

export function isOpeningStage(stage: DebateStage) {
  return stage === "OPENING_PROS" || stage === "OPENING_CONS";
}

export function canSubmitOpening(stage: DebateStage, data: DebateHistories | undefined) {
  return isOpeningStage(stage)
    && !data?.histories.some((history) => history.stage === stage)
    && !data?.verdicts.some((verdict) => verdict.stage === "VERDICT_1");
}

export function isAwaitingFirstVerdict(stage: DebateStage, data: DebateHistories | undefined) {
  if (data?.verdicts.some((verdict) => verdict.stage === "VERDICT_1")) return false;
  return stage === "VERDICT_1"
    || Boolean(data?.histories.some((history) => history.stage === "OPENING_PROS")
      && data.histories.some((history) => history.stage === "OPENING_CONS"));
}
