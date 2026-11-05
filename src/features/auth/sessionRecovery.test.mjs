import assert from "node:assert/strict";
import { test } from "node:test";
import { isSessionRejected, sessionRetryDelay } from "./sessionRecovery.ts";

test("only an explicit authentication rejection invalidates a still-valid session", () => {
  for (const status of [401, 403]) assert.equal(isSessionRejected({ status }), true);
  for (const error of [null, new Error("offline"), { status: 0 }, { status: 429 }, { status: 503 }]) {
    assert.equal(isSessionRejected(error), false);
  }
});

test("refresh retries back off without outliving the access token", () => {
  assert.equal(sessionRetryDelay(0, 60_000, 0), 3000);
  assert.equal(sessionRetryDelay(1, 60_000, 0), 6000);
  assert.equal(sessionRetryDelay(20, 60_000, 0), 30_000);
  assert.equal(sessionRetryDelay(5, 20_000, 19_000), 1000);
  assert.equal(sessionRetryDelay(5, 20_000, 21_000), 0);
});
