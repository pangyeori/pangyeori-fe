function formatTime(seconds?: number) {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}분${rest ? ` ${rest}초` : ""}` : `${rest}초`;
}

export function DebateTimeBadges({ turnTimeSeconds, freeDebateTimeSeconds }: {
  turnTimeSeconds?: number;
  freeDebateTimeSeconds?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {([["발언 시간", turnTimeSeconds], ["자유 토론 시간", freeDebateTimeSeconds]] as const).map(([label, seconds]) => (
        <div key={label} className={`min-w-28 rounded-xl border px-4 py-3 text-center ${label === "발언 시간" ? "border-blue-100 bg-blue-100" : "border-violet-100 bg-violet-100"}`}>
          <p className={`text-xs font-medium ${label === "발언 시간" ? "text-blue-700" : "text-violet-700"}`}>{label}</p>
          <p className="mt-1 font-bold text-[var(--ink)]">{formatTime(seconds)}</p>
        </div>
      ))}
    </div>
  );
}
