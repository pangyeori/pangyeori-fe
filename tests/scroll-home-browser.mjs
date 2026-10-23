// Scroll story interaction, rendering and fallback regression coverage for #63. Run against the local dev server:
// node tests/scroll-home-browser.mjs
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
  "--headless=new", "--disable-extensions", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
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
    const snapshot = await evaluate("({url:location.href,title:document.title,body:document.body.innerText.slice(0,1200),scrollY,host:document.querySelector('[data-story-host]')?.dataset,rect:document.querySelector('[data-story-host]')?.getBoundingClientRect().toJSON(),active:document.activeElement?.outerHTML.slice(0,200)})");
    throw new Error(`Timed out: ${expression}\n${JSON.stringify({snapshot,errors})}`);
  };
  const screenshot = async (name, full = false) => {
    const layout = await call("Page.getLayoutMetrics");
    const options = full ? { clip: { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 }, captureBeyondViewport: true } : {};
    const { data } = await call("Page.captureScreenshot", { format: "png", ...options });
    await writeFile(join(artifacts, name), Buffer.from(data, "base64"));
  };
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Emulation.setFocusEmulationEnabled", {enabled:true});
  await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const sharedAppearance = `(()=>Object.fromEntries(['header','header > div','header a[href="/register"]','footer','footer > div','footer a'].map(selector=>{
    const e=document.querySelector(selector), c=getComputedStyle(e);return [selector,Object.fromEntries(['height','maxWidth','paddingLeft','paddingRight','backgroundColor','color','borderRadius','fontSize','fontFamily'].map(k=>[k,c[k]]))];
  })))()`;
  await call("Page.navigate", {url:"http://localhost:3000/concepts/classic"});
  await until("document.querySelector('header a[href=\"/register\"]') !== null");
  await evaluate("document.fonts.ready");
  const original=execFileSync("git",["show","HEAD:src/app/page.tsx"],{encoding:"utf8"}).match(/<div className="([^"]+)"/)[1];
  await evaluate(`document.querySelector('header').parentElement.className=${JSON.stringify(original)}`);
  const baseline={};
  for(const width of [390,1440]){
    await call("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:false});
    await pause(200);baseline[width]=await evaluate(sharedAppearance);
  }
  await call("Page.navigate", { url: "http://localhost:3000" });
  await until("document.querySelector('[data-story-cta][href=\"/signin\"]') !== null");
  await evaluate("document.fonts.ready");
  await until("document.querySelector('[data-scroll-story]')?.dataset.enhanced === 'true'");
  assert.deepEqual(await evaluate(sharedAppearance),baseline[1440]);
  assert.equal(await evaluate("document.querySelectorAll('[data-story-canvas]').length"),1);
  assert.equal(await evaluate("document.querySelectorAll('[data-topic-canvas]').length"),0,'Topic renderer is deferred until the section approaches');
  await until("[...document.images].filter(i=>i.loading !== 'lazy').every(i=>i.complete && i.naturalWidth)");
  assert.equal(await evaluate("document.querySelector('[data-story-host]').dataset.fontFamily"),await evaluate("getComputedStyle(document.querySelector('main')).fontFamily"),'Canvas and page use the same font family');
  assert.ok(await evaluate("[...document.fonts].some(f=>/homeFont/i.test(f.family) && f.status==='loaded')"),'The local landing font is loaded');
  assert.ok(await evaluate("document.querySelector('[data-hero-court] img').src.includes('owl-judge-gavel')"),'Hero uses the original judge illustration');
  assert.equal(await evaluate("document.querySelector('[data-hero-court] canvas')"),null,'Hero has no device canvas');
  await evaluate("scrollTo(0,220)");
  await until("document.querySelector('[data-home-header]').dataset.hidden==='true'");await pause(280);
  assert.ok(await evaluate("document.querySelector('header').getBoundingClientRect().bottom<=1"),'Header hides while scrolling down');
  await evaluate("scrollTo(0,170)");
  await until("document.querySelector('[data-home-header]').dataset.hidden==='false'");await pause(280);
  assert.ok(await evaluate("Math.abs(document.querySelector('header').getBoundingClientRect().top)<1"),'Header returns while scrolling up');
  await evaluate("scrollTo(0,250)");
  await until("document.querySelector('[data-home-header]').dataset.hidden==='true'");
  await evaluate("document.querySelector('header a').focus({preventScroll:true})");
  await until("document.querySelector('[data-home-header]').dataset.hidden==='false'");
  await evaluate("document.activeElement.blur();scrollTo(0,0)");await pause(300);
  await screenshot("intro.png");
  assert.equal(await evaluate("document.querySelector('[data-hero-court] svg')"),null,'Original image has no separated gavel layers');
  await until("document.querySelector('[data-hero-float]').getAnimations().some(a=>a.playState==='running')");
  await evaluate("(()=>{const a=document.querySelector('[data-hero-float]').getAnimations()[0];a.currentTime=1920})()");
  assert.notEqual(await evaluate("getComputedStyle(document.querySelector('[data-hero-float]')).transform"),'none','The intact illustration floats gently');
  await screenshot('hero-float.png');
  await evaluate("document.querySelector('[data-hero-float]').getAnimations()[0].currentTime=6720");
  assert.equal(await evaluate("document.querySelector('[data-hero-float]').getAnimations()[0].playState"),'running','Visible mascot keeps moving across cycles');
  await evaluate("document.querySelector('[data-hero-judge]').focus()");
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until("document.querySelector('[data-hero-greeting]').textContent.includes('반가워요')");
  await until("document.querySelector('[data-hero-float]').getAnimations()[0]?.playState==='paused'");
  await evaluate("Promise.all(document.querySelector('[data-hero-float]').getAnimations().map(a=>a.ready)).then(()=>true)");
  const pausedFloatTime=await evaluate("document.querySelector('[data-hero-float]').getAnimations()[0].currentTime");
  await pause(200);
  assert.equal(await evaluate("document.querySelector('[data-hero-float]').getAnimations()[0].currentTime"),pausedFloatTime,'Keyboard pause freezes the mascot');
  assert.equal(await evaluate("document.querySelector('[data-hero-judge]').getAttribute('aria-pressed')"),'true');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until("document.querySelector('[data-hero-float]').getAnimations()[0]?.playState==='running'");
  assert.equal(await evaluate("document.querySelector('[data-hero-judge]').getAttribute('aria-pressed')"),'false');
  const go = async progress => {
    await evaluate(`(()=>{const e=document.querySelector('[data-scroll-story]');scrollTo(0,e.getBoundingClientRect().top+scrollY+(e.offsetHeight-innerHeight)*${progress})})()`);
    await pause(120);
  };
  const idle = () => until("document.querySelector('[data-story-host]').dataset.renderState === 'idle'");
  const cardsSettled = () => until("[...document.querySelector('[data-story-host] [data-argument-deck]').getAnimations({subtree:true})].every(a=>a.playState==='finished' || a.playState==='idle')");
  const typography = [];
  const count = () => evaluate("Number(document.querySelector('[data-story-host]').dataset.messageCount)");
  await go(0.12); const stoppedAt=await evaluate("scrollY"); await idle();
  assert.equal(await evaluate("document.querySelector('[data-hero-float]').getAnimations().length"),0,'Offscreen mascot stops animating');
  assert.equal(await count(),1,"Stopped scrolling completes only the current message");
  assert.equal(await evaluate("scrollY"),stoppedAt);
  await screenshot("conversation.png");
  const renderCount=await evaluate("document.querySelector('[data-story-host]').dataset.renderCount");
  await pause(400);
  assert.equal(await evaluate("document.querySelector('[data-story-host]').dataset.renderCount"),renderCount,"No continuous rendering while idle");
  await go(0.31); await idle(); assert.equal(await count(),3,"Fast move skips preceding typing");
  await go(0.2); await idle(); assert.equal(await count(),2,"Reverse restores completed messages");
  if(process.env.STORY_CAPTURE_POSTERS === '1') {
    const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
    const sharp=createRequire(require.resolve('next/package.json'))('sharp');
    const {mkdir}=await import('node:fs/promises');await mkdir('public/images/home',{recursive:true});
    for(const [name,progress] of [['verdict',.88]]){
      await go(progress);await idle();await until("[...document.querySelectorAll('[data-story-mascot] img')].every(i=>i.complete && i.naturalWidth)");await pause(250);
      const clip=await evaluate("(()=>{const r=document.querySelector('[data-story-host]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
      const {data}=await call('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
      await sharp(Buffer.from(data,'base64')).trim({background:'#ffffff',threshold:18}).extend({top:20,bottom:20,left:20,right:20,background:'#ffffff'}).resize({width:1000,withoutEnlargement:true}).webp({quality:88}).toFile(`public/images/home/scroll-${name}-refined.webp`);
    }
  }
  await go(0.42); await idle(); assert.equal(await count(),4);await screenshot("full-conversation.png");
  await go(0.55); await idle(); const cardsStoppedAt=await evaluate('scrollY');
  await cardsSettled();
  assert.equal(await evaluate('scrollY'),cardsStoppedAt,'Opinion cards finish opening without more scroll');
  await go(0.64); await idle();await cardsSettled();assert.equal(await evaluate("document.querySelector('[data-scroll-story]').dataset.scene"),'1');await screenshot("review.png");
  const cardCenter=await evaluate("(()=>{const r=document.querySelector('[data-story-host] [data-argument-card]').getBoundingClientRect();return {x:r.x+r.width*.7,y:r.y+r.height*.4}})()");
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...cardCenter});await pause(220);
  assert.ok(await evaluate("document.querySelector('[data-story-host] [data-argument-card]').style.getPropertyValue('--tilt-y') !== ''"),'Card tilt follows the pointer');
  await screenshot('card-tilt.png');
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});await pause(220);
  assert.equal(await evaluate("document.querySelector('[data-story-host] [data-argument-card]').style.getPropertyValue('--tilt-y')"),'','Card tilt resets on leave');
  await go(0.88); await idle();assert.ok(await evaluate("document.querySelector('[data-story-host]').dataset.screenText.includes('조건을 구체화')"));await screenshot("verdict.png");
  for (let reload = 0; reload < 3; reload++) {
    await call("Page.reload");
    await until("document.querySelector('[data-scroll-story]')?.dataset.enhanced === 'true'");
    await until("document.querySelector('[data-story-host]').dataset.phase === '2'");
    await idle();assert.equal(await count(),4,"Reload at middle restores the current scene");
  }
  for(const width of [360,390,768,1024,1440]){
    await call("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:false});await pause(400);
    if(width===390){
      await evaluate("scrollTo(0,0)");await pause(200);await screenshot('mobile-intro.png');
      await evaluate("scrollTo(0,40)");
      await until("document.querySelector('[data-hero-float]').getAnimations().some(a=>a.playState==='running')");
      await evaluate("(()=>{const a=document.querySelector('[data-hero-float]').getAnimations()[0];a.currentTime=1920})()");
      await screenshot('mobile-hero-float.png');

    }
    await go(.42); await idle();
    assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"),`No overflow at ${width}`);
    if(width===390 || width===1440) typography.push({width,projectedChatPx:await evaluate("Number(document.querySelector('[data-story-host]').dataset.projectedTextSize)")});
    if(width===390){
      assert.deepEqual(await evaluate(sharedAppearance),baseline[390]);
      await screenshot('mobile-conversation.png');
      await go(.64);await idle();await cardsSettled();
      assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'No overflow in mobile review');
      assert.ok(await evaluate("(()=>{const [a,b]=[...document.querySelectorAll('[data-story-host] [data-argument-card]')].map(e=>e.getBoundingClientRect());return a.left>=0 && b.right<=innerWidth && a.right<b.left})()"),'Mobile opinion cards stay separated and within the viewport');
      await screenshot('mobile-review.png');
      await go(.88);await idle();assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'No overflow in mobile verdict');await screenshot('mobile-verdict.png');
    }
  }
  await call("Emulation.setDeviceMetricsOverride",{width:360,height:740,deviceScaleFactor:1,mobile:false});await pause(400);
  await go(.42);await idle();
  assert.ok(await evaluate("Number(document.querySelector('[data-story-host]').dataset.projectedTextSize)>=16"),"Core chat text stays at least 16 CSS px in the short mobile reading view");
  await screenshot('short-mobile-reading.png');
  await call("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});await pause(300);
  await go(.88);await idle();
  const topicGo = async progress => {
    await evaluate(`(()=>{const e=document.querySelector('[data-topic-discovery]');scrollTo(0,e.getBoundingClientRect().top+scrollY+(e.offsetHeight-innerHeight)*${progress})})()`);
    await pause(220);
  };
  await topicGo(0);
  await until("document.querySelector('[data-topic-canvas]') && document.querySelector('[data-topic-host]').dataset.renderState==='idle'");
  assert.equal(await evaluate("document.querySelectorAll('[data-topic-canvas]').length"),1,'One WebGL renderer supplies all three rotating faces');
  assert.equal(await evaluate("document.querySelectorAll('[data-topic-discovery] button,[data-topic-discovery] [role=tab]').length"),0,'No click is required to discover questions');
  assert.equal(await evaluate("document.querySelectorAll('[data-topic-card]').length"),3,'Every question is in semantic HTML');
  await until("document.querySelectorAll('[data-topic-owl]').length===3 && [...document.querySelectorAll('[data-topic-owl]')].every(i=>i.complete && i.naturalWidth>0)");
  const centered = index => evaluate(`(()=>{const r=document.querySelectorAll('[data-topic-card]')[${index}].getBoundingClientRect();return Math.abs(r.left+r.width/2-document.documentElement.clientWidth/2)<3})()`);
  const faceAtCenter = side => evaluate(`(()=>{const r=document.querySelectorAll('[data-topic-card]')[0].getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height*.72)?.closest('[data-topic-${side}]')})()`);
  assert.ok(await faceAtCenter('front'),'Only the question/object front is visible on entry');
  assert.equal(await evaluate("document.querySelectorAll('[data-topic-surface]').length"),3,'Artwork is attached to each rotating face');
  await screenshot('topic-front.png');
  await topicGo(.1);
  const stoppedTurn=await evaluate("getComputedStyle(document.querySelector('[data-topic-rotator]')).transform");
  await pause(300);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-topic-rotator]')).transform"),stoppedTurn,'Turn stops exactly with scroll input');
  assert.ok(await evaluate("(()=>{const c=document.querySelector('[data-topic-card]'),r=c.querySelector('[data-topic-front]').getBoundingClientRect(),v=document.querySelector('[data-topic-host]').getBoundingClientRect();return r.width<c.clientWidth*.5 && r.top>=v.top && r.bottom<=v.bottom})()"),'The whole front turns in perspective without clipping');
  await screenshot('topic-turning.png');
  await topicGo(.2);
  assert.ok(await faceAtCenter('back'),'Continuing scroll reveals the illustrated back');
  await screenshot('topic-music.png');
  await topicGo(0);assert.ok(await faceAtCenter('front'),'Reverse scroll restores the original front');
  await topicGo(.2);
  assert.ok(await centered(0),'First card is centered on entry');
  const topicRenderCount=await evaluate("document.querySelector('[data-topic-host]').dataset.renderCount");
  await pause(250);
  assert.equal(await evaluate("document.querySelector('[data-topic-host]').dataset.renderCount"),topicRenderCount,'Topic scene does not render while idle');
  await topicGo(.54);assert.ok(await centered(1),'Scrolling reveals the work question');await screenshot('topic-work.png');
  await topicGo(1);assert.ok(await centered(2),'Scrolling reaches the final card');await screenshot('topic-routine.png');
  await topicGo(.54);assert.ok(await centered(1),'Reverse scroll restores the previous card');
  for(const width of [360,390,768,1024,1440]) {
    await call("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:false});await pause(250);
    for(const [progress,index] of [[.2,0],[.54,1],[1,2]]) {
      await topicGo(progress);
      assert.ok(await centered(index),`Card ${index} is reachable at ${width}px`);
      assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"),`Gallery has no page overflow at ${width}px`);
      assert.ok(await evaluate(`(()=>{const r=document.querySelectorAll('[data-topic-card]')[${index}].getBoundingClientRect();return r.top>=56 && r.bottom<=innerHeight})()`),'Card fits below the returning header');
      assert.ok(await evaluate(`(()=>{const c=document.querySelectorAll('[data-topic-card]')[${index}],r=c.getBoundingClientRect(),q=c.querySelector('[data-topic-back] p:last-child').getBoundingClientRect(),i=c.querySelector('[data-topic-owl]').getBoundingClientRect();return i.left>=r.left-1 && i.right<=r.right+1 && i.top>=r.top-1 && i.bottom<=r.bottom+1 && (i.top>=q.bottom || i.left>=q.right)})()`),'Owl stays inside its slide without covering the question');
      if(width===390 && index===1) await screenshot('mobile-topic.png');
    }
  }
  for(const width of [390,1440]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:650,deviceScaleFactor:1,mobile:false});await pause(250);
    await topicGo(.54);
    assert.ok(await evaluate("(()=>{const r=document.querySelectorAll('[data-topic-card]')[1].getBoundingClientRect();return r.top>=56 && r.bottom<=innerHeight})()"),'Gallery fits the shortest enhanced viewport');
    assert.ok(await evaluate("(()=>{const c=document.querySelectorAll('[data-topic-card]')[1],r=c.getBoundingClientRect(),i=c.querySelector('[data-topic-owl]').getBoundingClientRect();return i.top>=r.top-1 && i.bottom<=r.bottom+1})()"),'Owl fits short screens');
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await pause(250);
  await go(.88);await idle();
  await until("document.querySelector('[data-topic-host]').dataset.renderState==='offscreen'");
  await evaluate("document.querySelector('[data-topic-canvas]').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()");
  await until("!document.querySelector('[data-topic-canvas]')");
  await topicGo(1);assert.ok(await centered(2),'All questions remain reachable after context loss');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-topic-visual] svg')).visibility"),'visible','SVG posters replace the failed renderer');
  await go(.88);await idle();
  assert.equal(await evaluate("document.querySelector('[data-motion-toggle]')"),null,"No extra motion controls in the story");
  assert.ok(await evaluate("!document.querySelector('main').textContent.match(/바로 시작하기|움직임 줄이기|소개용 예시/)") ,"Editorial UI copy removed");
  assert.ok(await evaluate("document.querySelector('[data-story-mascot] img[data-active=\"true\"]').src.includes('owl-holding-star')"),"Original flat mascot artwork is used");
  await go(.64); await idle();
  await evaluate("scrollTo(0,0)");
  await until("document.querySelector('[data-story-host]').dataset.renderState==='offscreen'");
  await go(.88); await idle();
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await until("document.querySelectorAll('[data-story-canvas]').length===0 && document.querySelector('[data-scroll-story]').dataset.enhanced==='false'");
  await call('Page.reload');
  await until("document.querySelector('[data-story-cta]')!==null");
  await pause(500);assert.equal(await evaluate("document.querySelectorAll('[data-story-canvas]').length"),0,'Reduced motion does not initialize WebGL');
  await evaluate("document.querySelector('[data-topic-discovery]').scrollIntoView({block:'start'})");await pause(200);
  assert.equal(await evaluate("document.querySelectorAll('[data-topic-canvas]').length"),0,'Reduced motion uses the static topic illustration');
  assert.ok(await evaluate("document.querySelector('[data-topic-discovery]').textContent.includes('일찍 일어나는')"),'All static questions are readable without controls');
  await evaluate("scrollTo(0,0)");await pause(100);await evaluate("scrollTo(0,40)");await pause(120);
  assert.equal(await evaluate("document.querySelector('[data-hero-float]').getAnimations().length"),0,'Reduced motion keeps the illustration still');
  await call("Emulation.setDeviceMetricsOverride",{width:390,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate("document.documentElement.style.fontSize='200%'");
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await pause(400);
  assert.equal(await evaluate("document.querySelectorAll('[data-story-canvas]').length"),0,'Enlarged browser text uses scalable HTML');
  assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'200% text has no horizontal overflow');
  await evaluate("document.querySelector('[data-topic-discovery]').scrollIntoView({block:'start'})");await pause(200);
  assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Cards and questions reflow at 200% text');
  await screenshot('large-text-topic.png');
  await evaluate("scrollTo(0,0)"); await screenshot('large-text.png');
  await evaluate("document.documentElement.style.fontSize=''");
  await call("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await until("document.querySelectorAll('[data-story-canvas]').length===1");
  await go(.88);await idle();
  await evaluate("document.querySelector('[data-story-canvas]').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()");
  await until("document.querySelectorAll('[data-story-canvas]').length===0 && document.querySelector('[data-scroll-story]').dataset.enhanced==='false'");
  assert.ok(await evaluate("document.body.textContent.includes('조건을 구체화한 점이 좋았어요.')"));
  const blocked=await call('Page.addScriptToEvaluateOnNewDocument',{source:`const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:getContext.call(this,type,...args)}`});
  await call('Page.reload');await until("document.querySelector('[data-story-cta]')!==null");await pause(800);
  assert.equal(await evaluate("document.querySelectorAll('[data-story-canvas]').length"),0,'WebGL unavailable shows readable HTML');
  assert.equal(await evaluate("document.querySelectorAll('[data-static-phase]').length"),3);
  await evaluate("document.querySelector('[data-topic-discovery]').scrollIntoView({block:'start'})");await pause(500);
  assert.equal(await evaluate("document.querySelectorAll('[data-topic-canvas]').length"),0,'Unavailable WebGL keeps the topic fallback');
  assert.ok(await evaluate("document.querySelector('[data-topic-discovery]').textContent.includes('집에서 일하면')"));
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:blocked.identifier});
  await call("Emulation.setDeviceMetricsOverride",{width:720,height:500,deviceScaleFactor:1,mobile:false});
  authenticated=true;await call('Page.reload');
  await until("document.querySelectorAll('[data-story-cta][href=\"/debates/new\"]').length===2");
  assert.equal(await evaluate("document.querySelectorAll('[data-story-canvas]').length"),0,'Low height / 200% desktop reflow uses static scenes');
  assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"));
  await screenshot('low-height.png');
  await evaluate("document.querySelector('#start-debate').scrollIntoView({block:'center'})");
  await screenshot('closing.png');
  assert.deepEqual(errors, []);
  await call('Emulation.setScriptExecutionDisabled',{value:true});await call('Page.reload');await pause(1000);
  assert.equal(await evaluate("document.querySelectorAll('[data-static-phase]').length"),3);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-static-story]')).display"),'block');
  assert.equal(await evaluate("document.querySelectorAll('noscript a[href=\"/signin\"]').length"),2,'No-JS visitors retain real start links');
  assert.ok(await evaluate("document.querySelector('[data-topic-discovery]').textContent.includes('일찍 일어나는')"),'No-JS visitors can read all three questions');
  console.log(JSON.stringify({ result: "PASS", checks:['single story renderer and lazy topic renderer','scroll-linked 3D flip, front/back visibility, reverse/resize, idle/offscreen suspension and context loss','direction-aware header and keyboard focus reveal','visible mascot loop, keyboard pause/resume, offscreen stop and reduced motion','keyboard mascot greeting','automatic card unfold and pointer tilt','original header/footer','5 responsive widths','shared local font and 200% text reflow','stop/fast/reverse scroll typing','idle and offscreen suspension','reload restoration','original illustration and uncluttered stage','reduced motion and low height fallback','context loss and WebGL unavailable','auth CTA','no-JS content','no runtime/hydration errors'], typography, artifacts }, null, 2));
} finally {
  ws?.close(); chrome.kill();
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else chrome.once("exit",resolve); });
  await rm(profile, {recursive:true,force:true});
}
