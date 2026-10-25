import assert from "node:assert/strict";
import { test } from "node:test";
import { canSendFreeMessage, freeMessageError, groupFreeMessages, mergeFreeMessages } from "./freeDebateMessages.ts";
import { applyDebateConnectionEvent, initialDebatePresence, parseDebateConnectionEvent } from "./presenceEvents.ts";

const event = { debateId: "room", type: "FREE_MESSAGE_SENT", role: "GUEST", stage: null, messageId: "002", content: "의견입니다", submittedAt: "2026-10-18T13:30:00" };
const message = (id, role = "HOST") => ({ id, role, content: "같은 내용", createdAt: "2026-10-18T13:30:00" });

test("free messages allow a null stage, require an author/id/content/time and never change presence", () => {
  assert.deepEqual(parseDebateConnectionEvent(JSON.stringify(event), "room"), event);
  assert.equal(applyDebateConnectionEvent(initialDebatePresence, event), initialDebatePresence);
  for (const patch of [{ role: null }, { messageId: null }, { messageId: "" }, { content: null }, { submittedAt: "invalid" }, { debateId: "other" }]) {
    assert.equal(parseDebateConnectionEvent(JSON.stringify({ ...event, ...patch }), "room"), null);
  }
});

test("REST descending pages and realtime bursts merge by ID while keeping repeated text and both authors", () => {
  const realtime = [message("003"), message("004", "GUEST"), message("005")];
  const latestPage = [message("004", "GUEST"), message("003")];
  const olderPage = [message("002", "GUEST"), message("001")];
  const merged = mergeFreeMessages(latestPage, olderPage, realtime, realtime);
  assert.deepEqual(merged.map(({ id }) => id), ["001", "002", "003", "004", "005"]);
  assert.equal(merged[3].role, "GUEST");
  assert.equal(latestPage[0].id, "004", "inputs remain unchanged");
});

test("consecutive messages from the same role share one author label and one timestamp", () => {
  const grouped = groupFreeMessages([
    message("001"),
    message("002"),
    message("003", "GUEST"),
    message("004", "GUEST"),
    message("005"),
  ]);

  assert.deepEqual(grouped.map(({ startsGroup, endsGroup }) => [startsGroup, endsGroup]), [
    [true, false],
    [false, true],
    [true, false],
    [false, true],
    [true, true],
  ]);
});

test("server error text is preserved, with fallbacks only for missing or invalid messages", () => {
  const message = "  지금은 자유 토론 단계가 아닙니다.  ";
  assert.equal(freeMessageError(JSON.stringify({ code: "DEBATE_NOT_FREE_STAGE", message })), message);
  for (const raw of ["not json", "null", "{}", '{"message":" "}']) assert.match(freeMessageError(raw), /메시지를 전송하지 못했습니다/);
});

test("only connected, active FREE stages before the UTC deadline allow sends", () => {
  const debate = { status: "IN_PROGRESS", currentStage: "FREE", turnEndsAt: "2026-10-18T13:30:00" };
  const now = Date.parse("2026-10-18T13:29:59Z");
  assert.equal(canSendFreeMessage(debate, true, now), true);
  assert.equal(canSendFreeMessage(debate, false, now), false);
  assert.equal(canSendFreeMessage(debate, true, now + 1000), false);
  for (const patch of [{ status: "PAUSED" }, { status: "FINISHED" }, { currentStage: "FINAL_VERDICT" }, { turnEndsAt: null }, { turnEndsAt: "invalid" }]) {
    assert.equal(canSendFreeMessage({ ...debate, ...patch }, true, now), false);
  }
  assert.equal(canSendFreeMessage(undefined, true, now), false);
});
