import assert from "node:assert/strict";
import { test } from "node:test";

import { detectNewMessage } from "./debateMessages.ts";

test("shows only newly received messages while reading older messages", () => {
  const first = [{ id: "first", content: "첫 발언" }];
  assert.deepEqual(detectNewMessage(null, first, false), { latestId: "first", preview: null });

  const next = [...first, { id: "second", content: "새 발언" }];
  assert.deepEqual(detectNewMessage("first", next, false), { latestId: "second", preview: "새 발언" });
  assert.deepEqual(detectNewMessage("first", next, true), { latestId: "second", preview: null });
});
