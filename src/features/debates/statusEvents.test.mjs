import assert from "node:assert/strict";
import { test } from "node:test";

import { applyStatusEvent } from "./statusEvents.ts";

test("stream events update only their matching status fields", () => {
  const waiting = { debateStatus: "WAITING", guestStatus: null, requestList: [] };
  const queued = applyStatusEvent(waiting, "queue-changed", JSON.stringify({ requestList: [{ userId: "guest-1" }] }));
  assert.equal(queued.requestList[0].userId, "guest-1");
  const accepted = applyStatusEvent(queued, "guest-status-changed", '{"guestStatus":"ACCEPTED"}');
  assert.equal(accepted.guestStatus, "ACCEPTED");
  assert.equal(applyStatusEvent(accepted, "debate-status-changed", '{"debateStatus":"READY"}').debateStatus, "READY");
  assert.strictEqual(applyStatusEvent(waiting, "snapshot", "not json"), waiting);
});
