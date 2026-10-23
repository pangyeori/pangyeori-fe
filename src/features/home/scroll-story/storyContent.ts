// Editorial illustration only: never passed to a chat, verdict API, or socket.
export const storyMessages = [
  { name: "참여자 A", text: "음악이 있으면 집중돼.", side: "right" },
  { name: "참여자 B", text: "난 가사가 있으면 산만해.", side: "left" },
  { name: "참여자 A", text: "그럼 가사 없는 음악은?", side: "right" },
  { name: "참여자 B", text: "그건 괜찮을 것 같아.", side: "left" },
] as const;
export const storyTopic = "공부할 때 음악, 괜찮을까?";
export const exampleVerdict = "조건을 구체화한 점이 좋았어요.";
export const sceneTitles = ["서로의 이유를 나눠요.", "양쪽 이야기를 살펴요.", "AI 판정으로 돌아봐요."] as const;
export type StoryPhase = 0 | 1 | 2;
export const messageThresholds = [0.08, 0.18, 0.28, 0.38];
export function storyState(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return { progress: p, phase: (p < 0.5 ? 0 : p < 0.78 ? 1 : 2) as StoryPhase, count: messageThresholds.filter((threshold) => p >= threshold).length };
}
export const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
