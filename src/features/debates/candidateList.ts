export function getCandidatePage<T extends { name: string }>(
  candidates: T[], search: string, page: number,
) {
  const filtered = candidates.filter(({ name }) =>
    name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  return {
    total: filtered.length,
    pageCount,
    currentPage,
    visible: filtered.slice((currentPage - 1) * 10, currentPage * 10),
  };
}

export function requestAge(requestedAt: string | null | undefined, now: number): string | null {
  // ponytail: Treat timezone-less server timestamps as UTC until the API includes an offset.
  const time = Date.parse(requestedAt ? requestedAt + (/(?:Z|[+-]\d{2}:\d{2})$/i.test(requestedAt) ? "" : "Z") : "");
  if (!Number.isFinite(time)) return null;
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes === 0) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}달 전`;
  return `${Math.floor(days / 365)}년 전`;
}
