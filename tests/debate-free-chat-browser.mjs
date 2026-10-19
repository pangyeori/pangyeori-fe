// Isolated browser contract test. Fixtures never enter product code or the external API.
// Run with the dev server on localhost:3000: node tests/debate-free-chat-browser.mjs
// Requires local Chrome; set CHROME_PATH for another installation.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "pangyeori-free-chat-test-"));
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
  const debate = { id: "free-test", title: "자유 토론 브라우저 검증", description: null, hostPosition: "CONS", guestPosition: "PROS", status: "IN_PROGRESS", currentStage: "FREE", turnEndsAt: new Date(Date.now() + 600000).toISOString(), turnTimeSeconds: 180, freeDebateTimeSeconds: 600, inviteToken: null };
  const message = (id, content = `이전 대화 ${id}`, role = "HOST") => ({ id: String(id).padStart(5, "0"), content, role, createdAt: new Date().toISOString() });
  const messages = Array.from({ length: 55 }, (_, i) => message(i + 1));
  let myRole = "HOST";
  let failOlder = true;
  let historiesReads = 0;
  let statementPosts = 0;
  const requests = [];
  ws.addEventListener("message", ({ data: raw }) => {
    const envelope = JSON.parse(raw);
    if (pending.has(envelope.id)) {
      const { resolve, reject } = pending.get(envelope.id);
      pending.delete(envelope.id);
      if (envelope.error) reject(envelope.error);
      else resolve(envelope.result);
    }
    if (envelope.method === "Runtime.exceptionThrown") errors.push(envelope.params.exceptionDetails.text);
    if (envelope.method !== "Fetch.requestPaused") return;
    const { requestId, request } = envelope.params;
    const url = new URL(request.url);
    const path = url.pathname;
    requests.push(path);
    let result;
    let status = 200;
    if (path === "/api/v1/auth/refresh") result = { accessToken: "test-session", tokenType: "Bearer" };
    else if (path === "/api/v1/users/me/term-agreements/pending") result = [];
    else if (path === "/api/v1/debates/free-test") result = debate;
    else if (path === "/api/v1/debates/free-test/presence") result = { hostConnected: true, guestConnected: true };
    else if (path === "/api/v1/debates/me") result = { items: [{ ...debate, debateId: debate.id, myRole, myPosition: myRole === "HOST" ? "CONS" : "PROS", opponent: { userId: "other", nickname: "상대", profileImageKey: null } }], hasNext: false, nextCursor: null };
    else if (path === "/api/v1/users/me") result = { id: "me", nickname: "테스터", email: "test@example.invalid", profileImageKey: null };
    else if (path === "/api/v1/notifications/unread-count") result = { count: 0 };
    else if (path === "/api/v1/debates/free-test/histories") {
      historiesReads++;
      if (request.method === "POST") statementPosts++;
      result = { histories: [], verdicts: [] };
    } else if (path === "/api/v1/debates/free-test/free-messages") {
      assert.equal(request.method, "GET");
      if (debate.currentStage === "FREE" && Date.parse(debate.turnEndsAt) <= Date.now()) debate.currentStage = "FINAL_VERDICT";
      const cursor = url.searchParams.get("cursor");
      if (cursor && failOlder) { status = 503; failOlder = false; }
      const selected = messages.filter((item) => !cursor || item.id < cursor).sort((a, b) => b.id.localeCompare(a.id));
      const items = selected.slice(0, 50);
      result = { items, hasNext: selected.length > 50, nextCursor: selected.length > 50 ? items.at(-1).id : null };
    } else { status = 404; errors.push(`Unexpected API: ${path}`); }
    const body = status >= 400
      ? { success: false, data: null, error: { code: "TEST_ERROR", message: "이전 대화 조회 오류 원문" } }
      : { success: true, data: result, error: null };
    void call("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") }).catch((error) => errors.push(error.message));
  });
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  // Test-only STOMP peer. No fixtures or writes reach the real backend.
  // Keep while the FREE WebSocket contract exists; update alongside that contract.
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    const NativeWebSocket = window.WebSocket;
    window.sentMessages = [];
    window.ackMessages = [];
    window.chatSockets = [];
    window.sequence = 1000;
    window.WebSocket = class extends EventTarget {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      constructor(url, protocols) {
        super();
        if (new URL(String(url)).pathname !== '/ws') return new NativeWebSocket(url, protocols);
        this.readyState = 0;
        this.subscriptions = {};
        window.chatSockets.push(this);
        window.chatSocket = this;
        setTimeout(() => { this.readyState = 1; this.onopen?.({}); }, 0);
      }
      frame(text) { this.onmessage?.({ data: text + '\\0' }); }
      event(destination, payload) {
        const sub = this.subscriptions[destination];
        if (!sub || this.readyState !== 1) return;
        this.frame('MESSAGE\\nsubscription:' + sub + '\\nmessage-id:test\\ncontent-type:application/json\\n\\n' + JSON.stringify(payload));
      }
      send(raw) {
        const text = String(raw);
        const [header, body = ''] = text.split('\\n\\n');
        const [command, ...lines] = header.split('\\n');
        const headers = Object.fromEntries(lines.map(line => { const i = line.indexOf(':'); return [line.slice(0, i), line.slice(i + 1)]; }));
        if (command === 'CONNECT') this.frame('CONNECTED\\nversion:1.2\\nheart-beat:0,0\\n\\n');
        if (command === 'SUBSCRIBE') this.subscriptions[headers.destination] = headers.id;
        if (command === 'SEND') {
          const payload = JSON.parse(body.replace(/\\0$/, ''));
          window.sentMessages.push({ destination: headers.destination, ...payload });
          setTimeout(() => {
            if (window.rejectNext) {
              window.rejectNext = false;
              this.event('/user/queue/errors', { code: 'DEBATE_NOT_FREE_STAGE', message: '서버에서 보낸 오류 원문입니다.' });
              return;
            }
            if (window.holdNext) { window.holdNext = false; return; }
            const saved = { id: String(++window.sequence).padStart(5, '0'), role: window.testRole ?? 'HOST', content: payload.content, createdAt: new Date().toISOString() };
            window.ackMessages.push(saved);
            this.event('/sub/debates/free-test', { debateId: 'free-test', type: 'FREE_MESSAGE_SENT', messageId: saved.id, role: saved.role, content: saved.content, submittedAt: saved.createdAt, stage: null });
          }, 30);
        }
        if (command === 'DISCONNECT') this.close();
      }
      close() { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.({}); }
    };
  ` });
  const enter = async (content) => {
    await evaluate(`(() => {
      const field = document.querySelector('#debate-statement');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, ${JSON.stringify(content)});
      field.dispatchEvent(new Event('input', {bubbles:true}));
    })()`);
  };
  const send = async () => {
    await until("!document.querySelector('button[type=submit]').disabled");
    await evaluate("document.querySelector('#debate-statement').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))");
  };
  const contains = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
  const inject = async (items) => evaluate(`for (const item of ${JSON.stringify(items)}) window.chatSocket.event('/sub/debates/free-test', { debateId: 'free-test', type: 'FREE_MESSAGE_SENT', messageId: item.id, role: item.role, content: item.content, submittedAt: item.createdAt, stage: null })`);
  await call("Page.navigate", { url: "http://localhost:3000/debates/free-test" });
  await until("document.querySelector('#debate-statement') && !document.querySelector('#debate-statement').disabled");
  await until(contains("이전 대화 55"));
  assert.equal(await evaluate("document.querySelector('#debate-statement').maxLength"), 500);
  assert.equal(await evaluate("window.chatSockets.filter(s => s.readyState === 1).length"), 1, "one socket for presence and chat");
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('이전 대화 더 보기')).click()");
  await until(contains("이전 대화 조회 오류 원문"));
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('대화 다시 불러오기')).click()");
  await until(contains("이전 대화 1"));
  await enter("   ");
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), true);
  await enter("한글 조합 중");
  await evaluate("document.querySelector('#debate-statement').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))");
  assert.equal(await evaluate("window.sentMessages.length"), 0, "IME Enter does not send");
  await evaluate("document.querySelector('#debate-statement').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))");
  assert.equal(await evaluate("window.sentMessages.length"), 0, "Shift+Enter does not send");
  await enter("내 자유 토론 메시지");
  await send();
  await until(contains("내 자유 토론 메시지"));
  await until("document.querySelector('#debate-statement').value === '' && !document.querySelector('#debate-statement').disabled");
  assert.equal(await evaluate("window.sentMessages[0].destination"), "/pub/debates/free-test/free-messages");
  assert.equal(await evaluate("[...document.querySelectorAll('article')].find(e => e.textContent === '내 자유 토론 메시지').closest('li').classList.contains('justify-end')"), true);
  const readsBeforeBurst = historiesReads;
  const burst = Array.from({ length: 25 }, (_, i) => message(2000 + i, `연속 수신 ${i}`, "GUEST"));
  messages.push(...await evaluate("window.ackMessages"), ...burst);
  await inject([...burst, ...burst]);
  await until(contains("연속 수신 24"));
  assert.equal(await evaluate("[...document.querySelectorAll('article')].filter(e => e.textContent.startsWith('연속 수신 ')).length"), 25);
  assert.equal(historiesReads, readsBeforeBurst, "chat events do not refetch statement history");
  await evaluate("window.rejectNext = true");
  await enter("실패 시 보존할 메시지");
  await send();
  await until(contains("서버에서 보낸 오류 원문입니다."));
  assert.equal(await evaluate("document.querySelector('#debate-statement').value"), "실패 시 보존할 메시지");
  await send();
  await until("document.querySelector('#debate-statement').value === ''");
  messages.push(...await evaluate("window.ackMessages"));
  await evaluate("window.holdNext = true");
  await enter("끊김 중 입력 보존");
  await send();
  await until("document.querySelector('#debate-statement').disabled");
  await evaluate("window.chatSocket.close()");
  await until(contains("연결이 끊겨 전송 결과를 확인하지 못했습니다."));
  messages.push(...Array.from({ length: 70 }, (_, i) => message(3000 + i, `오프라인 대화 ${i}`, "GUEST")));
  await until("!document.querySelector('#debate-statement').disabled");
  await until(contains("오프라인 대화 69"));
  assert.equal(await evaluate("document.querySelector('#debate-statement').value"), "끊김 중 입력 보존");
  assert.equal(await evaluate("window.sentMessages.filter(m => m.content === '끊김 중 입력 보존').length"), 1, "reconnect never silently resends");
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, "mobile has no horizontal overflow");
  myRole = "GUEST";
  await call("Page.reload");
  await until("document.querySelector('#debate-statement') && !document.querySelector('#debate-statement').disabled");
  await evaluate("window.testRole = 'GUEST'; window.sequence = 4000");
  await enter("게스트도 자유 발언");
  await send();
  await until(contains("게스트도 자유 발언"));
  assert.equal(await evaluate("[...document.querySelectorAll('article')].find(e => e.textContent === '게스트도 자유 발언').closest('li').classList.contains('justify-end')"), true);
  messages.push(...await evaluate("window.ackMessages"));
  debate.turnEndsAt = new Date(Date.now() + 1500).toISOString();
  await evaluate(`window.chatSocket.event('/sub/debates/free-test', ${JSON.stringify({ debateId: debate.id, type: "STAGE_CHANGED", role: null, stage: "FREE", turnEndsAt: debate.turnEndsAt })})`);
  await until("document.querySelector('#debate-statement').disabled");
  await until("document.querySelector('[aria-current=step]')?.textContent.includes('최종 판정')");
  assert.equal(await evaluate(contains("게스트도 자유 발언")), true, "messages remain after FREE ends");
  assert.equal(statementPosts, 0, "free chat never posts a statement");
  assert.deepEqual(errors, []);
  console.log("PASS: both authors, STOMP sends, burst/dedup, pagination/retry, IME, server errors, reconnect recovery, mobile, deadline and final stage");
  await call("Browser.close");
} finally {
  ws?.close();
  chrome.kill("SIGTERM");
}
