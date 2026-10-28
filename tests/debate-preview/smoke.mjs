// Interactive preview smoke test. Requires the frontend (3000) and preview (3100).
// All data stays in the test frame. Keep/remove with this harness.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "pangyeori-preview-check-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let i = 0; i < 80; i++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await pause(100); }
  }
  assert.ok(port);
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  const pending = new Map();
  let id = 0;
  const requests = [];
  const errors = [];
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.addEventListener("message", ({ data }) => {
    const value = JSON.parse(data);
    if (pending.has(value.id)) {
      const item = pending.get(value.id);
      pending.delete(value.id);
      if (value.error) item.reject(value.error); else item.resolve(value.result);
    }
    if (value.method === "Network.requestWillBeSent") requests.push(value.params.request.url);
    if (value.method === "Runtime.exceptionThrown") errors.push(value.params.exceptionDetails.exception?.description || value.params.exceptionDetails.text);
  });
  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined, result.exceptionDetails?.exception?.description);
    return result.result.value;
  };
  const until = async expression => {
    for (let i = 0; i < 150; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(120);
    }
    console.error(await evaluate("({parent:document.body.innerText,frame:document.querySelector('#preview')?.contentDocument?.body?.innerText})"));
    throw new Error(`Timed out: ${expression}`);
  };
  const text = value => `document.querySelector('#preview')?.contentDocument?.body?.innerText.includes(${JSON.stringify(value)})`;
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.enable");
  await call("Emulation.setFocusEmulationEnabled", { enabled: true });
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: "http://localhost:3100" });
  await until("document.querySelector('#preview')?.contentDocument?.querySelector('#debate-statement:not(:disabled)')");
  await evaluate(`(() => {
    const win = document.querySelector('#preview').contentWindow;
    const field = win.document.querySelector('#debate-statement');
    Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype,'value').set.call(field,'직접 검증하는 샘플 메시지');
    field.dispatchEvent(new win.Event('input',{bubbles:true}));
  })()`);
  await until("!document.querySelector('#preview').contentDocument.querySelector('button[type=submit]').disabled");
  await evaluate("document.querySelector('#preview').contentDocument.querySelector('button[type=submit]').click()");
  await until(text("직접 검증하는 샘플 메시지"));
  await click('[data-width="1440"]');
  assert.equal(await evaluate("document.querySelector('#preview').contentWindow.innerWidth"), 1440);
  await click('[data-width="390"]');
  await click('[data-scene="interim"]');
  await until(text("1차 판정을 정리하고 있습니다"));
  await click('[data-result="CONS"]');
  await until("document.querySelector('#count').textContent === '연출 1회'");
  await pause(3100);
  await click('#duplicate');
  await pause(900);
  assert.equal(await evaluate("document.querySelector('#count').textContent"), "연출 1회");
  await click('[data-scene="final"]');
  await until("document.querySelector('#preview').contentDocument.querySelector('[role=progressbar]')");
  assert.equal(await evaluate(text("결과 다시 확인")), false);
  await click('#network');
  await until("document.querySelector('#fault').textContent.includes('조회 오류')");
  await pause(3500);
  assert.equal(await evaluate(text("샘플: 연결이 불안정")), false, "temporary failures do not surface in the user interface");
  assert.equal(await evaluate("document.querySelector('#preview').contentDocument.querySelector('[role=alert]')"), null);
  await until("document.querySelector('#fault').hidden");
  await click('#stale');
  await until(text("반대 측 승리"));
  await pause(3500);
  assert.equal(await evaluate(text("반대 측 승리")), true);
  await click('#missing');
  await until(text("평가 점수를 정리하고 있어요"));
  await until(text("62점"));
  await click('#failure');
  await until(text("이번 토론의 판결은 제공되지 않았습니다"));
  await click('[data-scene="free"]');
  await until("document.querySelector('#preview').contentDocument.querySelector('#debate-statement:not(:disabled)')");
  const screenshot = await call("Page.captureScreenshot", { format: "png" });
  const path = join(profile, "chat-review-sample.png");
  await writeFile(path, Buffer.from(screenshot.data, "base64"));
  assert.deepEqual(requests.filter(url => new URL(url).pathname === "/ws" || new URL(url).pathname.startsWith("/api/")), [], "sample API calls must never reach the network");
  assert.deepEqual(errors, []);
  console.log("PASS: real chat UI, sample messages, viewport switching, duplicate suppression, indeterminate waiting, query-error recovery, stale responses, missing scores, explicit failure, no API network traffic");
  console.log(`Screenshot: ${path}`);
  await call("Browser.close");
} finally {
  socket?.close();
  chrome.kill("SIGTERM");
}
