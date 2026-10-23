import { exampleVerdict, storyMessages, storyTopic, type StoryPhase } from "./storyContent";

export type ScreenFrame = { phase: StoryPhase; count: number; typing: number; send?: number };
export const SCREEN_WIDTH = 900;
export const SCREEN_HEIGHT = 1780;

// An editorial device illustration, not a connected DebateRoom or interactive form.
// Visual tokens and hierarchy follow DebateRoom / HistoryItem / DebateVerdictCard.
export function drawStoryScreen(canvas: HTMLCanvasElement, frame: ScreenFrame, avatar?: HTMLImageElement, fontFamily = "system-ui, sans-serif") {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const { phase, count, typing, send = 1 } = frame;
  const ink = "#111827", muted = "#6b7280", line = "#e5e7eb", blue = "#2563eb";
  const rect = (x: number, y: number, width: number, height: number, radius: number | number[], fill: string, border?: string) => {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
  };
  const text = (value: string, x: number, y: number, size: number, color = ink, weight = 400) => {
    ctx.font = `${weight} ${size}px ${fontFamily}`; ctx.fillStyle = color; ctx.fillText(value, x, y);
  };
  const rule = (y: number, x = 44, width = 812) => { ctx.fillStyle = line; ctx.fillRect(x, y, width, 2); };
  const dot = (x: number, y: number, radius: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  };
  const profile = (x: number, y: number, size: number) => {
    ctx.save(); dot(x, y, size / 2, "#f9fafb"); ctx.clip();
    dot(x, y - size * .12, size * .18, "#9ca3af");
    ctx.fillStyle = "#9ca3af"; ctx.beginPath(); ctx.ellipse(x, y + size * .43, size * .32, size * .33, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  const position = (x: number, y: number, pros: boolean) => {
    rect(x, y, 78, 38, 19, pros ? "#dbeafe" : "#ffe4e6");
    text(pros ? "찬성" : "반대", x + 14, y + 28, 25, pros ? "#1d4ed8" : "#be123c", 700);
  };
  const linesFor = (value: string, maxWidth: number, size: number, weight = 400) => {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    const lines: string[] = [];
    let current = "";
    for (const word of value.split(" ")) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) { lines.push(current); current = word; }
      else current = next;
    }
    lines.push(current); return lines;
  };
  const wrap = (value: string, x: number, y: number, maxWidth: number, size: number, color: string, weight = 400) => {
    linesFor(value, maxWidth, size, weight).forEach((value, row) => text(value, x, y + row * (size + 8), size, color, weight));
  };

  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  ctx.fillStyle = "#f3f4f6"; ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  rect(0, 0, 900, 178, 0, "#fff");
  text("9:41", 65, 62, 31, ink, 700);
  for (let i = 0; i < 4; i++) rect(675 + i * 12, 57 - i * 7, 8, 10 + i * 7, 2, ink);
  rect(744, 37, 62, 28, 7, "#fff", muted); rect(749, 42, 48, 18, 3, ink); rect(809, 46, 5, 11, 2, muted);
  text("판겨리", 46, 139, 48, ink, 700);
  profile(813, 123, 49); rule(177, 0, 900);

  rect(44, 211, 206, 45, 23, phase === 2 ? "#e5e7eb" : "#dcfce7");
  dot(67, 233, 5, phase === 2 ? muted : "#16a34a");
  text(phase === 2 ? "토론 종료" : "토론 진행 중", 82, 244, 28, phase === 2 ? muted : "#15803d", 700);
  text(storyTopic, 44, 318, 47, ink, 600);

  rect(44, 354, 812, 140, 28, "#fff", line);
  text("현재 단계", 74, 398, 29, muted, 600);
  text(phase === 2 ? "최종 판정" : "자유 토론", 74, 459, 44, ink, 600);
  rect(571, 398, 249, 51, 26, phase === 2 ? "#f1f5f9" : "#dbeafe");
  text(phase === 2 ? "토론 돌아보기" : "양측 자유 발언", 597, 433, 29, phase === 2 ? muted : "#1d4ed8", 700);

  rect(44, 515, 812, 100, 25, "#fff", line);
  for (const [i, name] of ["참여자 A", "참여자 B"].entries()) {
    const x = 78 + i * 410;
    profile(x + 22, 565, 55); text(name, x + 63, 558, 30, ink, 700);
    position(x + 63, 568, i === 0);
  }
  ctx.fillStyle = line; ctx.fillRect(450, 538, 2, 55);

  rect(44, 636, 812, phase === 2 ? 1006 : 798, 30, "#fff", line);
  text("토론 발언", 75, 695, 38, ink, 700);
  text(phase === 2 ? "최종 판정" : "자유 토론", 682, 692, 28, muted, 600);
  rule(722);

  if (phase === 2) {
    rect(77, 764, 746, 814, 30, "#f9fafb", line);
    dot(161, 856, 54, "#fff");
    if (avatar) ctx.drawImage(avatar, 109, 804, 104, 104);
    else text("AI", 131, 872, 40, blue, 600);
    text("판겨리 AI", 240, 840, 32, muted, 700);
    text("최종 판정", 240, 899, 46, ink, 600);
    wrap(exampleVerdict, 112, 1030, 660, 60, ink, 600);
    rule(1176, 112, 676);
    text("서로의 이유에서", 112, 1270, 43, muted);
    text("새로운 관점을 발견해요.", 112, 1334, 43, muted);
    canvas.setAttribute("data-screen-text", exampleVerdict);
  } else {
    const shown = typing < 1 ? Math.max(0, count - 1) : count;
    let nextY = 739;
    storyMessages.slice(0, shown).forEach((message, i) => {
      const right = message.side === "right";
      const x = right ? 167 : 146, width = right ? 658 : 650;
      const bubbleHeight = linesFor(message.text, width - 48, 60).length * 68 + 24;
      const destination = nextY; nextY += 43 + bubbleHeight + 15;
      const y = destination + (i === count - 1 ? (1438 - destination) * (1 - send) : 0);
      if (!right) { profile(94, y + 82, 60); text(message.name, x, y + 26, 26, muted, 600); }
      position(right ? 747 : 281, y, right);
      rect(x, y + 43, width, bubbleHeight, right ? [28, 28, 9, 28] : [28, 28, 28, 9], right ? blue : "#f1f5f9");
      wrap(message.text, x + 24, y + 107, width - 48, 60, right ? "#fff" : ink);
    });
    // Keep the product's textarea + send-action hierarchy; it is painted, not focusable.
    rect(44, 1456, 812, 225, 27, "#fff", line);
    rect(70, 1481, 760, 104, 22, "#fff", line);
    if (typing < 1 && count > 0) {
      const partial = Array.from(storyMessages[count - 1].text).slice(0, Math.ceil(Array.from(storyMessages[count - 1].text).length * typing)).join("");
      text(partial, 94, 1547, 40);
      const cursorX = Math.min(786, 98 + ctx.measureText(partial).width);
      ctx.fillStyle = blue; ctx.fillRect(cursorX, 1512, 3, 44);
    } else text("자유롭게 의견을 나눠보세요", 94, 1547, 36, "#9ca3af");
    text("전송 Enter · 줄바꿈 Shift + Enter", 74, 1638, 24, muted);
    rect(644, 1602, 184, 55, 15, ink); text("전송", 702, 1641, 30, "#fff", 700);
    canvas.setAttribute("data-screen-text", storyMessages.slice(0, shown).map((m) => m.text).join(" / "));
  }
  rect(320, 1733, 260, 12, 6, ink);
}
