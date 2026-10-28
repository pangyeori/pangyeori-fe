import assert from "node:assert/strict";
import { test } from "node:test";
import { awaitingVerdictStage, canSubmitStatement, isStatementStage, nextStatementStage, shouldPollVerdicts } from "./debateVerdict.ts";

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
  assert.equal(awaitingVerdictStage("REBUTTAL_PROS", { histories, verdicts: [] }), null, "the current server stage wins over missing old judgments");
  assert.equal(awaitingVerdictStage("FREE", { histories, verdicts: [] }), null);
  assert.equal(shouldPollVerdicts("REBUTTAL_PROS", { histories, verdicts: [] }), true, "delayed prior verdicts still backfill in the background");
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

test("reservations bind to the next actual speaking stage and cannot target a nonexistent last turn", () => {
  assert.equal(nextStatementStage("OPENING_PROS", "CONS"), "OPENING_CONS");
  assert.equal(nextStatementStage("OPENING_CONS", "PROS"), "REBUTTAL_PROS");
  assert.equal(nextStatementStage("REBUTTAL_PROS", "CONS"), "REBUTTAL_CONS");
  assert.equal(nextStatementStage("REBUTTAL_CONS", "PROS"), null);
  assert.equal(nextStatementStage("FREE", "PROS"), null);
});

test("a stale detail response cannot reopen a submitted turn", () => {
  assert.equal(canSubmitStatement("OPENING_PROS", undefined), false, "do not submit before history recovery confirms the turn is unused");
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
  assert.equal(awaitingVerdictStage("FINAL_VERDICT", { histories: rebuttals, verdicts: firstVerdict }), "FINAL_VERDICT");
});

test("missing intermediate and final verdicts recover automatically; explicit failure stops polling", () => {
  const pending = { histories: [], verdicts: [] };
  assert.equal(shouldPollVerdicts("VERDICT_1", pending), true);
  assert.equal(shouldPollVerdicts("VERDICT_2", pending), true);
  assert.equal(shouldPollVerdicts("FINAL_VERDICT", pending), true);
  const final = { stage: "FINAL_VERDICT", status: "SUCCESS", winnerPosition: "PROS", reasoning: "근거", participantProsScore: 60, participantConsScore: 40 };
  assert.equal(shouldPollVerdicts("FINAL_VERDICT", { ...pending, verdicts: [final] }), false);
  assert.equal(shouldPollVerdicts("FINAL_VERDICT", { ...pending, verdicts: [{ ...final, participantConsScore: null }] }), true);
  assert.equal(shouldPollVerdicts("FINAL_VERDICT", { ...pending, verdicts: [{ ...final, participantConsScore: 70 }] }), true);
  assert.equal(shouldPollVerdicts("FINAL_VERDICT", { ...pending, verdicts: [{ ...final, winnerPosition: "CONS" }] }), true);
  assert.equal(shouldPollVerdicts("FINAL_VERDICT", { ...pending, verdicts: [{ ...final, status: "FAILED", winnerPosition: null, reasoning: null }] }), false);
});
