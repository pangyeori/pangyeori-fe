import assert from "node:assert/strict";
import { test } from "node:test";
import { canSubmitOpening, isAwaitingFirstVerdict, isOpeningStage } from "./debateVerdict.ts";

// Fixtures model REST snapshots and missed WebSocket events; never used by product code.
const histories = [
  { id: "pros", stage: "OPENING_PROS", content: "찬성 입론", createdAt: "2026-10-12T12:00:00" },
  { id: "cons", stage: "OPENING_CONS", content: "반대 입론", createdAt: "2026-10-12T12:01:00" },
];

test("waits after both statements even if the stage event was missed", () => {
  assert.equal(isAwaitingFirstVerdict("OPENING_PROS", undefined), false);
  assert.equal(isAwaitingFirstVerdict("OPENING_CONS", { histories: histories.slice(0, 1), verdicts: [] }), false);
  assert.equal(isAwaitingFirstVerdict("OPENING_CONS", { histories, verdicts: [] }), true);
  assert.equal(isAwaitingFirstVerdict("VERDICT_1", undefined), true);
  assert.equal(isAwaitingFirstVerdict("REBUTTAL_PROS", { histories, verdicts: [] }), true);
});

test("persisted success or failure ends loading even if the detail snapshot is stale", () => {
  for (const status of ["SUCCESS", "FAILED"]) {
    assert.equal(isAwaitingFirstVerdict("VERDICT_1", {
      histories,
      verdicts: [{ id: "verdict", stage: "VERDICT_1", status, winnerPosition: status === "SUCCESS" ? "DRAW" : null, reasoning: status === "SUCCESS" ? "동등한 근거" : null, createdAt: "2026-10-12T12:02:00" }],
    }), false);
  }
});

test("only opening stages can submit to the currently implemented API", () => {
  assert.equal(isOpeningStage("OPENING_PROS"), true);
  assert.equal(isOpeningStage("OPENING_CONS"), true);
  for (const stage of ["NONE", "VERDICT_1", "REBUTTAL_PROS", "REBUTTAL_CONS", "FREE", "FINAL_VERDICT"]) {
    assert.equal(isOpeningStage(stage), false);
  }
});

test("a stale detail response cannot reopen a submitted turn", () => {
  assert.equal(canSubmitOpening("OPENING_PROS", { histories: [], verdicts: [] }), true);
  assert.equal(canSubmitOpening("OPENING_PROS", { histories: histories.slice(0, 1), verdicts: [] }), false);
  assert.equal(canSubmitOpening("OPENING_CONS", { histories: histories.slice(0, 1), verdicts: [] }), true);
  assert.equal(canSubmitOpening("OPENING_CONS", { histories, verdicts: [] }), false);
  assert.equal(canSubmitOpening("REBUTTAL_PROS", undefined), false);
});
