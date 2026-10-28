/* Test-only REST/STOMP fixtures for the interactive #71 review. Never imported by product code.
 * Retain with this review harness; update when the debate contract changes, or remove together.
 */
(() => {
  "use strict";
  const roomId = "preview";
  const query = new URLSearchParams(location.search);
  const scene = query.get("scene") || "free";
  const mine = query.get("side") === "PROS" ? "PROS" : "CONS";
  const other = mine === "PROS" ? "CONS" : "PROS";
  const stages = ["NONE", "OPENING_PROS", "OPENING_CONS", "VERDICT_1", "REBUTTAL_PROS", "REBUTTAL_CONS", "VERDICT_2", "FREE", "FINAL_VERDICT"];
  const now = () => new Date().toISOString();
  const after = seconds => new Date(Date.now() + seconds * 1000).toISOString();
  const copy = value => JSON.parse(JSON.stringify(value));
  const detail = {
    id: roomId, title: "AI의 교육 활용을 확대해야 할까?", description: "실제 채팅 화면에서 차례, 판결, 오류 복구를 확인해보세요.",
    hostPosition: mine, guestPosition: other, status: "IN_PROGRESS", currentStage: "FREE", turnEndsAt: after(600),
    turnTimeSeconds: 180, freeDebateTimeSeconds: 600, inviteToken: null, winnerPosition: null,
  };
  const statements = {
    OPENING_PROS: "AI는 학생별 학습 속도에 맞춘 피드백을 제공할 수 있습니다. 교사가 수업과 상담에 집중할 시간도 확보할 수 있습니다.",
    OPENING_CONS: "학습 데이터의 개인정보 보호와 답변의 신뢰성을 먼저 확인해야 합니다. 도입 확대만으로 교육의 질이 보장되지는 않습니다.",
    REBUTTAL_PROS: "전면적인 대체가 아니라 교사의 감독 아래 보조 도구로 활용하자는 제안입니다. 검증 기준과 접근성 지원을 함께 마련해야 합니다.",
    REBUTTAL_CONS: "보조 도구라도 오류가 반복되면 학습에 영향을 줍니다. 작은 규모의 시범 운영으로 효과를 검증하는 절차가 필요합니다.",
  };
  const histories = { histories: Object.entries(statements).map(([stage, content]) => ({ id: stage, stage, content, createdAt: now() })), verdicts: [] };
  const makeVerdict = (stage, winner = "PROS", failed = false, missing = false) => ({
    id: `verdict-${stage}`, stage, status: failed ? "FAILED" : "SUCCESS", winnerPosition: failed ? null : winner,
    reasoning: failed ? null : "양측 모두 도입 효과와 위험을 구체적으로 설명했습니다. 주장과 근거의 연결, 상대의 우려에 대한 대응을 종합하여 판정했습니다.", createdAt: now(),
    participantProsScore: stage === "FINAL_VERDICT" && !failed ? winner === "PROS" ? 62 : winner === "CONS" ? 38 : 50 : null,
    participantConsScore: stage === "FINAL_VERDICT" && !failed && !missing ? winner === "PROS" ? 38 : winner === "CONS" ? 62 : 50 : null,
  });
  histories.verdicts = [makeVerdict("VERDICT_1", "PROS"), makeVerdict("VERDICT_2", "DRAW")];
  let sequence = 10;
  const messages = [
    { id: "01", role: "GUEST", content: "서로 동의하는 지점부터 정리해볼까요?", createdAt: now() },
    { id: "02", role: "GUEST", content: "교사의 판단을 돕는 용도라면 가능성이 있다고 생각해요.", createdAt: now() },
    { id: "03", role: "HOST", content: "맞아요. 교사를 대체하는 것과 학습을 돕는 것은 구분해야 해요.", createdAt: now() },
    { id: "04", role: "HOST", content: "시범 운영 결과를 공개하고, 학생에게 선택권을 주는 방식은 어떨까요?", createdAt: now() },
  ];
  if (["ready", "opening"].includes(scene)) {
    detail.currentStage = scene === "ready" ? "NONE" : "OPENING_PROS";
    detail.status = scene === "ready" ? "READY" : "IN_PROGRESS";
    detail.turnEndsAt = scene === "ready" ? null : after(180);
    histories.histories = [];
    histories.verdicts = [];
    messages.length = 0;
  } else if (scene === "interim") {
    detail.currentStage = "VERDICT_1";
    detail.turnEndsAt = null;
    histories.histories = histories.histories.slice(0, 2);
    histories.verdicts = [];
    messages.length = 0;
  } else if (scene === "final") {
    detail.currentStage = "FINAL_VERDICT";
    detail.turnEndsAt = null;
  }

  let socket;
  let lastVerdict;
  let lastEvent;
  let earlyEnd = { pending: false, proposerRole: null, expiresAt: null };
  let failUntil = 0;
  let staleUntil = 0;
  let staleDetail;
  let staleHistories;
  let momentCount = 0;
  let historyReads = 0;
  const startedAt = Date.now();
  const sendParent = (type, data = {}) => parent.postMessage({ source: "debate-preview-frame", type, ...data }, location.origin);
  const log = message => sendParent("log", { message });
  const snapshot = () => sendParent("snapshot", { stage: detail.currentStage, status: detail.status, mine, momentCount, historyReads, connected: socket?.readyState === 1, failed: Date.now() < failUntil, stale: Date.now() < staleUntil });
  const event = payload => {
    lastEvent = { debateId: roomId, ...payload };
    socket?.event(`/sub/debates/${roomId}`, lastEvent);
    snapshot();
  };
  const changeStage = stage => {
    detail.status = "IN_PROGRESS";
    detail.currentStage = stage;
    detail.turnEndsAt = stage.includes("VERDICT") ? null : after(stage === "FREE" ? 600 : 180);
    event({ type: "STAGE_CHANGED", stage, turnEndsAt: detail.turnEndsAt });
    log(`단계 전환 · ${stage}`);
  };
  const addStatement = (stage, content) => {
    const item = { id: `statement-${++sequence}`, stage, content: content || statements[stage], createdAt: now() };
    histories.histories = histories.histories.filter(item => item.stage !== stage).concat(item);
    const position = stage.endsWith("PROS") ? "PROS" : "CONS";
    event({ type: "STATEMENT_SUBMITTED", stage, role: position === mine ? "HOST" : "GUEST", content: item.content, submittedAt: item.createdAt });
    return item;
  };
  const issue = (winner, failed = false, missing = false, stagger = false) => {
    const stage = detail.currentStage;
    if (!["VERDICT_1", "VERDICT_2", "FINAL_VERDICT"].includes(stage)) return log("중간 판결 또는 최종 판결 대기 장면에서 실행해주세요.");
    if (stagger) {
      staleDetail = copy(detail);
      staleHistories = copy(histories);
      staleUntil = Date.now() + 8000;
      log("이전 REST 응답을 8초 동안 반환합니다. 화면의 새 결과가 유지되는지 확인하세요.");
    }
    const verdict = makeVerdict(stage, winner, failed, missing);
    histories.verdicts = histories.verdicts.filter(item => item.stage !== stage).concat(verdict);
    lastVerdict = { type: "VERDICT_ISSUED", stage, verdictStatus: verdict.status, winnerPosition: verdict.winnerPosition, reasoning: verdict.reasoning, participantProsScore: verdict.participantProsScore, participantConsScore: verdict.participantConsScore };
    event(lastVerdict);
    log(`판결 도착 · ${failed ? "실패" : winner === "DRAW" ? "무승부" : `${winner} 승리/우세`}`);
    setTimeout(() => {
      if (stage === "FINAL_VERDICT") {
        detail.status = "FINISHED";
        detail.winnerPosition = verdict.winnerPosition;
        event({ type: "DEBATE_ENDED", stage, verdictStatus: verdict.status, winnerPosition: verdict.winnerPosition });
      } else {
        changeStage(stage === "VERDICT_1" ? "REBUTTAL_PROS" : "FREE");
      }
    }, 180);
    if (missing) setTimeout(() => {
      verdict.participantConsScore = winner === "PROS" ? 38 : winner === "CONS" ? 62 : 50;
      log("누락 점수 도착 · 자동 조회로 보충됩니다. 연출은 반복되지 않아야 합니다.");
    }, 6000);
  };
  const next = () => {
    const stage = detail.currentStage;
    if (stage === "FINAL_VERDICT") return issue(mine);
    if (stage.startsWith("VERDICT")) return issue(stage === "VERDICT_1" ? "PROS" : "DRAW");
    if (stage === "NONE") event({ type: "STARTED" });
    if (statements[stage] && !histories.histories.some(item => item.stage === stage)) addStatement(stage);
    changeStage(stages[stages.indexOf(stage) + 1]);
  };
  const action = (name, value) => {
    if (name === "next") next();
    else if (name === "result") issue(value);
    else if (name === "failure") issue(null, true);
    else if (name === "missing") issue(mine, false, true);
    else if (name === "stale") issue(mine, false, false, true);
    else if (name === "duplicate") {
      const repeated = lastVerdict || lastEvent;
      if (!repeated) return log("먼저 판결을 내려주세요.");
      for (let i = 0; i < 3; i++) setTimeout(() => event(repeated), i * 150);
      log("동일 이벤트 3회 재전송 · 연출 횟수가 늘어나지 않아야 합니다.");
    } else if (name === "network") {
      failUntil = Date.now() + 6500;
      event({ type: "STAGE_CHANGED", stage: detail.currentStage, turnEndsAt: detail.turnEndsAt });
      log("기록 조회 오류 · 6.5초 뒤 연결을 복구합니다.");
      setTimeout(() => log("연결 복구 · 다음 자동 조회를 기다려주세요."), 6500);
    } else if (name === "disconnect") {
      socket?.close();
      log("연결 끊김 · 실제 재연결 로직으로 약 3초 뒤 복구됩니다.");
    } else if (name === "reply") {
      const message = { id: String(++sequence).padStart(4, "0"), role: "GUEST", content: "검증 기준과 책임 범위를 명확히 정하면 합의점을 찾을 수 있을 것 같아요.", createdAt: now() };
      messages.push(message);
      event({ type: "FREE_MESSAGE_SENT", messageId: message.id, role: message.role, content: message.content, submittedAt: message.createdAt });
    }
    snapshot();
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.origin);
    if (!url.pathname.startsWith("/api/")) {
      if (url.origin !== location.origin) throw new Error("Preview blocks external network requests.");
      return nativeFetch(input, options);
    }
    const method = options.method || (input instanceof Request ? input.method : "GET");
    const body = typeof options.body === "string" ? JSON.parse(options.body || "{}") : {};
    const path = url.pathname;
    let data;
    let status = 200;
    if (scene === "skeleton" && ["/api/v1/debates/preview", "/api/v1/debates/preview/histories"].includes(path)) {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, startedAt + 2800 - Date.now())));
    }
    if (path === "/api/v1/auth/refresh") data = { accessToken: "preview-only-session", tokenType: "Bearer" };
    else if (path === "/api/v1/users/me/term-agreements/pending") data = [];
    else if (path === "/api/v1/users/me") data = { id: "preview-me", nickname: "나봄", email: "preview@example.invalid", profileImageKey: null };
    else if (path === "/api/v1/notifications/unread-count") data = { count: 0 };
    else if (path === "/api/v1/notifications") data = { items: [], hasNext: false, nextCursor: null };
    else if (path === "/api/v1/debates/me") data = { items: [{ ...detail, debateId: roomId, debateStatus: detail.status, myRole: "HOST", myPosition: mine, opponent: { userId: "preview-other", nickname: "이로운", profileImageKey: null }, createdAt: now() }], hasNext: false, nextCursor: null };
    else if (path === "/api/v1/debates/preview") data = Date.now() < staleUntil ? staleDetail : detail;
    else if (path === "/api/v1/debates/preview/presence") data = { hostConnected: true, guestConnected: detail.status !== "READY" };
    else if (path === "/api/v1/debates/preview/early-end") data = earlyEnd;
    else if (path === "/api/v1/debates/preview/free-messages") data = { items: [...messages].reverse(), hasNext: false, nextCursor: null };
    else if (path === "/api/v1/debates/preview/histories") {
      if (method === "POST") {
        data = addStatement(detail.currentStage, body.content);
        setTimeout(next, 100);
        status = 201;
      } else {
        historyReads++;
        if (Date.now() < failUntil) status = 503;
        data = Date.now() < staleUntil ? staleHistories : histories;
      }
    } else {
      status = 404;
      log(`정의되지 않은 테스트 요청 차단 · ${method} ${path}`);
    }
    snapshot();
    return new Response(JSON.stringify(status >= 400
      ? { success: false, data: null, error: { code: "PREVIEW_QUERY_ERROR", message: "샘플: 연결이 불안정하여 토론 기록을 불러오지 못했습니다." } }
      : { success: true, data: copy(data), error: null }), { status, headers: { "Content-Type": "application/json" } });
  };

  const NativeWebSocket = window.WebSocket;
  class PreviewSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor(url, protocols) {
      super();
      const target = new URL(String(url));
      if (target.pathname !== "/ws") {
        if (!target.pathname.includes("hmr") || !["localhost", "127.0.0.1"].includes(target.hostname)) throw new Error("Preview blocks external WebSockets.");
        target.hostname = "localhost";
        target.port = "3000";
        return new NativeWebSocket(target, protocols);
      }
      this.url = String(url);
      this.readyState = 0;
      this.subscriptions = {};
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- Scenario controls target the currently connected test socket.
      socket = this;
      setTimeout(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        this.onopen?.({});
        snapshot();
      }, 30);
    }
    frame(data) { setTimeout(() => this.readyState === 1 && this.onmessage?.({ data: data + "\0" }), 10); }
    event(destination, payload) {
      const subscription = this.subscriptions[destination];
      if (subscription && this.readyState === 1) this.frame(`MESSAGE\nsubscription:${subscription}\nmessage-id:preview-${++sequence}\ncontent-type:application/json\n\n${JSON.stringify(payload)}`);
    }
    send(raw) {
      const [head, body = ""] = String(raw).split("\n\n");
      const [command, ...lines] = head.split("\n");
      const headers = Object.fromEntries(lines.map(line => { const index = line.indexOf(":"); return [line.slice(0, index), line.slice(index + 1)]; }));
      if (command === "CONNECT") this.frame("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n");
      if (command === "SUBSCRIBE") this.subscriptions[headers.destination] = headers.id;
      if (command === "SEND") {
        if (headers.destination.endsWith("/free-messages")) {
          const payload = JSON.parse(body.replace(/\0$/, "") || "{}");
          const message = { id: String(++sequence).padStart(4, "0"), role: "HOST", content: payload.content, createdAt: now() };
          messages.push(message);
          event({ type: "FREE_MESSAGE_SENT", messageId: message.id, role: message.role, content: message.content, submittedAt: message.createdAt });
          log("내 메시지 전송 · 샘플 안에만 저장됩니다.");
        } else if (headers.destination.includes("/early-end/")) {
          const actionName = headers.destination.split("/").at(-1);
          earlyEnd = actionName === "propose" ? { pending: true, proposerRole: "HOST", expiresAt: after(30) } : { pending: false, proposerRole: null, expiresAt: null };
          event({ type: { propose: "EARLY_END_PROPOSED", accept: "EARLY_END_ACCEPTED", decline: "EARLY_END_DECLINED", cancel: "EARLY_END_CANCELLED" }[actionName], role: "HOST", expiresAt: earlyEnd.expiresAt });
        }
      }
      if (command === "DISCONNECT") this.close();
    }
    close() {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.onclose?.({ code: 1000 });
      snapshot();
    }
  }
  window.WebSocket = PreviewSocket;
  window.addEventListener("message", message => {
    if (message.source === parent && message.origin === location.origin && message.data?.source === "debate-preview-controls") action(message.data.action, message.data.value);
  });
  window.__debatePreview = { action, snapshot };
  document.addEventListener("click", click => {
    const link = click.target.closest?.("a");
    if (link && !link.getAttribute("href")?.startsWith("#")) {
      click.preventDefault();
      click.stopImmediatePropagation();
      log("샘플 화면 안에서는 다른 페이지 이동을 생략합니다.");
    }
  }, true);
  document.addEventListener("DOMContentLoaded", () => {
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === 1 && node.matches("[data-debate-moment]")) {
          momentCount++;
          log(`연출 #${momentCount} · ${node.dataset.scene}`);
          snapshot();
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    const ready = setInterval(() => {
      if (document.querySelector("#debate-statement, [role=progressbar]")) {
        clearInterval(ready);
        sendParent("ready");
        snapshot();
      }
    }, 100);
  });
  setInterval(snapshot, 1000);
})();
