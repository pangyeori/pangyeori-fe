type Message = { id: string; content: string | null };

export function detectNewMessage(previousId: string | null, messages: Message[] | undefined, atBottom: boolean) {
  const latest = messages?.at(-1);
  if (!latest) return { latestId: previousId, preview: null };
  if (previousId === null || previousId === latest.id) return { latestId: latest.id, preview: null };
  return {
    latestId: latest.id,
    preview: atBottom ? null : latest.content ?? "새 발언이 도착했습니다.",
  };
}
