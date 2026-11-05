import assert from "node:assert/strict";
import { test } from "node:test";
import { DebateTransportError, debateActionFeedback, isRecoverableReadError, isUncertainDebateActionError, readRecoveryInterval } from "./debateFeedback.ts";

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
  assert.match(debateActionFeedback(new DebateTransportError("timeout")), /대화 내역을 확인/);
  assert.match(debateActionFeedback(Object.assign(new Error("offline"), { status: 0 })), /대화 내역을 확인/);
  const rejected = Object.assign(new Error("이미 제출된 발언입니다."), { status: 409 });
  assert.equal(debateActionFeedback(rejected), "이미 제출된 발언입니다.");
});

test("STOMP application errors and HTTP server messages remain verbatim regardless of read recovery", () => {
  for (const message of ["권한이 없습니다.", "현재 토론 단계에서는 전송할 수 없습니다.", "  입력값을 확인해주세요.  ", "timeout"]) {
    const error = new Error(message);
    assert.equal(debateActionFeedback(error), message);
    assert.equal(isUncertainDebateActionError(error), false, "early-end errors must also keep the application message");
  }
  for (const status of [400, 401, 403, 409, 422, 429, 500, 503]) {
    assert.equal(debateActionFeedback(Object.assign(new Error("서버 오류 원문"), { status })), "서버 오류 원문");
  }
  assert.equal(isUncertainDebateActionError(new DebateTransportError("closed")), true);
  assert.equal(debateActionFeedback(new Error("  ")), "작성한 내용을 확인하고 다시 보내주세요.");
});
