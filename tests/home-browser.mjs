// Browser regression coverage for #63. Run against the local dev server:
// node tests/home-browser.mjs
// Authentication fixtures are test-only and never reach the backend.
// Keep these fixtures while HomeActions depends on the existing auth contract.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "pangyeori-home-browser-"));
const artifacts = await mkdtemp(join(tmpdir(), "pangyeori-home-review-"));
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
  let authenticated = false;
  const pending = new Map();
  const errors = [];
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data);
    if (pending.has(event.id)) {
      const { resolve, reject } = pending.get(event.id);
      pending.delete(event.id);
      if (event.error) reject(event.error); else resolve(event.result);
    }
    if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.exception?.description ?? event.params.exceptionDetails.text);
    if (event.method === "Runtime.consoleAPICalled" && event.params.type === "error") {
      const message = event.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
      if (/hydration|hydrated|didn't match/i.test(message)) errors.push(message);
    }
    if (event.method !== "Fetch.requestPaused") return;
    const { requestId, request } = event.params;
    const path = new URL(request.url).pathname;
    let status = 200;
    let result;
    if (path === "/api/v1/auth/refresh") {
      status = authenticated ? 200 : 401;
      result = { accessToken: "home-test-session", tokenType: "Bearer" };
    } else if (path === "/api/v1/users/me/term-agreements/pending") result = [];
    else if (path === "/api/v1/notifications/unread-count") result = { count: 0 };
    else if (path === "/api/v1/debates/me") result = { items: [], hasNext: false, nextCursor: null };
    else { status = 404; errors.push(`Unexpected API request: ${path}`); }
    const body = status === 200 ? { success: true, data: result, error: null } : { success: false, data: null, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } };
    void call("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") }).catch((error) => errors.push(String(error)));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined, result.exceptionDetails?.text);
    return result.result.value;
  };
  const until = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await pause(100);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  const screenshot = async (name, full = false) => {
    const layout = await call("Page.getLayoutMetrics");
    const options = full ? { clip: { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 }, captureBeyondViewport: true } : {};
    const { data } = await call("Page.captureScreenshot", { format: "png", ...options });
    await writeFile(join(artifacts, name), Buffer.from(data, "base64"));
  };
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: process.env.HOME_TEST_URL ?? "http://localhost:3000/concepts/classic" });
  await until("document.querySelector('a[href=\"/signin\"][class*=primaryAction]') !== null");
  await evaluate("document.fonts.ready");
  await until("[...document.images].filter(i => i.loading !== 'lazy').every(i => i.complete && i.naturalWidth > 0)");
  await pause(1000);
  assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1);
  await screenshot("desktop-hero.png");

  // Pointer parallax updates, then returns to rest when the pointer leaves.
  const scene = await evaluate("(()=>{const r=document.querySelector('[class*=sceneTopline]').parentElement.getBoundingClientRect(); return {x:r.x+r.width*.8,y:r.y+r.height*.5}})()");
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", ...scene });
  await pause(150);
  assert.ok(await evaluate("document.querySelector('[class*=sceneTopline]').parentElement.style.getPropertyValue('--scene-x')"));
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await pause(100);
  assert.equal(await evaluate("document.querySelector('[class*=sceneTopline]').parentElement.style.getPropertyValue('--scene-x')"), "");

  await evaluate("document.querySelector('[aria-label=\"토론 주제 예시 선택\"] button:nth-child(2)').focus()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await until("document.querySelector('#topic-preview h3').textContent.includes('AI가 만든 그림')");
  assert.equal(await evaluate("document.querySelectorAll('[aria-pressed=true]').length"), 1);
  assert.equal(await evaluate("document.activeElement.closest('[data-pending]')"), null);
  await evaluate("document.querySelector('[aria-label=\"토론 주제 예시 선택\"] button:nth-child(3)').click()");
  await until("document.querySelector('#topic-preview h3').textContent.includes('차 없는 거리')");

  for (const width of [320, 390, 768, 1024, 1440]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate("window.scrollTo(0,0)");
    await pause(150);
    assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), `No page overflow at ${width}px`);
    const overflowActions = await evaluate("[...document.querySelectorAll('main a, main button')].flatMap(el=>{const r=el.getBoundingClientRect(); return r.left<0 || r.right>innerWidth+1 ? [{text:el.textContent,left:r.left,right:r.right}] : []})");
    if (overflowActions.length) await screenshot(`${width}-overflow.png`, true);
    assert.deepEqual(overflowActions, [], `Actions within viewport at ${width}px`);
    if (width === 390) await screenshot("mobile-hero.png");
    const height = await evaluate("document.documentElement.scrollHeight");
    for (let y = 0; y < height; y += 600) {
      await evaluate(`window.scrollTo(0,${y})`);
      await pause(80);
    }
    await pause(800);
    assert.equal(await evaluate("document.querySelectorAll('[data-pending]').length"), 0, "All content reveals while scrolling");
    await until("[...document.images].every(i => i.complete && i.naturalWidth > 0)");
    await evaluate("window.scrollTo(0,0)");
    if (width === 390 || width === 1440) await screenshot(`${width}-full.png`, true);
  }

  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await call("Page.reload");
  await until("document.querySelector('a[href=\"/signin\"][class*=primaryAction]') !== null");
  assert.equal(await evaluate("document.querySelectorAll('[data-pending]').length"), 0);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[class*=sceneMascot] img')).animationName"), "none");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[class*=sceneMascot]')).transitionDuration"), "0s");

  authenticated = true;
  await call("Page.reload");
  await until("document.querySelectorAll('a[href=\"/debates/new\"][class*=primaryAction]').length === 2");
  assert.deepEqual(errors, []);

  await call("Emulation.setScriptExecutionDisabled", { value: true });
  await call("Page.reload");
  await pause(1000);
  // Runtime evaluation remains available with page scripts disabled.
  assert.equal(await evaluate("document.querySelectorAll('[data-pending]').length"), 0);
  assert.ok(await evaluate("document.querySelector('#hero-title').textContent.includes('생각은 다르게')"));
  console.log(JSON.stringify({ result: "PASS", checks: ["5 viewport widths", "all mascot images", "keyboard topic selection", "guest/authenticated CTAs", "pointer reset", "scroll reveal", "reduced motion", "server content without JS", "no hydration/runtime errors"], artifacts }, null, 2));
} finally {
  ws?.close();
  chrome.kill();
  await new Promise((resolve) => { if (chrome.exitCode !== null) resolve(); else chrome.once("exit", resolve); });
  await rm(profile, { recursive: true, force: true });
}
