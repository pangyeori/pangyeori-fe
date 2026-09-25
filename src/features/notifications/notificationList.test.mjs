import assert from "node:assert/strict";
import { test } from "node:test";

import {
  markNotificationItemsRead,
  notificationHref,
  unreadCountLabel,
} from "./notificationList.ts";

test("unread notification badge is capped at 99+", () => {
  assert.equal(unreadCountLabel(3), "3");
  assert.equal(unreadCountLabel(99), "99");
  assert.equal(unreadCountLabel(100), "99+");
});

test("host queue notifications link to the waiting room", () => {
  assert.equal(
    notificationHref("QUEUE_REQUEST_ADDED", "debate/id"),
    "/debates/debate%2Fid/waiting",
  );
  assert.equal(
    notificationHref("QUEUE_REQUEST_REMOVED", "debate-1"),
    "/debates/debate-1/waiting",
  );
  assert.equal(notificationHref("QUEUE_REQUEST_REJECTED", "debate-1"), null);
});

test("read notifications are reflected in the cached list", () => {
  const items = [
    { notificationId: "one", isRead: false },
    { notificationId: "two", isRead: false },
  ];

  assert.deepEqual(
    markNotificationItemsRead(items, "one").map(({ isRead }) => isRead),
    [true, false],
  );
  assert.deepEqual(
    markNotificationItemsRead(items).map(({ isRead }) => isRead),
    [true, true],
  );
});
