import assert from "node:assert/strict";
import { test } from "node:test";
import { latestVerdict, nextDebateMoment, validFinalScores } from "./debatePresentation.ts";

// State-transition fixtures only; never imported into the product. Maintain with the verdict contract.
const verdict = (stage, winnerPosition = "CONS") => ({ id: stage, stage, status: "SUCCESS", winnerPosition, reasoning: "테스트 근거", participantProsScore: null, participantConsScore: null });
const snapshot = (stage, result) => ({ stage, verdict: result, myPosition: "CONS" });

test("entry, polling and older stage snapshots do not replay a turn", () => {
  const current = snapshot("REBUTTAL_CONS", verdict("VERDICT_1"));
  assert.equal(nextDebateMoment(null, current), null);
  assert.equal(nextDebateMoment(current, { ...current }), null);
  assert.equal(nextDebateMoment(current, snapshot("REBUTTAL_PROS", current.verdict)), null);
  assert.equal(nextDebateMoment(snapshot("REBUTTAL_PROS", current.verdict), current).title, "내 차례");
});

test("result wins over a simultaneous turn change and reflects the actual user's side", () => {
  const previous = snapshot("VERDICT_1");
  const result = nextDebateMoment(previous, snapshot("REBUTTAL_PROS", verdict("VERDICT_1")));
  assert.equal(result.scene, "result");
  assert.equal(result.title, "반대 측 우세");
  for (const [winner, expected] of [["CONS", "victory"], ["PROS", "defeat"], ["DRAW", "draw"]]) {
    assert.equal(nextDebateMoment(previous, snapshot("FINAL_VERDICT", verdict("FINAL_VERDICT", winner))).scene, expected);
  }
});

test("failure and missing results never become a draw or a win", () => {
  const previous = snapshot("VERDICT_1");
  assert.equal(nextDebateMoment(previous, snapshot("VERDICT_1", { ...verdict("VERDICT_1"), status: "FAILED", winnerPosition: null })), null);
  assert.equal(nextDebateMoment(previous, snapshot("VERDICT_1", verdict("VERDICT_1", null))), null);
  assert.equal(nextDebateMoment(previous, snapshot("FINAL_VERDICT", verdict("FINAL_VERDICT", "UNKNOWN"))), null);
});

test("latest result is chosen by stage, not response array order", () => {
  assert.equal(latestVerdict([verdict("FINAL_VERDICT"), verdict("VERDICT_1"), verdict("VERDICT_2")]).stage, "FINAL_VERDICT");
  assert.equal(latestVerdict([]), undefined);
});

test("only finite, in-range final scores may be displayed", () => {
  const final = { ...verdict("FINAL_VERDICT", "PROS"), participantProsScore: 62.5, participantConsScore: 37.5 };
  assert.equal(validFinalScores(final), true);
  for (const score of [null, undefined, NaN, Infinity, -1, 101]) {
    assert.equal(validFinalScores({ ...final, participantProsScore: score }), false);
  }
  assert.equal(validFinalScores({ ...final, status: "FAILED" }), false);
  assert.equal(validFinalScores({ ...final, stage: "VERDICT_1" }), false);
  assert.equal(validFinalScores({ ...final, participantConsScore: 38 }), false);
  assert.equal(validFinalScores({ ...final, winnerPosition: "CONS" }), false);
  assert.equal(validFinalScores({ ...final, winnerPosition: null }), false);
});

test("verdict and its next turn produce one result cue in either arrival order", () => {
  const pending = snapshot("VERDICT_1");
  const resultFirst = snapshot("VERDICT_1", verdict("VERDICT_1"));
  const stageFirst = snapshot("REBUTTAL_PROS");
  const settled = snapshot("REBUTTAL_PROS", verdict("VERDICT_1"));
  assert.equal(nextDebateMoment(pending, resultFirst).key, "VERDICT_1");
  assert.equal(nextDebateMoment(resultFirst, settled), null);
  assert.equal(nextDebateMoment(pending, stageFirst), null);
  assert.equal(nextDebateMoment(stageFirst, settled).key, "VERDICT_1");
  assert.equal(nextDebateMoment(snapshot("REBUTTAL_CONS"), snapshot("REBUTTAL_CONS", verdict("VERDICT_1"))), null);
});

test("a filled or corrected result has one stable animation identity per stage", () => {
  const before = snapshot("FINAL_VERDICT");
  const failed = snapshot("FINAL_VERDICT", { ...verdict("FINAL_VERDICT"), status: "FAILED", winnerPosition: null });
  const success = snapshot("FINAL_VERDICT", verdict("FINAL_VERDICT"));
  assert.equal(nextDebateMoment(before, failed), null, "a missing judgment has no interrupting error overlay");
  assert.equal(nextDebateMoment(failed, success).key, "FINAL_VERDICT");
  assert.equal(nextDebateMoment(success, { ...success, verdict: { ...success.verdict, reasoning: "더 자세한 근거" } }), null);
});
