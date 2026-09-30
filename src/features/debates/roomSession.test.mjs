import assert from "node:assert/strict";
import { test } from "node:test";

import { readDebateRoom, rememberDebateRoom } from "./roomSession.ts";

test("detail refresh preserves cached invitation fields", () => {
  const storage = new Map();
  globalThis.window = {};
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };

  const room = {
    debateId: "debate-1",
    title: "토론",
    description: null,
    hostPosition: "PROS",
    guestPosition: "CONS",
    turnTimeSeconds: 180,
    freeDebateTimeSeconds: 600,
    createdAt: "2026-09-30T00:00:00",
    inviteToken: "invite-token",
  };
  rememberDebateRoom(room);
  rememberDebateRoom({ ...room, createdAt: undefined, inviteToken: undefined });

  assert.equal(readDebateRoom(room.debateId)?.createdAt, room.createdAt);
  assert.equal(readDebateRoom(room.debateId)?.inviteToken, room.inviteToken);

  rememberDebateRoom({ ...room, inviteToken: null });
  assert.equal(readDebateRoom(room.debateId)?.inviteToken, null);
});
