import type { DebateLifecycleStatus } from "@/features/debates/api/debates";

export function isPastDebate(status: DebateLifecycleStatus) {
  return status === "FINISHED" || status === "CANCELLED";
}

export function debateStatusLabel(status: DebateLifecycleStatus) {
  if (status === "WAITING") return "토론 대기중";
  if (status === "FINISHED") return "토론 완료";
  if (status === "CANCELLED") return "토론 취소";
  return "토론 진행중";
}

export async function fetchRemainingDebatePages(
  hasNextPage: boolean,
  fetchNextPage: () => Promise<{ hasNextPage?: boolean }>,
) {
  let hasNext = hasNextPage;
  while (hasNext) {
    hasNext = Boolean((await fetchNextPage()).hasNextPage);
  }
}
