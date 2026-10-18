// Isolated API contract fixtures: no requests reach the real backend and no users are created.
// Run against a local dev server: node tests/terms-browser.mjs
// Fixtures remain test-only; update/remove them when the terms contract changes.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const profile = await mkdtemp(join(tmpdir(), "pangyeori-terms-test-"));
const chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let evaluate;
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
  const requests = new Map();
  const runtimeErrors = [];
  const unexpected = [];
  const calls = [];
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    requests.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async (expression) => {
    for (let i = 0; i < 160; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(150);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  const click = (text) => evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)});
    if (!button || button.disabled) throw new Error('Missing/disabled button: ' + ${JSON.stringify(text)});
    button.click();
  })()`);
  const fill = async (selector, value) => {
    await evaluate(`(() => {
      const field = document.querySelector(${JSON.stringify(selector)});
      if (!field) throw new Error('Missing input: ' + ${JSON.stringify(selector)});
      field.focus(); field.select();
    })()`);
    await call("Input.insertText", { text: value });
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).blur()`);
  };
  const selectRequired = () => evaluate(`document.querySelectorAll('label').forEach(label => {
    const input = label.querySelector('input[type=checkbox]');
    if (input && label.textContent.includes('[필수]') && !input.checked) input.click();
  })`);
  const doc = (termsId, type, title, required, version = 1) => ({
    termsId, type, title, required, version,
    content: "## 약관 본문\n\n실제 동의 대상 **원문**입니다.\n\n<script>window.unsafeTerms = true</script>\n\n[위험 링크](javascript:alert(1))",
    effectiveAt: "2026-10-01T00:00:00",
  });
  let terms = [doc("service-v1", "TERMS_OF_SERVICE", "서비스 이용약관", true), doc("privacy-v1", "PRIVACY_POLICY", "개인정보 동의", true), doc("marketing-v1", "MARKETING", "마케팅 약관", false)];
  let termsMode = "error";
  let authenticated = false;
  let pending = [];
  let pendingError = false;
  let registerAttempts = 0;
  let agreementAttempts = 0;
  let marketingAgreed = false;
  let marketingError = false;

  ws.addEventListener("message", ({ data: raw }) => {
    const message = JSON.parse(raw);
    if (requests.has(message.id)) {
      const { resolve, reject } = requests.get(message.id);
      requests.delete(message.id);
      if (message.error) reject(message.error); else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.text);
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    const path = new URL(request.url).pathname;
    const body = request.postData ? JSON.parse(request.postData) : null;
    calls.push({ path, method: request.method, body });
    let data;
    let status = 200;
    let code = "TEST_ERROR";
    let error = "서버 오류 원문";
    if (path === "/api/v1/auth/refresh") {
      if (authenticated) data = { accessToken: "terms-test-session", tokenType: "Bearer" };
      else status = 401;
    } else if (path === "/api/v1/terms") {
      if (termsMode === "error") { status = 503; error = "약관 조회 실패 원문"; }
      else if (termsMode === "empty") data = [];
      else if (termsMode === "malformed") data = {};
      else data = terms;
    } else if (path === "/api/v1/users/nickname/duplicate") data = { duplicated: false };
    else if (path.startsWith("/api/v1/email-verifications")) data = {};
    else if (path === "/api/v1/users" && request.method === "POST") {
      registerAttempts++;
      if (registerAttempts === 1) {
        status = 422; code = "TERMS_NOT_LATEST"; error = "최신 버전의 약관이 아닙니다.";
        terms = [doc("service-v2", "TERMS_OF_SERVICE", "서비스 이용약관 개정본", true, 2), ...terms.slice(1)];
      } else status = 201;
    } else if (path === "/api/v1/users/me/term-agreements/pending") {
      if (pendingError) { status = 503; error = "재동의 확인 실패 원문"; }
      else data = pending;
    } else if (path === "/api/v1/users/me/term-agreements" && request.method === "POST") {
      agreementAttempts++;
      if (agreementAttempts === 1) {
        status = 422; code = "TERMS_NOT_LATEST"; error = "최신 버전의 약관이 아닙니다.";
        pending = [doc("service-v3", "TERMS_OF_SERVICE", "서비스 이용약관 3판", true, 3)];
      } else { status = 204; pending = []; pendingError = true; }
    } else if (path.startsWith("/api/v1/users/me/term-agreements/") && request.method === "PUT") {
      if (marketingError) { status = 503; error = "마케팅 저장 실패 원문"; }
      else { status = 204; marketingAgreed = body.agreed; }
    } else if (path === "/api/v1/users/me") data = { id: "test-user", email: "terms@example.invalid", nickname: "테스터", profileImageKey: null, joinedAt: "2026-10-01T00:00:00", marketingAgreed };
    else if (path === "/api/v1/debates/me") data = { items: [], hasNext: false, nextCursor: null };
    else if (path === "/api/v1/notifications/unread-count") data = { count: 0 };
    else if (path === "/api/v1/auth/signout") { authenticated = false; status = 204; }
    else { status = 404; unexpected.push(`${request.method} ${path}`); }
    const payload = status >= 400
      ? { success: false, data: null, error: { code, message: error, details: [{ message: "대신 보여주면 안 되는 상세 오류" }] } }
      : { success: true, data, error: null };
    void call("Fetch.fulfillRequest", {
      requestId, responseCode: status,
      responseHeaders: status === 204 || status === 201 ? [] : [{ name: "Content-Type", value: "application/json" }],
      body: status === 204 || status === 201 ? "" : Buffer.from(JSON.stringify(payload)).toString("base64"),
    }).catch((error) => runtimeErrors.push(error.message));
  });
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  await call("Page.navigate", { url: `${base}/register` });
  await until("document.body.innerText.includes('약관 조회 실패 원문')");
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), true);
  termsMode = "empty";
  await click("약관 다시 불러오기");
  await until("document.body.innerText.includes('현재 확인할 수 있는 약관이 없습니다.')");
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), true);
  termsMode = "malformed";
  await click("약관 다시 불러오기");
  await until("document.body.innerText.includes('약관 정보를 확인하지 못했습니다.')");
  termsMode = "ready";
  await click("약관 다시 불러오기");
  await until("document.querySelectorAll('input[type=checkbox]').length === 4");
  await click("보기");
  await until("document.querySelector('dialog[open]')");
  assert.equal(await evaluate("Boolean(document.querySelector('dialog h2')) && !window.unsafeTerms"), true);
  assert.equal(await evaluate("document.querySelectorAll('a[href^=\"javascript:\"]').length"), 0);
  assert.equal(await evaluate("document.querySelectorAll('input[type=checkbox]:checked').length"), 0);
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await until("!document.querySelector('dialog')");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "서비스 이용약관 보기");
  await fill('[name="nickname"]', "약관테스터");
  await click("중복 확인");
  await until("document.body.innerText.includes('사용 가능한 닉네임')");
  await fill('[name="email"]', "terms@example.invalid");
  await until("document.body.innerText.includes('이메일 인증을 완료해주세요.')");
  await click("인증");
  await until("document.querySelector('[aria-label=\"이메일 인증번호 1번째 자리\"]')");
  for (let i = 1; i <= 6; i++) await fill(`[aria-label="이메일 인증번호 ${i}번째 자리"]`, String(i));
  await until("document.body.innerText.includes('이메일 인증이 완료되었습니다.')");
  await fill('[name="password"]', "password123!");
  await fill('[name="passwordConfirm"]', "password123!");
  await selectRequired();
  await until("!document.querySelector('button[type=submit]').disabled");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until("document.body.innerText.includes('서비스 이용약관 개정본')");
  assert.equal(await evaluate("document.querySelectorAll('input[type=checkbox]:checked').length"), 0);
  assert.equal(await evaluate("document.body.innerText.includes('최신 버전의 약관이 아닙니다.')"), true);
  assert.equal(await evaluate("document.querySelector('[name=nickname]').value"), "약관테스터");
  assert.deepEqual(calls.find((c) => c.path === "/api/v1/users").body.agreedTermsIds, ["service-v1", "privacy-v1"]);
  await selectRequired();
  await until("!document.querySelector('button[type=submit]').disabled");
  await evaluate("document.querySelector('button[type=submit]').click()");
  await until("location.pathname === '/register/complete'");
  assert.deepEqual(calls.filter((c) => c.path === "/api/v1/users").at(-1).body.agreedTermsIds, ["service-v2", "privacy-v1"]);
  console.log("PASS signup: query error/empty/malformed, Markdown safety, required-only payload, version recovery, 201");

  authenticated = true;
  pending = [terms[0]];
  pendingError = true;
  await call("Page.navigate", { url: `${base}/mypage` });
  await until("document.body.innerText.includes('재동의 확인 실패 원문')");
  assert.equal(await evaluate("document.body.innerText.includes('회원 정보')"), false);
  pendingError = false;
  await click("약관 다시 불러오기");
  await until("document.querySelector('button[type=submit]')");
  await selectRequired();
  await until("!document.querySelector('button[type=submit]').disabled");
  await click("동의하고 계속하기");
  await until("document.body.innerText.includes('서비스 이용약관 3판')");
  assert.equal(await evaluate("document.body.innerText.includes('최신 버전의 약관이 아닙니다.')"), true);
  assert.equal(await evaluate("document.querySelectorAll('input[type=checkbox]:checked').length"), 0);
  await selectRequired();
  await until("!document.querySelector('button[type=submit]').disabled");
  await click("동의하고 계속하기");
  await until("document.body.innerText.includes('재동의 확인 실패 원문')");
  assert.equal(await evaluate("document.body.innerText.includes('회원 정보')"), false);
  pendingError = false;
  await click("약관 다시 불러오기");
  await until("document.querySelector('[role=switch]')");
  assert.deepEqual(calls.filter((c) => c.path === "/api/v1/users/me/term-agreements").map((c) => c.body), [{ termsIds: ["service-v2"] }, { termsIds: ["service-v3"] }]);
  console.log("PASS pending consent: failure blocks entry, revision needs fresh selection, 204 requires confirmed re-query");

  assert.equal(await evaluate("[...document.querySelectorAll('[aria-haspopup=dialog]')].filter(button => button.textContent.trim() === '보기').length"), 1);
  await click("보기");
  await until("document.querySelector('dialog[open]')");
  assert.equal(await evaluate("document.querySelector('dialog').innerText.includes('마케팅 약관')"), true);
  assert.equal(await evaluate("document.querySelector('dialog').innerText.includes('버전')"), false);
  await click("닫기");
  await until("!document.querySelector('dialog')");
  assert.equal(marketingAgreed, false);
  await evaluate("document.querySelector('[role=switch]').click()");
  await until("document.querySelector('[role=switch]').getAttribute('aria-checked') === 'true' && !document.querySelector('[role=switch]').disabled");
  marketingError = true;
  await evaluate("document.querySelector('[role=switch]').click()");
  await until("document.body.innerText.includes('마케팅 저장 실패 원문')");
  assert.equal(marketingAgreed, true);
  assert.equal(await evaluate("document.querySelector('[role=switch]').getAttribute('aria-checked')"), "true");
  marketingError = false;
  await evaluate("document.querySelector('[role=switch]').click()");
  await until("document.querySelector('[role=switch]').getAttribute('aria-checked') === 'false' && !document.querySelector('[role=switch]').disabled");
  assert.equal(marketingAgreed, false);
  assert.deepEqual(calls.filter((c) => c.method === "PUT").map((c) => c.body), [{ agreed: true }, { agreed: false }, { agreed: false }]);
  await click("로그아웃");
  await until("location.pathname === '/signin'");
  assert.equal(await evaluate("document.body.innerText.includes('마케팅 정보 수신 설정')"), false);
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(unexpected, []);
  console.log("PASS marketing: opt-in, failed withdrawal preserves state, withdrawal, logout; no runtime errors/unexpected API calls");
} catch (error) {
  if (evaluate) console.error(await evaluate("document.body.innerText").catch(() => "Could not read page"));
  throw error;
} finally {
  ws?.close();
  chrome.kill();
}
