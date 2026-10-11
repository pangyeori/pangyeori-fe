import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyDebateConnectionEvent,
  confirmDebateDeparture,
  initialDebatePresence,
  isDebateProgressEvent,
  parseDebateConnectionEvent,
  resolvePresenceStatus,
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
  assert.equal(resolvePresenceStatus("unknown", true), "entered");
  assert.equal(resolvePresenceStatus("left", true), "left");
});

test("accepts debate progress events with their required fields", () => {
  const submitted = parseDebateConnectionEvent(
    '{"debateId":"debate-1","type":"STATEMENT_SUBMITTED","role":"HOST","stage":"OPENING_PROS","content":"첫 발언","turnEndsAt":null}',
    "debate-1",
  );
  assert.ok(submitted);
  assert.equal(isDebateProgressEvent(submitted), true);
  assert.equal(submitted.content, "첫 발언");

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
});
