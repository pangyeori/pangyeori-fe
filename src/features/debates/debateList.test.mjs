import assert from "node:assert/strict";
import { test } from "node:test";

import { debateStatusLabel, fetchRemainingDebatePages, isPastDebate } from "./debateList.ts";

test("debates are split into active and past sections with user-facing badges", () => {
  assert.equal(debateStatusLabel("WAITING"), "토론 대기중");
  for (const status of ["READY", "IN_PROGRESS", "PAUSED"]) {
    assert.equal(debateStatusLabel(status), "토론 진행중");
    assert.equal(isPastDebate(status), false);
  }
  assert.equal(isPastDebate("FINISHED"), true);
  assert.equal(isPastDebate("CANCELLED"), true);
});

test("expanding a section fetches every remaining cursor page", async () => {
  let calls = 0;
  await fetchRemainingDebatePages(true, async () => ({ hasNextPage: ++calls < 3 }));
  assert.equal(calls, 3);
});
