// Exercises the real provider callbacks with a deterministic clock and isolated React hooks.
// Test sessions and responses never enter product code or the backend.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { isSessionRejected, sessionRetryDelay } from "./sessionRecovery.ts";

const source = readFileSync(new URL("./context/AuthProvider.tsx", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function harness() {
  let now = 1_800_000_000_000, cursor = 0, rendering = false, auth;
  let nextTimer = 0;
  const hooks = [], effects = [], timers = new Map(), requests = [];
  const same = (a, b) => a?.length === b?.length && a.every((v, i) => Object.is(v, b[i]));
  const renderSoon = () => { if (!rendering) { rendering = true; queueMicrotask(() => { rendering = false; render(); }); } };
  const memo = (fn, deps) => {
    const i = cursor++;
    if (!hooks[i] || !same(hooks[i].deps, deps)) hooks[i] = { value: fn(), deps };
    return hooks[i].value;
  };
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useContext: () => auth,
    useCallback: (fn, deps) => memo(() => fn, deps), useMemo: memo,
    useState: initial => {
      const i = cursor++;
      hooks[i] ??= { value: initial };
      return [hooks[i].value, value => { hooks[i].value = typeof value === "function" ? value(hooks[i].value) : value; renderSoon(); }];
    },
    useRef: initial => { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useEffect: (fn, deps) => {
      const i = cursor++;
      if (hooks[i] && same(hooks[i].deps, deps)) return;
      effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
    },
  };
  const exports = {};
  vm.runInNewContext(js, {
    exports, require: name => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
      if (name.includes("/api/refresh")) return { refreshAccessToken: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) };
      if (name.includes("/sessionRecovery")) return { isSessionRejected, sessionRetryDelay };
      throw new Error(name);
    },
    Date: class extends Date { static now() { return now; } }, atob,
    setTimeout: (fn, ms) => { const id = ++nextTimer; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  function render() { cursor = 0; auth = exports.AuthProvider({ children: null }).props.value; while (effects.length) effects.shift()(); }
  render();
  return {
    requests, get auth() { return auth; },
    session(name, lifetime = 120_000) { return { accessToken: `x.${Buffer.from(JSON.stringify({ sub: name, exp: (now + lifetime) / 1000 })).toString("base64url")}.x`, tokenType: "Bearer" }; },
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
      }
      now = target; await flush();
    },
  };
}

async function signedIn() {
  const h = harness(), session = h.session("initial");
  h.requests[0].resolve(session); await flush();
  return { h, session };
}

test("a transient refresh failure preserves the session and retries with a stable cache identity", async () => {
  const { h, session } = await signedIn();
  await h.advance(60_000);
  h.requests[1].reject({ status: 503 }); await flush();
  assert.equal(h.auth.accessToken, session.accessToken);
  await h.advance(2999); assert.equal(h.requests.length, 2);
  await h.advance(1); assert.equal(h.requests.length, 3);
  const rotated = h.session("rotated"); h.requests[2].resolve(rotated); await flush();
  assert.equal(h.auth.accessToken, rotated.accessToken);
  assert.equal(h.auth.sessionKey, session.accessToken);
  await h.advance(57_000);
  assert.equal(h.auth.accessToken, rotated.accessToken, "the old expiry callback was cancelled");
});

test("late bootstrap success and failure cannot overwrite a newer sign-in", async () => {
  for (const success of [true, false]) {
    const h = harness(), current = h.session("new-signin");
    h.auth.setSession(current); await flush();
    if (success) h.requests[0].resolve(h.session("old-bootstrap"));
    else h.requests[0].reject({ status: 401 });
    await flush(); assert.equal(h.auth.accessToken, current.accessToken);
    assert.equal(h.auth.isReady, true);
  }
});

test("malformed refresh payloads retain the valid token and do not disable later retries", async () => {
  for (const payload of [null, {}, { accessToken: "", tokenType: "Bearer" }]) {
    const { h, session } = await signedIn(); await h.advance(60_000);
    h.requests[1].resolve(payload); await flush();
    assert.equal(h.auth.accessToken, session.accessToken);
    await h.advance(3000); assert.equal(h.requests.length, 3);
  }
  const h = harness(); h.requests[0].resolve(null); await flush();
  assert.equal(h.auth.isReady, true); assert.equal(h.auth.accessToken, null);
});

test("a repeated short-lived token keeps expiry protection without a tight refresh loop", async () => {
  const h = harness(), session = h.session("short", 55_000);
  h.requests[0].resolve(session); await flush();
  await h.advance(999); assert.equal(h.requests.length, 1);
  await h.advance(1); assert.equal(h.requests.length, 2);
  h.requests[1].resolve(session); await flush();
  await h.advance(1000); assert.equal(h.requests.length, 3);
  await h.advance(53_000); assert.equal(h.auth.accessToken, null);
});

test("late refresh success and rejection cannot undo a logout or newer sign-in", async () => {
  for (const logout of [true, false]) {
    for (const success of [true, false]) {
      const { h } = await signedIn(); await h.advance(60_000);
      const next = h.session("new-signin");
      if (logout) h.auth.clearAuth(); else h.auth.setSession(next);
      await flush();
      if (success) h.requests[1].resolve(h.session("old-refresh"));
      else h.requests[1].reject({ status: 401 });
      await flush(); assert.equal(h.auth.accessToken, logout ? null : next.accessToken);
    }
  }
});

test("rejected credentials and an expired token with a stalled refresh end the session", async () => {
  for (const status of [401, 403]) {
    const { h } = await signedIn(); await h.advance(60_000);
    h.requests[1].reject({ status }); await flush();
    assert.equal(h.auth.accessToken, null);
  }
  const { h } = await signedIn(); await h.advance(120_000);
  assert.equal(h.auth.accessToken, null);
  h.requests[1].resolve(h.session("late")); await flush();
  assert.equal(h.auth.accessToken, null, "an expired session cannot be restored by a late response");
});
