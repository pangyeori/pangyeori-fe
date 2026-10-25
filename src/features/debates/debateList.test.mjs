import assert from "node:assert/strict";
import { test } from "node:test";

import { canReviewDebate, debateOutcome, debateStatusLabel, fetchRemainingDebatePages, isPastDebate } from "./debateList.ts";
import { isHostInvitation } from "./roomSession.ts";

test("debates are split into active and past sections with user-facing badges", () => {
  assert.equal(debateStatusLabel("WAITING"), "토론 대기중");
  for (const status of ["READY", "IN_PROGRESS", "PAUSED"]) {
    assert.equal(debateStatusLabel(status), "토론 진행중");
    assert.equal(isPastDebate(status), false);
  }
  assert.equal(isPastDebate("FINISHED"), true);
  assert.equal(isPastDebate("CANCELLED"), true);
  assert.equal(canReviewDebate("FINISHED"), true);
  assert.equal(canReviewDebate("CANCELLED"), false);
});

test("finished debates show the result from the user's position", () => {
  assert.equal(debateOutcome("PROS", "PROS"), "승리");
  assert.equal(debateOutcome("CONS", "PROS"), "패배");
  assert.equal(debateOutcome("CONS", "DRAW"), "무승부");
  assert.equal(debateOutcome("PROS", null), null);
});

test("expanding a section fetches every remaining cursor page", async () => {
  let calls = 0;
  await fetchRemainingDebatePages(true, async () => ({ hasNextPage: ++calls < 3 }));
  assert.equal(calls, 3);
});

test("only an accepted member in a waiting debate is treated as the host", () => {
  assert.equal(isHostInvitation({ guestStatus: "ACCEPTED", debateStatus: "WAITING" }), true);
  assert.equal(isHostInvitation({ guestStatus: "ACCEPTED", debateStatus: "READY" }), false);
  assert.equal(isHostInvitation({ guestStatus: "PENDING", debateStatus: "WAITING" }), false);
});
