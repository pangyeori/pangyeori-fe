// Comic home interaction and shared layout regression coverage for #63. Run against the local dev server:
// node tests/atelier-browser.mjs
// Authentication fixtures are test-only and never reach the backend.
// Keep these fixtures while HomeActions depends on the existing auth contract.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
for (const path of ["src/components/layout/SiteHeader.tsx", "src/components/layout/SiteFooter.tsx"]) {
  assert.equal(await readFile(path, "utf8"), execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" }), `${path} matches committed source`);
}

const profile = await mkdtemp(join(tmpdir(), "pangyeori-atelier-browser-"));
const artifacts = await mkdtemp(join(tmpdir(), "pangyeori-atelier-review-"));
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
  const sharedAppearance = `(() => Object.fromEntries(['header','header > div','header a[href="/register"]','footer','footer > div','footer a'].map(selector => {
    const e = document.querySelector(selector), c = getComputedStyle(e);
    return [selector, Object.fromEntries(['height','maxWidth','paddingLeft','paddingRight','backgroundColor','color','borderTopColor','borderBottomColor','borderRadius','fontSize','fontFamily'].map(key => [key,c[key]]))];
  })))()`;
  const baseline = {};
  await call("Page.navigate", { url: "http://localhost:3000/concepts/classic" });
  await until("document.querySelector('header a[href=\"/register\"]') !== null");
  await evaluate("document.fonts.ready");
  // Mount the unchanged shared components in the committed home shell, removing
  // the comparison concept's inherited text color from the baseline.
  const committedPage = execFileSync("git", ["show", "HEAD:src/app/page.tsx"], { encoding: "utf8" });
  const committedShell = committedPage.match(/<div className="([^"]+)"/)[1];
  await evaluate(`document.querySelector('header').parentElement.className = ${JSON.stringify(committedShell)}`);
  for (const width of [390,1440]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await pause(250);
    baseline[width] = await evaluate(sharedAppearance);
  }
  await call("Page.navigate", { url: process.env.ATELIER_TEST_URL ?? "http://localhost:3000/concepts/comic" });
  await until("document.querySelector('[data-atelier-cta][href=\"/signin\"]') !== null");
  await evaluate("document.fonts.ready");
  await until("[...document.images].filter(i => i.loading !== 'lazy').every(i => i.complete && i.naturalWidth > 0)");
  await pause(800);
  const refined = await evaluate("document.querySelector('main').dataset.homeVariant === 'refined'");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('main')).backgroundColor"), "rgb(255, 255, 255)", "White page background");
  assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1);
  assert.equal(await evaluate("document.querySelectorAll('canvas').length"), 0);
  assert.equal(await evaluate("document.querySelectorAll('.pin-spacer').length"), 0);
  await screenshot("desktop-hero.png");
  assert.deepEqual(await evaluate(sharedAppearance), baseline[1440], "Desktop header/footer retain original computed styles");
  await evaluate("document.querySelector('[data-judge-button]').focus()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await until("document.querySelector('[data-judge-message]').textContent.includes('반가워요')");
  await pause(800);
  await screenshot("mascot-greeting.png");

  // Stop below the threshold: spread must finish on its own, without pinning.
  const stageTop = await evaluate("document.querySelector('[data-story-stage]').getBoundingClientRect().top + scrollY");
  await evaluate(`window.scrollTo(0, ${stageTop - 820})`);
  await pause(200);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-story-card]').parentElement).transformStyle"), "flat");
  await screenshot("stack-before-trigger.png");
  const beforeSpread = await evaluate("[...document.querySelectorAll('[data-story-card]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}})");
  assert.ok(beforeSpread[0].right > beforeSpread[1].left, "Cards begin as an opaque stack");
  await evaluate(`window.scrollTo(0, ${stageTop - 530})`);
  const stoppedAt = await evaluate("scrollY");
  await pause(1400);
  assert.equal(await evaluate("scrollY"), stoppedAt, "Animation never changes the scroll position");
  const cardBounds = "[...document.querySelectorAll('[data-story-card]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}})";
  const cards = await evaluate(cardBounds);
  assert.ok(cards[0].right < cards[1].left && cards[1].right < cards[2].left, "Automatic spread completes with no card overlap");
  await evaluate(`window.scrollTo(0, ${stageTop - 120})`);
  await screenshot("unfolded-story.png");
  await evaluate("window.scrollTo(0,0)");
  await pause(250);
  const afterReturn = await evaluate(cardBounds);
  assert.ok(afterReturn[0].right < afterReturn[1].left && afterReturn[1].right < afterReturn[2].left, "Returning upward never collapses the cards");

  await evaluate("document.querySelector('[aria-label=\"질문 주제 선택\"] button:nth-child(2)').focus()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await until("document.querySelector('#perspective-card').getAttribute('aria-label').includes('AI가 그린')");
  assert.ok(await evaluate("document.querySelector('[data-topic-context]').textContent.includes('창작자의 의도')"), "Topic context follows the technology selection");
  assert.ok(await evaluate("document.querySelector('[data-topic-context]').textContent.includes('작품의 결과와 창작의 과정')"));
  await evaluate("document.querySelector('#perspective-card').focus()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await until("document.querySelector('#perspective-card').getAttribute('aria-pressed') === 'true'");
  await pause(1000);
  assert.ok(await evaluate("document.querySelector('#perspective-card [aria-hidden=false]').textContent.includes('작품을 만든 경험')"));
  await screenshot("flipped-perspective.png");
  await evaluate("document.querySelector('[aria-label=\"질문 주제 선택\"] button:nth-child(3)').click()");
  await until("document.querySelector('#perspective-card').getAttribute('aria-label').includes('차 없는 거리')");
  assert.equal(await evaluate("document.querySelector('#perspective-card').getAttribute('aria-pressed')"), "false");
  assert.ok(await evaluate("document.querySelector('[data-topic-context]').textContent.includes('이동의 편리함')"), "Context updates with every topic");

  for (const width of [320, 390, 768, 1024, 1440, 1816]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate("window.scrollTo(0,0)");
    await pause(900);
    assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), `No page overflow at ${width}px`);
    const overflow = await evaluate("[...document.querySelectorAll('main a, main button')].flatMap(e=>{const r=e.getBoundingClientRect();return r.width && (r.left< -1 || r.right>innerWidth+1) ? [{text:e.textContent,left:r.left,right:r.right}] : []})");
    assert.deepEqual(overflow, [], `Actions fit at ${width}px`);
    assert.equal(await evaluate("document.querySelectorAll('.pin-spacer').length"), 0);
    if (width === 390) {
      await screenshot("mobile-hero.png");
      assert.deepEqual(await evaluate(sharedAppearance), baseline[390], "Mobile header/footer retain original computed styles");
    }
    const positions = await evaluate("[...document.querySelectorAll('[data-story-card]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})");
    for (let i=0;i<positions.length-1;i++) {
      const a=positions[i], b=positions[i+1];
      assert.ok(a.right <= b.left || a.bottom <= b.top, `No card overlap at ${width}px`);
    }
    const height = await evaluate("document.documentElement.scrollHeight");
    for (let y = 0; y < height; y += 600) { await evaluate(`window.scrollTo(0,${y})`); await pause(70); }
    await until("[...document.images].every(i => i.complete && i.naturalWidth > 0)");
    await evaluate("window.scrollTo(0,0)");
    await pause(900);
    if (width === 390 || width === 1440) await screenshot(`${width}-full.png`, true);
  }
  if (refined) {
    const contrast = await evaluate(`(() => {
      const luminance = color => {
        const c = color.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
        return c[0]*.2126+c[1]*.7152+c[2]*.0722;
      };
      const ratio = (a,b) => { const [lo,hi]=[luminance(a),luminance(b)].sort((a,b)=>a-b); return (hi+.05)/(lo+.05); };
      const cta=getComputedStyle(document.querySelector('[data-atelier-cta]'));
      const body=getComputedStyle(document.querySelector('main section p[class*="heroDescription"]'));
      return {cta:ratio(cta.color,cta.backgroundColor),body:ratio(body.color,'rgb(255,255,255)')};
    })()`);
    assert.ok(contrast.cta >= 4.5 && contrast.body >= 4.5, JSON.stringify(contrast));
    await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate("document.documentElement.style.fontSize='200%'");
    await pause(500);
    await evaluate("document.querySelector('#deck-title').scrollIntoView()");
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "200% text does not overflow page");
    assert.ok(await evaluate("[...document.querySelectorAll('#perspective-card [class*=cardFace]')].every(e=>e.scrollHeight <= e.clientHeight + 2 && e.scrollWidth <= e.clientWidth + 2)"), "Card grows with 200% text");
    await screenshot("large-text-perspective.png");
    await evaluate("document.documentElement.style.fontSize=''");
  }
  // Live preference changes remove decorative transforms, preserving interaction.
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await until("document.querySelectorAll('canvas').length === 0 && document.querySelectorAll('.pin-spacer').length === 0");
  await evaluate("document.querySelector('#perspective-card').click()");
  await until("document.querySelector('#perspective-card').getAttribute('aria-pressed') === 'true'");
  await pause(500);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-flip-inner]')).transform"), "none");
  await screenshot("reduced-motion.png");

  authenticated = true;
  await call("Page.reload");
  await until("document.querySelectorAll('[data-atelier-cta][href=\"/debates/new\"]').length === 2");
  assert.equal(await evaluate("document.querySelectorAll('canvas').length"), 0);
  await evaluate("document.querySelector('[data-judge-button]').click()");
  await until("document.querySelector('[data-judge-message]').textContent.includes('반가워요')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-judge-button] > span')).transform"), "none");
  assert.deepEqual(errors, []);
  await call("Emulation.setScriptExecutionDisabled", { value: true });
  await call("Page.reload");
  await pause(1200);
  assert.equal(await evaluate("document.querySelectorAll('[data-story-card]').length"), 3);
  assert.ok(await evaluate("document.querySelector('#atelier-title').textContent.includes('서로 다른 생각')"));
  console.log(JSON.stringify({ result: "PASS", variant: refined ? "refined" : "comic", checks: ["6 responsive widths", "white background and contextual topic guide", "committed header/footer source and original desktop/mobile appearance", "no WebGL on main", "automatic spread without further scrolling or overlap", "keyboard topic choice and 3D flip", "keyboard mascot greeting", "live reduced-motion", "guest/authenticated CTA", "server content without JS", "no hydration/runtime errors"], artifacts }, null, 2));
} finally {
  ws?.close();
  chrome.kill();
  await new Promise((resolve) => { if (chrome.exitCode !== null) resolve(); else chrome.once("exit", resolve); });
  await rm(profile, { recursive: true, force: true });
}
