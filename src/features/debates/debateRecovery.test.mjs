import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeDebateDetailSnapshot, mergeDebateHistoriesSnapshot } from "./debateRecovery.ts";

// Out-of-order REST/socket fixtures only; never imported by product code.
const detail = { id: "room", status: "IN_PROGRESS", currentStage: "FREE", turnEndsAt: null };
const final = { id: "final", stage: "FINAL_VERDICT", status: "SUCCESS", winnerPosition: "CONS", reasoning: "최종 근거", participantProsScore: 40, participantConsScore: 60, createdAt: "2026-10-28T01:00:00Z" };

test("late responses cannot reopen an earlier turn or an ended debate", () => {
  const ended = { ...detail, status: "FINISHED", currentStage: "FINAL_VERDICT" };
  assert.equal(mergeDebateDetailSnapshot(ended, detail), ended);
  assert.equal(mergeDebateDetailSnapshot(detail, { ...detail, currentStage: "VERDICT_2" }), detail);
  assert.deepEqual(mergeDebateDetailSnapshot(detail, ended), ended);
  const other = { ...detail, id: "other", currentStage: "NONE" };
  assert.equal(mergeDebateDetailSnapshot(ended, other), other);
});

test("a stale REST snapshot cannot erase the socket result or duplicate a verdict", () => {
  const current = { histories: [], verdicts: [final] };
  assert.deepEqual(mergeDebateHistoriesSnapshot(current, { histories: [], verdicts: [] }), current);
  const next = mergeDebateHistoriesSnapshot(current, { histories: [], verdicts: [{ ...final, id: "persisted", reasoning: null, participantConsScore: null }] });
  assert.equal(next.verdicts.length, 1);
  assert.equal(next.verdicts[0].id, "persisted");
  assert.equal(next.verdicts[0].reasoning, final.reasoning);
  assert.equal(next.verdicts[0].participantConsScore, 60);
});

test("an explicit failed verdict clears old success fields", () => {
  const failed = { ...final, status: "FAILED", winnerPosition: null, reasoning: null, participantProsScore: null, participantConsScore: null };
  assert.deepEqual(mergeDebateHistoriesSnapshot({ histories: [], verdicts: [final] }, { histories: [], verdicts: [failed] }).verdicts, [failed]);
});
