// Isolated browser contract test. Fixtures never enter product code or the external API.
// Run with the dev server on localhost:3000: node tests/debate-verdict-browser.mjs
// Requires local Chrome; set CHROME_PATH for another installation.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "pangyeori-verdict-test-"));
const chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
try {
  let port;
  for (let i = 0; i < 60; i++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await pause(100); }
  }
  assert.ok(port, "Chrome started");
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  ws = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined);
    return result.result.value;
  };
  const until = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await pause(150);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  const debate = { id: "verdict-test", title: "AI 판결 브라우저 검증", description: null, hostPosition: "PROS", guestPosition: "CONS", status: "IN_PROGRESS", currentStage: "OPENING_PROS", turnEndsAt: new Date(Date.now() + 600000).toISOString(), turnTimeSeconds: 600, freeDebateTimeSeconds: 300, inviteToken: null };
  const data = { histories: [], verdicts: [] };
  let submits = 0;
  let historyGets = 0;
  ws.addEventListener("message", ({ data: raw }) => {
    const message = JSON.parse(raw);
    if (pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(message.error);
      else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    const path = new URL(request.url).pathname;
    let result;
    let status = 200;
    if (path === "/api/v1/auth/refresh") result = { accessToken: "test-session", tokenType: "Bearer" };
    else if (path === "/api/v1/users/me/term-agreements/pending") result = [];
    else if (path === "/api/v1/debates/verdict-test") result = debate;
    else if (path === "/api/v1/debates/me") result = { items: [{ ...debate, debateId: debate.id, myRole: "HOST", myPosition: "PROS", opponent: { userId: "guest", nickname: "상대", profileImageKey: null } }], hasNext: false, nextCursor: null };
    else if (path === "/api/v1/users/me") result = { id: "host", nickname: "테스터", email: "test@example.invalid", profileImageKey: null };
    else if (path === "/api/v1/notifications/unread-count") result = { count: 0 };
    else if (path === "/api/v1/debates/verdict-test/histories") {
      if (request.method === "POST") {
        submits++;
        status = 201;
        result = { id: "opening-pros", stage: "OPENING_PROS", content: JSON.parse(request.postData).content, createdAt: new Date().toISOString() };
        data.histories.push(result);
        debate.currentStage = "OPENING_CONS";
      } else {
        historyGets++;
        result = data;
      }
    } else { status = 404; errors.push(`Unexpected API: ${path}`); }
    const body = status >= 400
      ? { success: false, data: null, error: { code: "TEST_ERROR", message: "테스트 서버 오류 원문" } }
      : { success: true, data: result, error: null };
    void call("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") }).catch((error) => errors.push(error.message));
  });
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  // Drop API sockets to verify REST recovery. Keep the dev server's HMR socket.
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class extends EventTarget {
      constructor(url, protocols) {
        super();
        if (!String(url).includes('api.pangyeori.com')) return new NativeWebSocket(url, protocols);
        this.readyState = 0;
      }
      send() {}
      close() { this.readyState = 3; this.onclose?.({}); }
    };
  ` });
  await call("Page.navigate", { url: "http://localhost:3000/debates/verdict-test" });
  await until("document.querySelector('#debate-statement') && !document.querySelector('#debate-statement').disabled");
  await evaluate(`(() => {
    const field = document.querySelector('#debate-statement');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, '찬성 측 실제 제출 동작 검증');
    field.dispatchEvent(new Event('input', {bubbles:true}));
  })()`);
  await until("!document.querySelector('button[type=submit]').disabled");
  await evaluate("document.querySelector('#debate-statement').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))");
  await until("document.body.innerText.includes('찬성 측 실제 제출 동작 검증')");
  assert.equal(submits, 1);
  data.histories.push({ id: "opening-cons", stage: "OPENING_CONS", content: "상대의 반대 입론", createdAt: new Date().toISOString() });
  debate.currentStage = "VERDICT_1";
  debate.turnEndsAt = null;
  await until("document.body.innerText.includes('1차 판정을 정리하고 있습니다')");
  assert.equal(await evaluate("document.querySelector('#debate-statement').disabled"), true);
  const readsWhilePending = historyGets;
  await pause(3500);
  assert.equal(historyGets, readsWhilePending, "pending verdict does not poll histories");
  assert.equal(await evaluate("document.body.innerText.includes('결과 다시 확인')"), false, "retry stays hidden during the first five minutes");
  data.verdicts.push({ id: "verdict-1", stage: "VERDICT_1", status: "SUCCESS", winnerPosition: "PROS", reasoning: "찬성 측이 구체적인 근거를 제시했습니다.", createdAt: new Date().toISOString() });
  debate.currentStage = "REBUTTAL_PROS";
  await call("Page.reload");
  await until("document.body.innerText.includes('찬성 측 우세')");
  assert.equal(await evaluate("document.querySelector('#debate-statement').disabled"), false);
  const readsAfterResult = historyGets;
  await pause(3500);
  assert.equal(historyGets, readsAfterResult, "polling stops when verdict is stored");
  await call("Page.reload");
  await until("document.body.innerText.includes('찬성 측 우세')");
  data.verdicts[0].winnerPosition = "DRAW";
  await call("Page.reload");
  await until("document.body.innerText.includes('무승부')");
  data.verdicts[0] = { ...data.verdicts[0], status: "FAILED", winnerPosition: null, reasoning: null };
  await call("Page.reload");
  await until("document.body.innerText.includes('AI 판결을 완료하지 못했습니다')");
  debate.currentStage = "FREE";
  debate.turnEndsAt = new Date(Date.now() + 4000).toISOString();
  await call("Page.reload");
  await until("document.querySelector('[aria-current=step]')?.textContent.includes('자유 토론')");
  await until("document.querySelector('#debate-statement')?.disabled");
  assert.equal(await evaluate("document.querySelector('#debate-statement').placeholder"), "자유 토론 메시지 연결을 준비하고 있습니다.");
  assert.equal(submits, 1, "free debate never uses the statement API");
  await pause(4500);
  assert.equal(await evaluate("document.querySelector('#debate-statement').disabled"), true);
  assert.equal(submits, 1, "free debate does not create local mock messages");
  assert.deepEqual(errors, []);
  console.log("PASS: statement → pending without polling → verdict → free-debate disabled without mocks");
  await call("Browser.close");
} finally {
  ws?.close();
  chrome.kill("SIGTERM");
}
