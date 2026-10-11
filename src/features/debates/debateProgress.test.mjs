import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatTurnTime,
  parseServerTime,
  remainingTurnSeconds,
  roleForPosition,
  speakingPosition,
} from "./debateProgress.ts";

test("resolves the speaking side and participant role", () => {
  assert.equal(speakingPosition("OPENING_PROS"), "PROS");
  assert.equal(speakingPosition("OPENING_CONS"), "CONS");
  assert.equal(speakingPosition("VERDICT_1"), null);
  assert.equal(roleForPosition("CONS", "CONS"), "HOST");
  assert.equal(roleForPosition("PROS", "CONS"), "GUEST");
});

test("treats timezone-less server deadlines as UTC", () => {
  const deadline = "2026-10-11T12:00:00";
  assert.equal(parseServerTime(deadline), Date.parse(`${deadline}Z`));
  assert.equal(remainingTurnSeconds(deadline, Date.parse("2026-10-11T11:59:01Z")), 59);
  assert.equal(remainingTurnSeconds(deadline, Date.parse("2026-10-11T12:00:01Z")), 0);
  assert.equal(formatTurnTime(65), "01:05");
});
