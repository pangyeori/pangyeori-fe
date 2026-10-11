import type { DebateRole, DebateStage, Position } from "@/features/debates/api/debates";

export const debateStageLabels: Record<DebateStage, string> = {
  NONE: "양측 입장 대기",
  OPENING_PROS: "찬성 측 입론",
  OPENING_CONS: "반대 측 입론",
  VERDICT_1: "1차 판정",
  REBUTTAL_PROS: "찬성 측 반론",
  REBUTTAL_CONS: "반대 측 반론",
  VERDICT_2: "2차 판정",
  FREE: "자유 토론",
  FINAL_VERDICT: "최종 판정",
};

export function speakingPosition(stage: DebateStage): Position | null {
  if (stage === "OPENING_PROS" || stage === "REBUTTAL_PROS") return "PROS";
  if (stage === "OPENING_CONS" || stage === "REBUTTAL_CONS") return "CONS";
  return null;
}

export function roleForPosition(
  position: Position,
  hostPosition: Position,
): DebateRole {
  return position === hostPosition ? "HOST" : "GUEST";
}

export function parseServerTime(value: string | null | undefined) {
  if (!value) return Number.NaN;
  return Date.parse(value + (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? "" : "Z"));
}

export function remainingTurnSeconds(turnEndsAt: string | null, now: number) {
  const deadline = parseServerTime(turnEndsAt);
  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

export function formatTurnTime(seconds: number | null) {
  if (seconds === null) return "--:--";
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
