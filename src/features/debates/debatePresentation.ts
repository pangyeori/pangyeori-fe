import type { DebateStage, DebateVerdict, Position } from "./api/debates";

export const verdictLabels = { PROS: "찬성 측 우세", CONS: "반대 측 우세", DRAW: "무승부" };
const stageOrder = ["NONE", "OPENING_PROS", "OPENING_CONS", "VERDICT_1", "REBUTTAL_PROS", "REBUTTAL_CONS", "VERDICT_2", "FREE", "FINAL_VERDICT"];

export function latestVerdict(verdicts: DebateVerdict[] | undefined) {
  return verdicts?.reduce<DebateVerdict | undefined>((latest, verdict) =>
    !latest || stageOrder.indexOf(verdict.stage) > stageOrder.indexOf(latest.stage) ? verdict : latest, undefined);
}

export function validFinalScores(verdict: DebateVerdict) {
  const pros = verdict.participantProsScore;
  const cons = verdict.participantConsScore;
  return verdict.status === "SUCCESS" && verdict.stage === "FINAL_VERDICT"
    && typeof pros === "number" && Number.isFinite(pros) && pros >= 0 && pros <= 100
    && typeof cons === "number" && Number.isFinite(cons) && cons >= 0 && cons <= 100
    && Math.abs(pros + cons - 100) < 0.001
    && verdict.winnerPosition === (pros > cons ? "PROS" : cons > pros ? "CONS" : "DRAW");
}

export type MomentSnapshot = { stage: DebateStage; verdict?: DebateVerdict; myPosition: Position };
export type DebateMoment = {
  key: string;
  scene: "turn" | "result" | "draw" | "victory" | "defeat";
  title: string;
  caption: string;
  position: Position | "DRAW";
};

// Compare semantic stage/result identities: polling and reconnect snapshots must not replay cues.
export function nextDebateMoment(previous: MomentSnapshot | null, next: MomentSnapshot): DebateMoment | null {
  if (!previous) return null;
  const verdict = next.verdict;
  const verdictKey = (value?: DebateVerdict) => value ? `${value.stage}:${value.status}:${value.winnerPosition}` : "";
  if (verdict && verdictKey(verdict) !== verdictKey(previous.verdict)
    && (!previous.verdict || stageOrder.indexOf(verdict.stage) >= stageOrder.indexOf(previous.verdict.stage))) {
    const lastRelevantStage = verdict.stage === "VERDICT_1" ? "REBUTTAL_PROS" : verdict.stage === "VERDICT_2" ? "FREE" : "FINAL_VERDICT";
    if (stageOrder.indexOf(previous.stage) > stageOrder.indexOf(lastRelevantStage)) return null;
    const final = verdict.stage === "FINAL_VERDICT";
    // A missing judgment is explained in the timeline/result view, without an interrupting error overlay.
    if (verdict.status === "FAILED") return null;
    const winner = verdict.winnerPosition;
    if (winner !== "PROS" && winner !== "CONS" && winner !== "DRAW") return null;
    const scene = winner === "DRAW" ? "draw" : final
      ? winner === next.myPosition ? "victory" : "defeat" : "result";
    return {
      // One result cue per stage, even when REST fills fields after a socket event.
      key: verdict.stage, scene, position: winner,
      title: scene === "victory" ? "승리!" : scene === "defeat" ? "패배" : verdictLabels[winner],
      caption: final ? "토론 최종 결과" : verdict.stage === "VERDICT_1" ? "AI 1차 중간 판결 · 입론 기준" : "AI 2차 중간 판결 · 반론 기준",
    };
  }
  if (stageOrder.indexOf(next.stage) <= stageOrder.indexOf(previous.stage)) return null;
  // The first rebuttal follows the first verdict. That result owns the transition,
  // regardless of which of the two network events arrives first.
  if (next.stage === "REBUTTAL_PROS") return null;
  const position = next.stage === "OPENING_PROS" ? "PROS"
    : next.stage === "OPENING_CONS" || next.stage === "REBUTTAL_CONS" ? "CONS" : null;
  if (!position) return null;
  return { key: next.stage, scene: "turn", position, title: position === next.myPosition ? "내 차례" : "상대방 차례", caption: next.stage.startsWith("OPENING") ? "입론을 이어갑니다" : "반론을 이어갑니다" };
}
