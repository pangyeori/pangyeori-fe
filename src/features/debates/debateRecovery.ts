import type { DebateDetail, DebateHistories, DebateVerdict } from "./api/debates";

const stages = ["NONE", "OPENING_PROS", "OPENING_CONS", "VERDICT_1", "REBUTTAL_PROS", "REBUTTAL_CONS", "VERDICT_2", "FREE", "FINAL_VERDICT"];

// A request started before a socket event may finish after it. Never reopen an older turn.
export function mergeDebateDetailSnapshot(current: DebateDetail | undefined, incoming: DebateDetail): DebateDetail {
  if (!current || current.id !== incoming.id) return incoming;
  if (current.status === "FINISHED" && incoming.status !== "FINISHED") return current;
  if (stages.indexOf(current.currentStage) > stages.indexOf(incoming.currentStage)) return current;
  return incoming;
}

export function mergeVerdictSnapshot(current: DebateVerdict | undefined, incoming: DebateVerdict): DebateVerdict {
  if (!current || current.status !== incoming.status) return incoming;
  return {
    ...incoming,
    winnerPosition: incoming.winnerPosition ?? current.winnerPosition,
    reasoning: incoming.reasoning?.trim() ? incoming.reasoning : current.reasoning,
    participantProsScore: incoming.participantProsScore ?? current.participantProsScore,
    participantConsScore: incoming.participantConsScore ?? current.participantConsScore,
    createdAt: incoming.createdAt || current.createdAt,
  };
}

export function mergeDebateHistoriesSnapshot(current: DebateHistories | undefined, incoming: DebateHistories): DebateHistories {
  if (!current) return incoming;
  const histories = new Map(current.histories.map(item => [item.stage, item]));
  const verdicts = new Map(current.verdicts.map(item => [item.stage, item]));
  incoming.histories.forEach(item => histories.set(item.stage, item));
  incoming.verdicts.forEach(item => verdicts.set(item.stage, mergeVerdictSnapshot(verdicts.get(item.stage), item)));
  return { histories: [...histories.values()], verdicts: [...verdicts.values()] };
}
