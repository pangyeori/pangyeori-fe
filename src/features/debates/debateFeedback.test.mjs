import assert from "node:assert/strict";
import { test } from "node:test";
import { debateActionFeedback, isRecoverableReadError, readRecoveryInterval } from "./debateFeedback.ts";

test("temporary read failures recover, while access/validation failures stop automatic polling", () => {
  for (const status of [0, 408, 429, 500, 502, 503]) {
    assert.equal(isRecoverableReadError({ status }), true);
    assert.equal(readRecoveryInterval({ status }), 3000);
  }
  for (const status of [400, 401, 403, 404, 409, 410, 422]) {
    assert.equal(isRecoverableReadError({ status }), false);
    assert.equal(readRecoveryInterval({ status }), false);
  }
  assert.equal(isRecoverableReadError(null), false);
  assert.equal(readRecoveryInterval(null), false);
  assert.equal(readRecoveryInterval(new Error("offline"), 20), 30000);
});

test("ambiguous sends retain the draft and request checking the timeline, never imply success or automatic resend", () => {
  assert.match(debateActionFeedback(new Error("timeout")), /대화 내역을 확인/);
  const rejected = Object.assign(new Error("이미 제출된 발언입니다."), { status: 409 });
  assert.equal(debateActionFeedback(rejected), "이미 제출된 발언입니다.");
});
