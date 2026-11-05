// Isolated browser contract test. Fixtures never enter product code or the external API.
// Run with the dev server on localhost:3000: node tests/debate-chat-design-browser.mjs
// Retain these fixtures while the responsive room and STOMP contract exist; never ship them as API responses.
// Requires local Chrome; set CHROME_PATH for another installation.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(5000) })).json();
  ws = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome debugger connection timed out")), 5000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Chrome debugger connection failed")); }, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error("CDP timed out: " + method)); }, 30_000);
    pending.set(requestId, { resolve, reject, timer });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined);
    return result.result.value;
  };
  const until = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(150);
    }
    console.error(await evaluate("JSON.stringify({active: document.activeElement?.outerHTML?.slice(0,500), input: document.querySelector('#debate-statement')?.outerHTML, dialogs: document.querySelectorAll('dialog[open]').length, text: document.body.innerText.slice(-1800)})"));
    throw new Error(`Timed out: ${expression}`);
  };
  const debate = { id: "free-test", title: "자유 토론 브라우저 검증", description: null, hostPosition: "CONS", guestPosition: "PROS", status: "IN_PROGRESS", currentStage: "FREE", turnEndsAt: new Date(Date.now() + 600000).toISOString(), turnTimeSeconds: 180, freeDebateTimeSeconds: 600, inviteToken: null };
  const message = (id, content = `이전 대화 ${id}`, role = "HOST") => ({ id: String(id).padStart(5, "0"), content, role, createdAt: new Date().toISOString() });
  const messages = Array.from({ length: 55 }, (_, i) => message(i + 1));
  let myRole = "HOST";
  const histories = { histories: [], verdicts: [] };
  let failStatement = false;
  let failHistory = false;
  let historyErrorStatus = 503;
  let historyReads = 0;
  let rotatingSession = false;
  let sessionRefreshes = 0;
  let sessionRefreshFailures = 0;
  let failDetail = false;
  let detailReads = 0;
  let staleDetail = null;
  let staleHistories = null;
  const postedStatements = [];
  let failOlder = true;
  let statementPosts = 0;
  const requests = [];
  ws.addEventListener("message", ({ data: raw }) => {
    const envelope = JSON.parse(raw);
    if (pending.has(envelope.id)) {
      const { resolve, reject, timer } = pending.get(envelope.id);
      clearTimeout(timer);
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
    if (path === "/api/v1/auth/refresh") {
      sessionRefreshes++;
      if (rotatingSession) {
        if (sessionRefreshFailures && sessionRefreshes > 1) { status = 503; sessionRefreshFailures--; }
        const lifetime = sessionRefreshes < 3 ? 64 : 3600;
        const payload = Buffer.from(JSON.stringify({ sub: "session-test", generation: sessionRefreshes, exp: Math.floor(Date.now() / 1000) + lifetime })).toString("base64url");
        result = { accessToken: "x." + payload + ".x", tokenType: "Bearer" };
      } else result = { accessToken: "test-session", tokenType: "Bearer" };
    }
    else if (path === "/api/v1/users/me/term-agreements/pending") result = [];
    else if (path === "/api/v1/debates/free-test") {
      detailReads++;
      if (failDetail) status = 503;
      result = staleDetail ?? debate;
    }
    else if (path === "/api/v1/debates/free-test/presence") result = { hostConnected: true, guestConnected: true };
    else if (path === "/api/v1/debates/free-test/early-end") result = { pending: false, proposerRole: null, expiresAt: null };
    else if (path === "/api/v1/debates/me") result = { items: [{ ...debate, debateId: debate.id, myRole, myPosition: myRole === "HOST" ? "CONS" : "PROS", opponent: { userId: "other", nickname: "상대", profileImageKey: null } }], hasNext: false, nextCursor: null };
    else if (path === "/api/v1/users/me") result = { id: "me", nickname: "테스터", email: "test@example.invalid", profileImageKey: null };
    else if (path === "/api/v1/notifications/unread-count") result = { count: 0 };
    else if (path === "/api/v1/debates/free-test/histories") {
      if (request.method === "POST") {
        statementPosts++;
        const content = JSON.parse(request.postData).content;
        postedStatements.push(content);
        if (failStatement) { status = 503; failStatement = false; }
        else {
          result = { id: "statement-" + statementPosts, stage: debate.currentStage, content, createdAt: new Date().toISOString() };
          histories.histories.push(result);
          debate.currentStage = "VERDICT_2";
          debate.turnEndsAt = null;
        }
      } else {
        historyReads++;
        if (failHistory) status = historyErrorStatus;
        result = staleHistories ?? histories;
      }
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
  await call("Page.bringToFront");
  // Keep headless Chrome visible so animation frames and focus behave like an active tab.
  await call("Emulation.setFocusEmulationEnabled", { enabled: true });
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
          const payload = JSON.parse(body.replace(/\\0$/, '') || '{}');
          window.sentMessages.push({ destination: headers.destination, ...payload });
          if (headers.destination.includes('/early-end/')) {
            if (window.rejectEarlyEndNext) {
              window.rejectEarlyEndNext = false;
              setTimeout(() => this.event('/user/queue/errors', { code: 'DEBATE_NOT_FREE_STAGE', message: '조기 종료 서버 오류 원문입니다.' }), 30);
              return;
            }
            const action = headers.destination.split('/').at(-1);
            const type = { propose: 'EARLY_END_PROPOSED', cancel: 'EARLY_END_CANCELLED', decline: 'EARLY_END_DECLINED', accept: 'EARLY_END_ACCEPTED' }[action];
            setTimeout(() => this.event('/sub/debates/free-test', { debateId: 'free-test', type, role: 'HOST', expiresAt: action === 'propose' ? new Date(Date.now() + 30000).toISOString() : null }), 30);
            return;
          }
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
  const contains = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;

  const stage = async (next, seconds = 180) => {
    debate.currentStage = next;
    debate.turnEndsAt = next.startsWith("VERDICT") || next === "FINAL_VERDICT" ? null : new Date(Date.now() + seconds * 1000).toISOString();
    await evaluate(`window.chatSocket.event('/sub/debates/free-test', ${JSON.stringify({ debateId: debate.id, type: "STAGE_CHANGED", stage: next, turnEndsAt: debate.turnEndsAt })})`);
  };
  const verdict = async (stageName, winner, status = "SUCCESS") => {
    const item = { id: stageName, stage: stageName, status, winnerPosition: status === "FAILED" ? null : winner, reasoning: status === "FAILED" ? null : "양측의 근거와 대응을 종합한 판결입니다.", participantProsScore: stageName === "FINAL_VERDICT" ? 38 : null, participantConsScore: stageName === "FINAL_VERDICT" ? 62 : null, createdAt: new Date().toISOString() };
    histories.verdicts = histories.verdicts.filter(v => v.stage !== stageName).concat(item);
    await evaluate(`window.chatSocket.event('/sub/debates/free-test', ${JSON.stringify({ debateId: debate.id, type: "VERDICT_ISSUED", stage: stageName, verdictStatus: status, winnerPosition: item.winnerPosition, reasoning: item.reasoning, participantProsScore: item.participantProsScore, participantConsScore: item.participantConsScore, submittedAt: item.createdAt })})`);
  };
  const screenshot = async (name) => {
    const result = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(profile, name + ".png"), Buffer.from(result.data, "base64"));
  };
  debate.currentStage = "REBUTTAL_PROS";
  histories.histories.push(
    { id: "opening-pros", stage: "OPENING_PROS", content: "상대의 긴 근거입니다. ".repeat(80) + "https://example.invalid/" + "longword".repeat(80), createdAt: new Date().toISOString() },
    { id: "opening-cons", stage: "OPENING_CONS", content: null, createdAt: new Date().toISOString() },
  );
  histories.verdicts.push({ id: "first", stage: "VERDICT_1", status: "SUCCESS", winnerPosition: "PROS", reasoning: "입론 중간 판결의 근거입니다.", participantProsScore: null, participantConsScore: null, createdAt: new Date().toISOString() });
  await call("Page.navigate", { url: "http://localhost:3000/debates/free-test" });
  await until("document.querySelector('#debate-statement') && !document.querySelector('#debate-statement').disabled && window.chatSocket?.readyState === 1");
  await evaluate(`(() => {
    window.momentScenes = [];
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1 && node.matches('[data-debate-moment]')) window.momentScenes.push(node.dataset.scene);
    }))).observe(document.body, { childList: true, subtree: true });
  })()`);
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null, "historical result is not replayed on entry");
  await enter("크기를 바꿔도 유지되는 초안");
  for (const [width, height] of [[320,568],[390,844],[768,1024],[1199,800],[1200,900],[1440,900],[1920,1080],[844,390]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 1200 });
    await pause(120);
    const layout = await evaluate(`(() => {
      const input = document.querySelector('#debate-statement');
      const viewport = document.querySelector('[data-debate-messages]');
      const button = document.querySelector('button[type=submit]');
      return { width: document.documentElement.scrollWidth, inner: innerWidth, inputBottom: button.getBoundingClientRect().bottom, inputTop: input.getBoundingClientRect().top, height: visualViewport.height, chatHeight: viewport.clientHeight, count: document.querySelectorAll('#debate-statement').length, value: input.value };
    })()`);
    assert.ok(layout.width <= layout.inner, "no horizontal overflow at " + width);
    assert.ok(layout.inputBottom <= layout.height + 1 && layout.inputTop >= 0, "composer visible at " + width + ": " + JSON.stringify(layout));
    assert.ok(layout.chatHeight >= 70, "chat retains reading area at " + width);
    assert.equal(layout.count, 1);
    assert.equal(layout.value, "크기를 바꿔도 유지되는 초안");
    if ([390,768,1440].includes(width)) await screenshot("room-" + width);
  }
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelector('[aria-label=\"토론 정보 및 진행 단계\"]').focus(); document.querySelector('[aria-label=\"토론 정보 및 진행 단계\"]').click()");
  await until("document.querySelector('dialog[open]')");
  assert.equal(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"), true, "dialog owns focus");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await until("!document.querySelector('dialog[open]')");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "토론 정보 및 진행 단계", "dialog restores trigger focus");
  await evaluate("document.querySelector('[data-debate-messages]').scrollTop = 0; document.querySelector('[data-debate-messages]').dispatchEvent(new Event('scroll'))");
  await until(contains("최근 발언으로"));
  const topBefore = await evaluate("document.querySelector('[data-debate-messages]').scrollTop");
  await enter("예약을 취소하면 돌아오는 초안");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until(contains("예약됨"));
  assert.equal(statementPosts, 0, "reservation is not submitted during opponent turn");
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('취소하기')).click()");
  await until("document.querySelector('#debate-statement').value === '예약을 취소하면 돌아오는 초안'");
  await until("document.activeElement.id === 'debate-statement'");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until(contains("예약됨"));
  failStatement = true;
  await stage("REBUTTAL_CONS");
  await until(contains("이전 대화 조회 오류 원문"));
  assert.equal(await evaluate("document.querySelector('[role=alert]')"), null);
  assert.equal(statementPosts, 1, "scheduled statement sent once");
  assert.equal(await evaluate("document.querySelector('#debate-statement').value"), "예약을 취소하면 돌아오는 초안", "failed reservation restores text");
  await until("document.querySelector('[data-debate-moment]')?.dataset.position === 'CONS'");
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]').textContent.includes('내 차례')"), true, "CONS user is not assumed to be opponent");
  await stage("REBUTTAL_CONS", -1);
  await until("document.querySelector('#debate-statement').disabled");
  await evaluate("document.querySelector('#debate-statement').form.requestSubmit()");
  assert.equal(statementPosts, 1, "expired statement cannot submit even via form API");
  await stage("REBUTTAL_CONS", 180);
  await until("!document.querySelector('#debate-statement').disabled");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until(contains("2차 판정을 정리하고 있습니다"));
  assert.equal(statementPosts, 2);
  assert.equal(postedStatements[0], postedStatements[1], "retry preserves exact statement");
  await verdict("VERDICT_2", "DRAW");
  await until("document.querySelector('[data-debate-moment]')?.dataset.scene === 'draw'");
  await screenshot("interim-draw");
  await stage("FREE");
  await until("!document.querySelector('#debate-statement').disabled");
  assert.equal(await evaluate("document.querySelector('#debate-statement').maxLength"), 500);
  await pause(3100);
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null, "cue dismisses");
  await verdict("VERDICT_2", "DRAW");
  await pause(200);
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null, "duplicate server verdict does not replay");
  failDetail = true;
  await enter("조회 지연 중에도 유지되는 초안");
  await stage("FREE");
  await pause(200);
  const readsAtFailure = detailReads;
  assert.equal(await evaluate(contains("이전 대화 조회 오류 원문")), false, "temporary read errors are quiet");
  assert.equal(await evaluate("document.querySelector('#debate-statement').value"), "조회 지연 중에도 유지되는 초안");
  failDetail = false;
  await pause(3500);
  assert.ok(detailReads > readsAtFailure, "detail polling resumes automatically after an error");
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('조기 종료 제안')).click()");
  await until("document.querySelector('dialog[open]')");
  await evaluate("window.rejectEarlyEndNext = true");
  await evaluate("[...document.querySelector('dialog[open]').querySelectorAll('button')].find(b => b.textContent.trim() === '조기 종료 제안').click()");
  await until(contains("조기 종료 서버 오류 원문입니다."));
  await evaluate("[...document.querySelector('dialog[open]').querySelectorAll('button')].find(b => b.textContent.trim() === '조기 종료 제안').click()");
  await until(contains("제안 취소"));
  await evaluate("[...document.querySelector('dialog[open]').querySelectorAll('button')].find(b => b.textContent.includes('제안 취소')).click()");
  await until("!document.querySelector('dialog[open]')");
  await call("Emulation.setTouchEmulationEnabled", { enabled: true });
  await enter("모바일 줄바꿈");
  const beforeTouch = await evaluate("window.sentMessages.length");
  await evaluate("document.querySelector('#debate-statement').dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}))");
  assert.equal(await evaluate("window.sentMessages.length"), beforeTouch, "touch Enter never sends");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until("document.querySelector('#debate-statement').value === ''");
  await call("Emulation.setTouchEmulationEnabled", { enabled: false });
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await stage("FINAL_VERDICT");
  await until(contains("판겨리 AI가 토론을 분석하고 있습니다"));
  assert.equal(await evaluate("document.querySelector('[role=progressbar]').hasAttribute('aria-valuenow')"), false, "AI waiting has no fabricated percentage");
  assert.equal(await evaluate(contains("결과 다시 확인")), false, "pending results have no manual recheck button");
  await screenshot("final-waiting");
  staleDetail = { ...debate, currentStage: "FREE", turnEndsAt: new Date(Date.now() + 180000).toISOString() };
  staleHistories = structuredClone(histories);
  await verdict("FINAL_VERDICT", "CONS");
  debate.status = "FINISHED";
  debate.winnerPosition = "CONS";
  await until(contains("반대 측 승리"));
  await until("document.querySelector('[data-debate-moment]')?.dataset.scene === 'victory'");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-debate-moment] img')).animationName"), "none", "reduced motion stops the animation");
  assert.equal(await evaluate(contains("62점")), true);
  await screenshot("final-victory-reduced");
  await pause(3100);
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null);
  assert.equal(await evaluate("document.querySelector('#debate-statement')"), null);
  assert.equal(await evaluate(contains("반대 측 승리")), true, "stale REST cannot erase the live final result");
  await verdict("FINAL_VERDICT", "CONS");
  await pause(200);
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null);
  assert.equal(await evaluate("window.momentScenes.filter(scene => scene === 'victory').length"), 1, "final result is animated once");
  staleDetail = null;
  staleHistories = null;
  // Reloaded final results are persistent, not replayed celebrations.
  await call("Page.reload");
  await until(contains("반대 측 승리"));
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null);
  histories.verdicts.at(-1).participantConsScore = null;
  await call("Page.reload");
  await until(contains("평가 점수를 정리하고 있어요."));
  assert.equal(await evaluate("document.querySelectorAll('[aria-label=\"평가 점수를 불러오는 중\"]').length"), 2);
  assert.equal(await evaluate(contains("반대 측 승리")), true, "missing score does not turn success into failure");
  assert.equal(await evaluate(contains("최종 판결 안내")), false);
  histories.verdicts.at(-1).participantConsScore = 62;
  await until(contains("62점"));
  assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null, "score hydration does not replay the final animation");
  histories.verdicts.at(-1).status = "FAILED";
  histories.verdicts.at(-1).winnerPosition = null;
  await call("Page.reload");
  await until(contains("이번 토론의 판결은 제공되지 않았습니다"));
  assert.equal(await evaluate(contains("무승부")), true, "earlier interim draw remains in history only");
  failHistory = true;
  await call("Page.reload");
  await until("document.querySelector('[aria-label=\"최종 판결 불러오는 중\"]')");
  assert.equal(await evaluate(contains("이전 대화 조회 오류 원문")), false);
  assert.equal(await evaluate("document.querySelector('[role=alert]')"), null);
  assert.equal(await evaluate(contains("결과 다시 확인")), false, "failed fetch also recovers without the removed button");
  failHistory = false;
  await until(contains("이번 토론의 판결은 제공되지 않았습니다"));
  // Regression fixtures for PR #72: cached histories must not hide terminal read errors.
  const savedHistories = structuredClone(histories);
  const completedFinal = { ...savedHistories.verdicts.find(item => item.stage === "FINAL_VERDICT"), status: "SUCCESS", winnerPosition: "CONS", participantProsScore: 38, participantConsScore: 62 };
  histories.verdicts = histories.verdicts.filter(item => item.stage !== "FINAL_VERDICT");
  await call("Page.reload");
  await until(contains("판겨리 AI가 토론을 분석하고 있습니다"));
  failHistory = true;
  historyErrorStatus = 403;
  await until(contains("판결 다시 불러오기"));
  assert.equal(await evaluate(contains("이전 대화 조회 오류 원문")), true);
  assert.equal(await evaluate(contains("판겨리 AI가 토론을 분석하고 있습니다")), false, "terminal failure stops the waiting screen even with cached history");
  assert.equal(await evaluate(contains("상대의 긴 근거입니다.")), true, "cached history remains readable");
  const stoppedReads = historyReads;
  await pause(3300);
  assert.equal(historyReads, stoppedReads, "access failure stops automatic history polling");
  failHistory = false;
  histories.verdicts.push({ ...completedFinal });
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === '판결 다시 불러오기').click()");
  await until(contains("62점"));
  assert.equal(await evaluate(contains("이전 대화 조회 오류 원문")), false);
  // An incomplete cached final result also exposes the error and can be hydrated by retry.
  histories.verdicts.at(-1).participantConsScore = null;
  await call("Page.reload");
  await until(contains("평가 점수를 정리하고 있어요."));
  failHistory = true;
  await until(contains("판결 다시 불러오기"));
  assert.equal(await evaluate(contains("반대 측 승리")), true, "partial result stays visible with the error");
  failHistory = false;
  histories.verdicts.at(-1).participantConsScore = 62;
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === '판결 다시 불러오기').click()");
  await until(contains("62점"));
  // No-cache terminal failure has the same recovery action.
  failHistory = true;
  await call("Page.reload");
  await until(contains("판결 다시 불러오기"));
  assert.equal(await evaluate(contains("이전 대화 조회 오류 원문")), true);
  failHistory = false;
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === '판결 다시 불러오기').click()");
  await until(contains("62점"));
  // A final event may overtake the intermediate history snapshot. Backfill without hiding the final result.
  histories.histories = ["OPENING_PROS", "OPENING_CONS", "REBUTTAL_PROS", "REBUTTAL_CONS"].map((stage, index) => ({ id: "backfill-" + index, stage, content: "기록 " + stage, createdAt: new Date().toISOString() }));
  histories.verdicts = [{ ...completedFinal }];
  await call("Page.reload");
  await until(contains("62점"));
  const readsBeforeBackfill = historyReads;
  histories.verdicts.unshift({ ...completedFinal, id: "late-1", stage: "VERDICT_1", reasoning: "지연된 입론 판결 근거" }, { ...completedFinal, id: "late-2", stage: "VERDICT_2", reasoning: "지연된 반론 판결 근거" });
  await until(contains("지연된 입론 판결 근거"));
  await until(contains("지연된 반론 판결 근거"));
  assert.ok(historyReads > readsBeforeBackfill);
  assert.equal(await evaluate(contains("62점")), true);
  const readsAfterBackfill = historyReads;
  await pause(3300);
  assert.equal(historyReads, readsAfterBackfill, "complete final and intermediate results stop polling");
  histories.histories = savedHistories.histories;
  histories.verdicts = savedHistories.verdicts;
  historyErrorStatus = 503;
  // Exercise the staggered VERDICT_1 -> REBUTTAL_PROS transition in both arrival orders.
  for (const resultFirst of [true, false]) {
    debate.status = "IN_PROGRESS";
    debate.currentStage = "VERDICT_1";
    histories.verdicts = [];
    await call("Page.reload");
    await until(contains("1차 판정을 정리하고 있습니다"));
    await evaluate(`(() => {
      window.momentScenes = [];
      new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.matches('[data-debate-moment]')) window.momentScenes.push(node.dataset.scene);
      }))).observe(document.body, {childList:true, subtree:true});
    })()`);
    if (resultFirst) {
      await verdict("VERDICT_1", "PROS");
      await until("document.querySelector('[data-debate-moment]')?.dataset.scene === 'result'");
      await stage("REBUTTAL_PROS");
    } else {
      await stage("REBUTTAL_PROS");
      await pause(150);
      assert.equal(await evaluate("document.querySelector('[data-debate-moment]')"), null);
      await verdict("VERDICT_1", "PROS");
      await until("document.querySelector('[data-debate-moment]')?.dataset.scene === 'result'");
    }
    await pause(3100);
    assert.deepEqual(await evaluate("window.momentScenes"), ["result"], "one transition has one overlay in either arrival order");
  }
  // A reconnect can skip the reserved turn entirely. Keep the draft, never send it in a later stage.
  debate.status = "IN_PROGRESS";
  debate.currentStage = "REBUTTAL_PROS";
  histories.histories = histories.histories.filter(item => item.stage.startsWith("OPENING"));
  histories.verdicts = histories.verdicts.filter(item => item.stage === "VERDICT_1");
  await call("Page.reload");
  await until("document.querySelector('#debate-statement') && !document.querySelector('#debate-statement').disabled");
  await enter("놓친 차례의 예약은 초안으로 남겨주세요");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until(contains("예약됨"));
  const postsBeforeSkippedTurn = statementPosts;
  await stage("REBUTTAL_CONS", -1);
  await pause(200);
  assert.equal(statementPosts, postsBeforeSkippedTurn, "an expired reserved turn must not submit automatically");
  await stage("FREE");
  await until("document.querySelector('#debate-statement').value === '놓친 차례의 예약은 초안으로 남겨주세요'");
  assert.equal(statementPosts, postsBeforeSkippedTurn, "a skipped reservation is not submitted in a different stage");
  assert.equal(await evaluate(contains("예약됨")), false);
  // Token rotation keeps the room DOM, draft, cached history and pending reservation.
  rotatingSession = true;
  sessionRefreshes = 0;
  sessionRefreshFailures = 1;
  debate.currentStage = "REBUTTAL_PROS";
  debate.turnEndsAt = new Date(Date.now() + 180000).toISOString();
  await call("Page.reload");
  await until("document.querySelector('#debate-statement') && !document.querySelector('#debate-statement').disabled");
  await enter("토큰 갱신 뒤에도 보존할 초안");
  await evaluate("window.preservedComposer = document.querySelector('#debate-statement'); window.sessionScenes = []; new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1 && node.matches('[data-debate-moment]')) window.sessionScenes.push(node.dataset.scene); }))).observe(document.body, {childList:true,subtree:true})");
  for (let i = 0; i < 100 && sessionRefreshes < 2; i++) await pause(150);
  assert.equal(sessionRefreshes, 2, "the first rotation fails temporarily");
  assert.equal(await evaluate("location.pathname"), "/debates/free-test");
  assert.equal(await evaluate("document.querySelector('#debate-statement').value"), "토큰 갱신 뒤에도 보존할 초안");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until(contains("예약됨"));
  const pendingTermsReads = requests.filter(path => path === "/api/v1/users/me/term-agreements/pending").length;
  const postsBeforeRotation = statementPosts;
  for (let i = 0; i < 100 && sessionRefreshes < 3; i++) await pause(150);
  assert.equal(sessionRefreshes, 3, "the scheduled retry succeeds");
  await pause(500);
  assert.equal(await evaluate("window.preservedComposer === document.querySelector('#debate-statement')"), true, "rotation must not remount the composer");
  assert.equal(await evaluate(contains("예약됨")), true);
  assert.equal(statementPosts, postsBeforeRotation, "refresh does not submit the reservation");
  assert.equal(requests.filter(path => path === "/api/v1/users/me/term-agreements/pending").length, pendingTermsReads, "rotation reuses the verified terms result");
  assert.deepEqual(await evaluate("window.sessionScenes"), [], "rotation does not replay turn/verdict overlays");
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('취소하기')).click()");
  await until("document.querySelector('#debate-statement').value === '토큰 갱신 뒤에도 보존할 초안'");
  assert.deepEqual(errors, []);
  assert.equal(topBefore, 0);
  console.log("PASS: responsive layout, existing chat/compose design, reservation/cancel, intermediate/final dedup in both event orders, stale REST protection, indeterminate waiting, automatic final recovery, missing scores, early end, touch Enter, reduced motion, session rotation/retry preserving draft and reservation");
  console.log("Screenshots: " + profile);
  await call("Browser.close");
} finally {
  ws?.close();
  chrome.kill("SIGTERM");
}
