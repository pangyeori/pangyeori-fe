import assert from "node:assert/strict";
import { test } from "node:test";
import { awaitingVerdictStage, canSubmitStatement, isStatementStage } from "./debateVerdict.ts";

// Fixtures model REST snapshots and missed WebSocket events; never used by product code.
const histories = [
  { id: "pros", stage: "OPENING_PROS", content: "찬성 입론", createdAt: "2026-10-12T12:00:00" },
  { id: "cons", stage: "OPENING_CONS", content: "반대 입론", createdAt: "2026-10-12T12:01:00" },
];

test("waits after both statements even if the stage event was missed", () => {
  assert.equal(awaitingVerdictStage("OPENING_PROS", undefined), null);
  assert.equal(awaitingVerdictStage("OPENING_CONS", { histories: histories.slice(0, 1), verdicts: [] }), null);
  assert.equal(awaitingVerdictStage("OPENING_CONS", { histories, verdicts: [] }), "VERDICT_1");
  assert.equal(awaitingVerdictStage("VERDICT_1", undefined), "VERDICT_1");
  assert.equal(awaitingVerdictStage("REBUTTAL_PROS", { histories, verdicts: [] }), "VERDICT_1");
});

test("persisted success or failure ends loading even if the detail snapshot is stale", () => {
  for (const status of ["SUCCESS", "FAILED"]) {
    assert.equal(awaitingVerdictStage("VERDICT_1", {
      histories,
      verdicts: [{ id: "verdict", stage: "VERDICT_1", status, winnerPosition: status === "SUCCESS" ? "DRAW" : null, reasoning: status === "SUCCESS" ? "동등한 근거" : null, createdAt: "2026-10-12T12:02:00" }],
    }), null);
  }
});

test("only ordered statement stages can submit", () => {
  for (const stage of ["OPENING_PROS", "OPENING_CONS", "REBUTTAL_PROS", "REBUTTAL_CONS"]) {
    assert.equal(isStatementStage(stage), true);
  }
  for (const stage of ["NONE", "VERDICT_1", "VERDICT_2", "FREE", "FINAL_VERDICT"]) {
    assert.equal(isStatementStage(stage), false);
  }
});

test("a stale detail response cannot reopen a submitted turn", () => {
  assert.equal(canSubmitStatement("OPENING_PROS", { histories: [], verdicts: [] }), true);
  assert.equal(canSubmitStatement("OPENING_PROS", { histories: histories.slice(0, 1), verdicts: [] }), false);
  assert.equal(canSubmitStatement("OPENING_CONS", { histories: histories.slice(0, 1), verdicts: [] }), true);
  assert.equal(canSubmitStatement("OPENING_CONS", { histories, verdicts: [] }), false);
  assert.equal(canSubmitStatement("REBUTTAL_PROS", { histories, verdicts: [] }), true);
  assert.equal(canSubmitStatement("VERDICT_2", undefined), false);
});

test("tracks the second and final verdict independently", () => {
  const rebuttals = [
    ...histories,
    { id: "rebuttal-pros", stage: "REBUTTAL_PROS", content: "찬성 반론", createdAt: "2026-10-12T12:03:00" },
    { id: "rebuttal-cons", stage: "REBUTTAL_CONS", content: "반대 반론", createdAt: "2026-10-12T12:04:00" },
  ];
  const firstVerdict = [{ id: "verdict-1", stage: "VERDICT_1", status: "SUCCESS", winnerPosition: "PROS", reasoning: "판정", createdAt: "2026-10-12T12:02:00" }];
  assert.equal(awaitingVerdictStage("REBUTTAL_CONS", { histories: rebuttals, verdicts: firstVerdict }), "VERDICT_2");
  assert.equal(awaitingVerdictStage("FINAL_VERDICT", { histories: rebuttals, verdicts: firstVerdict }), "VERDICT_2");
});
