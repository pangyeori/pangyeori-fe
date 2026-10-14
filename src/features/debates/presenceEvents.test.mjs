import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyDebateConnectionEvent,
  applyDebatePresenceSnapshot,
  confirmDebateDeparture,
  initialDebatePresence,
  isDebateProgressEvent,
  mergeDebateHistoryEvent,
  mergeDebateHistoriesEvent,
  parseDebateConnectionEvent,
} from "./presenceEvents.ts";

test("applies entered, left, and started events", () => {
  const entered = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"ENTERED","role":"HOST"}',
    "debate-1",
  );
  assert.ok(entered);
  const present = applyDebateConnectionEvent(initialDebatePresence, entered);
  assert.equal(present.roles.HOST, "entered");

  const left = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"LEFT","role":"HOST"}',
    "debate-1",
  );
  assert.ok(left);
  const reconnecting = applyDebateConnectionEvent(present, left);
  assert.equal(reconnecting.roles.HOST, "reconnecting");
  assert.equal(confirmDebateDeparture(reconnecting, "HOST").roles.HOST, "left");
  assert.equal(confirmDebateDeparture(present, "HOST").roles.HOST, "entered");

  const started = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STARTED","role":null}',
    "debate-1",
  );
  assert.ok(started);
  assert.deepEqual(applyDebateConnectionEvent(present, started).roles, {
    HOST: "entered",
    GUEST: "entered",
  });
  assert.equal(parseDebateConnectionEvent("not-json", "debate-1"), null);
});

test("restores current participants from a presence snapshot", () => {
  const restored = applyDebatePresenceSnapshot(initialDebatePresence, {
    hostConnected: false,
    guestConnected: true,
  });
  assert.deepEqual(restored.roles, { HOST: "left", GUEST: "entered" });

  const eventWon = applyDebatePresenceSnapshot({
    ...initialDebatePresence,
    roles: { HOST: "entered", GUEST: "reconnecting" },
  }, {
    hostConnected: false,
    guestConnected: false,
  }, ["HOST"]);
  assert.deepEqual(eventWon.roles, { HOST: "left", GUEST: "reconnecting" });
});

// Contract fixtures only: no requests to the external API and no product mock data.
test("verdict events accept all results and never change participant presence", () => {
  for (const winnerPosition of ["PROS", "CONS", "DRAW"]) {
    const event = parseDebateConnectionEvent(JSON.stringify({
      debateId: "debate-1", type: "VERDICT_ISSUED", role: null,
      stage: "VERDICT_1", verdictStatus: "SUCCESS", winnerPosition, reasoning: "판결 근거",
    }), "debate-1");
    assert.ok(event);
    assert.equal(isDebateProgressEvent(event), true);
    assert.equal(applyDebateConnectionEvent(initialDebatePresence, event), initialDebatePresence);
    assert.equal(mergeDebateHistoriesEvent(undefined, event), undefined, "REST supplies the verdict id and timestamp");
  }
  const failed = { debateId: "debate-1", type: "VERDICT_ISSUED", stage: "VERDICT_1", verdictStatus: "FAILED", winnerPosition: null, reasoning: null };
  assert.ok(parseDebateConnectionEvent(JSON.stringify(failed), "debate-1"));
  for (const invalid of [
    { ...failed, debateId: "other" },
    { ...failed, verdictStatus: "PENDING" },
    { ...failed, verdictStatus: "SUCCESS" },
    { ...failed, stage: "OPENING_PROS" },
    { ...failed, winnerPosition: "PROS" },
  ]) assert.equal(parseDebateConnectionEvent(JSON.stringify(invalid), "debate-1"), null);
});

test("statement cache updates preserve stored verdicts and deduplicate repeated events", () => {
  const verdicts = [{ id: "verdict-1", stage: "VERDICT_1", status: "FAILED", winnerPosition: null, reasoning: null, createdAt: "2026-10-12T12:00:00" }];
  const data = { histories: [], verdicts };
  const event = {
    debateId: "debate-1", type: "STATEMENT_SUBMITTED", role: "HOST",
    stage: "OPENING_PROS", content: "입론", submittedAt: "2026-10-12T11:59:00",
  };
  const merged = mergeDebateHistoriesEvent(data, event);
  assert.equal(merged.verdicts, verdicts);
  assert.equal(mergeDebateHistoriesEvent(merged, event).histories.length, 1);
  assert.equal(data.histories.length, 0);
});

test("accepts debate progress events with their required fields", () => {
  const submitted = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STATEMENT_SUBMITTED","role":"HOST","stage":"OPENING_PROS","content":"첫 발언","turnEndsAt":null,"submittedAt":"2026-10-11T08:40:00Z"}',
    "debate-1",
  );
  assert.ok(submitted);
  assert.equal(isDebateProgressEvent(submitted), true);
  assert.equal(submitted.content, "첫 발언");
  assert.equal(submitted.submittedAt, "2026-10-11T08:40:00Z");

  const changed = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STAGE_CHANGED","role":null,"stage":"OPENING_CONS","content":null,"turnEndsAt":"2026-10-11T12:00:00"}',
    "debate-1",
  );
  assert.ok(changed);
  assert.equal(changed.stage, "OPENING_CONS");

  assert.equal(parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STAGE_CHANGED","role":null,"stage":"UNKNOWN","turnEndsAt":null}',
    "debate-1",
  ), null);
  assert.equal(parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STATEMENT_SUBMITTED","role":"HOST","stage":"OPENING_PROS","content":null}',
    "debate-1",
  ), null);
  assert.equal(parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STATEMENT_TIMED_OUT","role":"GUEST","stage":"OPENING_CONS","content":null}',
    "debate-1",
  ), null);
});

test("merges realtime statements without duplicating a stage", () => {
  const submitted = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STATEMENT_SUBMITTED","role":"HOST","stage":"OPENING_PROS","content":"수정된 발언","submittedAt":"2026-10-11T08:40:00Z"}',
    "debate-1",
  );
  assert.ok(submitted);

  const histories = [{
    id: "history-1",
    stage: "OPENING_PROS",
    content: "기존 발언",
    createdAt: "2026-10-11T08:39:00Z",
  }];
  assert.deepEqual(mergeDebateHistoryEvent(histories, submitted), [{
    id: "history-1",
    stage: "OPENING_PROS",
    content: "수정된 발언",
    createdAt: "2026-10-11T08:40:00Z",
  }]);

  const timedOut = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STATEMENT_TIMED_OUT","role":"GUEST","stage":"OPENING_CONS","content":null,"submittedAt":"2026-10-11T08:41:00Z"}',
    "debate-1",
  );
  assert.ok(timedOut);
  assert.equal(mergeDebateHistoryEvent(histories, timedOut)?.at(-1)?.content, null);
});
