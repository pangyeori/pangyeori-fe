"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import {
  getDebate,
  getDebateHistories,
  getMyDebate,
  submitDebateHistory,
  type DebateHistory,
  type DebateRole,
  type Position,
} from "@/features/debates/api/debates";
import { DebateRoomSkeleton } from "@/features/debates/components/DebateRoomSkeleton";
import { DebateTimeBadges, formatDebateTime } from "@/features/debates/components/DebateTimeBadges";
import {
  debateStageLabels,
  formatTurnTime,
  parseServerTime,
  remainingTurnSeconds,
  roleForPosition,
  speakingPosition,
} from "@/features/debates/debateProgress";
import { useDebatePresence } from "@/features/debates/hooks/useDebatePresence";
import { resolvePresenceStatus, type PresenceStatus } from "@/features/debates/presenceEvents";
import { getProfileImageViewUrl } from "@/features/mypage/api/getMyProfile";

const presenceLabels: Record<PresenceStatus, string> = {
  unknown: "입장 확인 중",
  entered: "입장 완료",
  reconnecting: "재연결 중",
  left: "퇴장",
};

function positionLabel(position: Position) {
  return position === "PROS" ? "찬성" : "반대";
}

const STATEMENT_MAX_HEIGHT = 144;

function resizeStatementInput(element: HTMLTextAreaElement) {
  element.style.height = "44px";
  element.style.height = `${Math.min(element.scrollHeight, STATEMENT_MAX_HEIGHT)}px`;
  element.style.overflowY = element.scrollHeight > STATEMENT_MAX_HEIGHT ? "auto" : "hidden";
}

function resetStatementInput(element: HTMLTextAreaElement) {
  element.style.height = "44px";
  element.style.overflowY = "hidden";
}

function PositionBadge({ position }: { position: Position }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${position === "PROS" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
      {positionLabel(position)}
    </span>
  );
}

function HostMark() {
  return (
    <span className="inline-flex text-amber-500" aria-label="방장" title="방장">
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="m3 5 3.2 3L10 3l3.8 5L17 5l-1.2 9H4.2L3 5Zm1.5 11h11v1.5h-11V16Z" />
      </svg>
    </span>
  );
}

function MessageAvatar({ nickname, profileImageUrl }: {
  nickname: string;
  profileImageUrl: string | null;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-600 ring-1 ring-[var(--line)]">
      {nickname.trim().charAt(0) || "?"}
      {profileImageUrl && !hasImageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="absolute inset-0 h-full w-full object-cover" src={profileImageUrl} alt={`${nickname}님의 프로필`} onError={() => setHasImageError(true)} />
      ) : null}
    </span>
  );
}

function ParticipantCard({ role, position, status, name }: {
  role: DebateRole;
  position: Position;
  status: PresenceStatus;
  name: string;
}) {
  const isHost = role === "HOST";
  const entered = status === "entered";

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base ${isHost ? "bg-[var(--brand-blue)]" : "bg-rose-500"}`}>
          {isHost ? "H" : "G"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-[var(--ink)]">{name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <PositionBadge position={position} />
            {isHost ? <HostMark /> : null}
          </div>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${entered ? "bg-[var(--success)]" : status === "reconnecting" ? "bg-blue-400" : status === "left" ? "bg-slate-400" : "bg-amber-400"}`} aria-hidden />
      </div>
      <p className="mt-2 text-xs font-semibold text-[var(--ink-muted)] sm:mt-3">{presenceLabels[status]}</p>
    </li>
  );
}

function HistoryItem({ history, hostPosition, myPosition, opponentName, opponentProfileImageUrl }: {
  history: DebateHistory;
  hostPosition: Position;
  myPosition: Position | undefined;
  opponentName: string;
  opponentProfileImageUrl: string | null;
}) {
  const position = speakingPosition(history.stage);
  const role = position ? roleForPosition(position, hostPosition) : null;
  const mine = Boolean(position && position === myPosition);

  return (
    <li className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine ? <MessageAvatar key={opponentProfileImageUrl ?? "fallback"} nickname={opponentName} profileImageUrl={opponentProfileImageUrl} /> : null}
      <div className={`flex max-w-[82%] flex-col sm:max-w-[78%] ${mine ? "items-end" : "items-start"}`}>
        <div className={`mb-1 flex items-center gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
          {!mine ? <span className="max-w-28 truncate text-xs font-semibold text-[var(--ink-muted)]">{opponentName}</span> : null}
          {role === "HOST" ? <HostMark /> : null}
          {position ? <PositionBadge position={position} /> : null}
        </div>
        <article className={`rounded-2xl px-4 py-3 ${mine ? "rounded-br-md bg-[var(--brand-blue)] text-white" : "rounded-bl-md bg-[var(--surface-muted)] text-[var(--ink)]"}`}>
          <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${history.content === null ? "italic opacity-75" : ""}`}>
            {history.content ?? "제한 시간 내에 발언하지 않았습니다."}
          </p>
        </article>
      </div>
    </li>
  );
}

export function DebateRoom({ debateId }: { debateId: string }) {
  const router = useRouter();
  const { accessToken, isReady } = useAuth();
  const [content, setContent] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [showFloatingProgress, setShowFloatingProgress] = useState(false);

  const debateQuery = useQuery({
    queryKey: ["debates", debateId, "detail", accessToken],
    queryFn: () => getDebate(debateId, accessToken!),
    enabled: isReady && Boolean(accessToken),
    retry: false,
    refetchInterval: (query) => query.state.data?.status === "READY" ? 1000 : false,
  });
  const entryAllowed = debateQuery.data?.status === "READY" || debateQuery.data?.status === "IN_PROGRESS";
  const historiesQuery = useQuery({
    queryKey: ["debates", debateId, "histories", accessToken],
    queryFn: () => getDebateHistories(debateId, accessToken!),
    enabled: Boolean(accessToken && entryAllowed),
    retry: false,
  });
  const memberQuery = useQuery({
    queryKey: ["debates", debateId, "member", accessToken],
    queryFn: () => getMyDebate(debateId, accessToken!),
    enabled: Boolean(accessToken && entryAllowed),
    staleTime: 60_000,
  });
  const opponentImageKey = memberQuery.data?.opponent?.profileImageKey;
  const opponentImageQuery = useQuery({
    queryKey: ["storage", "profile-image", opponentImageKey, accessToken],
    queryFn: () => getProfileImageViewUrl(opponentImageKey!, accessToken!),
    enabled: Boolean(accessToken && opponentImageKey),
  });
  const presence = useDebatePresence(debateId, entryAllowed);
  const syncedConnection = useRef(0);
  const recoveredDeadline = useRef<string | null>(null);
  const statementInput = useRef<HTMLTextAreaElement>(null);
  const { refetch: refetchDebate } = debateQuery;
  const { refetch: refetchHistories } = historiesQuery;
  const { refetch: refetchMember } = memberQuery;

  const submitMutation = useMutation({
    mutationFn: (statement: string) => submitDebateHistory(debateId, statement, accessToken!),
    onSuccess: () => {
      setContent("");
      setSubmitError("");
      if (statementInput.current) resetStatementInput(statementInput.current);
      void Promise.all([refetchDebate(), refetchHistories()]);
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "발언을 제출하지 못했습니다.");
      void Promise.all([refetchDebate(), refetchHistories()]);
    },
  });

  useEffect(() => {
    if (isReady && !accessToken) {
      router.replace(`/signin?next=${encodeURIComponent(`/debates/${debateId}`)}`);
    }
  }, [accessToken, debateId, isReady, router]);

  useEffect(() => {
    if (!presence.connectedAt || presence.connectedAt === syncedConnection.current) return;
    syncedConnection.current = presence.connectedAt;
    void Promise.all([refetchDebate(), refetchHistories(), refetchMember()]);
  }, [presence.connectedAt, refetchDebate, refetchHistories, refetchMember]);

  useEffect(() => {
    if (!presence.latestProgressEvent) return;
    void Promise.all([refetchDebate(), refetchHistories()]);
  }, [presence.latestProgressEvent, refetchDebate, refetchHistories]);

  useEffect(() => {
    if (!debateQuery.data?.turnEndsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [debateQuery.data?.turnEndsAt]);

  useEffect(() => {
    const turnEndsAt = debateQuery.data?.turnEndsAt;
    const deadline = parseServerTime(turnEndsAt);
    if (!turnEndsAt || !Number.isFinite(deadline) || recoveredDeadline.current === turnEndsAt) return;
    const timer = window.setTimeout(() => {
      recoveredDeadline.current = turnEndsAt;
      void refetchHistories().then(() => refetchDebate());
    }, Math.max(0, deadline - Date.now()) + 300);
    return () => window.clearTimeout(timer);
  }, [debateQuery.data?.turnEndsAt, refetchDebate, refetchHistories]);

  useEffect(() => {
    const updateFloatingProgress = () => setShowFloatingProgress(window.scrollY > 24);
    updateFloatingProgress();
    window.addEventListener("scroll", updateFloatingProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateFloatingProgress);
  }, [entryAllowed]);

  if (!isReady || (accessToken && debateQuery.isPending)) return <DebateRoomSkeleton />;
  if (!accessToken) return null;

  if (debateQuery.isError || !debateQuery.data || !entryAllowed) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-5 py-20 text-center">
          <h1 className="text-2xl font-bold text-[var(--ink)]">토론방에 입장할 수 없습니다</h1>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">{debateQuery.error instanceof Error ? debateQuery.error.message : "아직 입장할 수 없는 상태입니다."}</p>
          <Link className="mt-6 inline-block text-sm font-semibold text-[var(--brand-blue)] underline" href="/mypage">내 토론방으로 이동</Link>
        </main>
      </div>
    );
  }

  const debate = debateQuery.data;
  const member = memberQuery.data;
  const myPosition = member?.myPosition;
  const currentSpeaker = speakingPosition(debate.currentStage);
  const started = presence.started || debate.status === "IN_PROGRESS";
  const isMyTurn = started && Boolean(currentSpeaker && currentSpeaker === myPosition);
  const remainingSeconds = remainingTurnSeconds(debate.turnEndsAt, now);
  const hostName = member?.myRole === "HOST" ? "나" : member?.opponent?.nickname ?? "개설자";
  const guestName = member?.myRole === "GUEST" ? "나" : member?.opponent?.nickname ?? "게스트";
  const opponentName = member?.opponent?.nickname ?? "상대방";
  const turnStatusLabel = !member
    ? "차례 확인 중"
    : isMyTurn
      ? "내 차례"
      : currentSpeaker
        ? "상대방 차례"
        : "판정 대기";
  const inputPlaceholder = !started
    ? "토론 시작을 기다리고 있습니다."
    : !member
      ? "내 진영 정보를 확인하고 있습니다."
      : currentSpeaker === null
        ? "다음 토론 단계를 기다리고 있습니다."
        : isMyTurn
          ? `${positionLabel(currentSpeaker)} 측 입론을 입력하세요.`
          : "상대방의 발언을 기다리고 있습니다.";

  const submitStatement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const statement = content.trim();
    if (!statement || !isMyTurn || submitMutation.isPending) return;
    setSubmitError("");
    submitMutation.mutate(statement);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader />
      {showFloatingProgress ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-3" aria-hidden="true">
          <div className="flex max-w-full items-center gap-3 rounded-full border border-[var(--line)] bg-white/95 px-5 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.2)] backdrop-blur">
            <span className="max-w-32 truncate text-sm font-bold text-[var(--ink)] sm:max-w-none">{debateStageLabels[debate.currentStage]}</span>
            <span className="h-5 w-px bg-[var(--line)]" />
            <span className={`font-mono text-lg font-bold ${remainingSeconds === 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
              {formatTurnTime(remainingSeconds)}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isMyTurn ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
              {turnStatusLabel}
            </span>
          </div>
        </div>
      ) : null}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${started ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {started ? "토론 진행 중" : "참여자 입장 대기"}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">{debate.title}</h1>
            {debate.description ? <p className="mt-2 text-sm text-[var(--ink-muted)]">{debate.description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden sm:block">
              <DebateTimeBadges turnTimeSeconds={debate.turnTimeSeconds} freeDebateTimeSeconds={debate.freeDebateTimeSeconds} />
            </div>
            <Button variant="outline" className="!h-10 !w-auto px-4" onClick={() => router.push("/mypage")}>
              나가기
            </Button>
          </div>
        </div>

        <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_10px_30px_rgba(16,24,40,0.06)] lg:hidden" aria-label="현재 토론 진행 상황">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--ink-muted)]">현재 단계</p>
              <h2 className="mt-1 truncate text-lg font-bold text-[var(--ink)]">{debateStageLabels[debate.currentStage]}</h2>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${isMyTurn ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
              {turnStatusLabel}
            </span>
          </div>

          {started && currentSpeaker ? (
            <div className="mt-4 flex items-end justify-between rounded-xl bg-[var(--surface-muted)] px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-[var(--ink-muted)]">남은 발언 시간</p>
                <p className={`mt-1 font-mono text-3xl font-bold tracking-tight ${remainingSeconds === 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`} aria-live="polite">
                  {formatTurnTime(remainingSeconds)}
                </p>
              </div>
              <p className="pb-1 text-right text-xs font-semibold text-[var(--ink-muted)]">
                {positionLabel(currentSpeaker)} 측 발언<br />제한 {formatDebateTime(debate.turnTimeSeconds)}
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--ink-muted)]">
              {started ? "다음 단계를 준비하고 있습니다." : "두 참여자의 입장을 기다리고 있습니다."}
            </p>
          )}

        </section>
        {memberQuery.isError || (memberQuery.isSuccess && !member) ? (
          <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-bg)] px-4 py-3" role="alert">
            <p className="text-sm font-semibold text-[var(--danger)]">내 진영 정보를 확인하지 못했습니다.</p>
            <button className="shrink-0 text-sm font-semibold text-[var(--ink)] underline" type="button" onClick={() => memberQuery.refetch()}>
              다시 시도
            </button>
          </div>
        ) : null}

        <div className="mt-4 grid items-start gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[240px_1fr_220px]">
          <aside className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_12px_40px_rgba(16,24,40,0.05)] sm:p-5">
            <h2 className="font-bold text-[var(--ink)]">참여자</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 lg:block lg:space-y-3">
              <ParticipantCard role="HOST" position={debate.hostPosition} status={resolvePresenceStatus(presence.roles.HOST, started)} name={hostName} />
              <ParticipantCard role="GUEST" position={debate.guestPosition} status={resolvePresenceStatus(presence.roles.GUEST, started)} name={guestName} />
            </ul>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <h2 className="font-bold text-[var(--ink)]">토론 발언</h2>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">제출한 발언은 수정할 수 없습니다.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isMyTurn ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                {turnStatusLabel}
              </span>
            </div>

            <div className="min-h-56 p-4 sm:min-h-72 sm:p-5">
              {historiesQuery.isPending ? (
                <div className="space-y-5 motion-safe:animate-pulse" aria-label="발언 내역 불러오는 중">
                  <div className="h-20 w-4/5 rounded-2xl bg-slate-100" />
                  <div className="ml-auto h-20 w-4/5 rounded-2xl bg-slate-200" />
                </div>
              ) : historiesQuery.isError ? (
                <div className="py-12 text-center" role="alert">
                  <p className="text-sm text-[var(--danger)]">발언 내역을 불러오지 못했습니다.</p>
                  <button className="mt-3 text-sm font-semibold text-[var(--brand-blue)] underline" type="button" onClick={() => historiesQuery.refetch()}>
                    다시 시도
                  </button>
                </div>
              ) : historiesQuery.data?.length ? (
                <ol className="space-y-5">
                  {historiesQuery.data.map((history) => (
                    <HistoryItem
                      key={history.id}
                      history={history}
                      hostPosition={debate.hostPosition}
                      myPosition={myPosition}
                      opponentName={opponentName}
                      opponentProfileImageUrl={opponentImageQuery.data?.url ?? null}
                    />
                  ))}
                </ol>
              ) : (
                <p className="py-12 text-center text-sm text-[var(--ink-muted)]">
                  {started ? "첫 발언을 기다리고 있습니다." : "두 참여자가 입장하면 토론이 시작됩니다."}
                </p>
              )}
            </div>

            <form className="border-t border-[var(--line)] p-4 sm:p-5" onSubmit={submitStatement}>
              <label className="sr-only" htmlFor="debate-statement">토론 발언</label>
              <textarea
                ref={statementInput}
                id="debate-statement"
                rows={1}
                className="h-11 max-h-36 min-h-11 w-full resize-none overflow-y-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm leading-6 outline-none transition focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                value={content}
                maxLength={1000}
                disabled={!isMyTurn || submitMutation.isPending}
                placeholder={inputPlaceholder}
                onChange={(event) => {
                  setContent(event.target.value);
                  resizeStatementInput(event.currentTarget);
                }}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <span className="text-xs text-[var(--ink-faint)]">{content.length}/1000</span>
                  {submitError ? <p className="mt-1 text-xs font-semibold text-[var(--danger)]" role="alert">{submitError}</p> : null}
                </div>
                <Button className="!h-10 sm:!w-auto sm:px-5" type="submit" loading={submitMutation.isPending} disabled={!isMyTurn || !content.trim()}>
                  발언 제출
                </Button>
              </div>
            </form>
          </section>

          <aside className="hidden space-y-4 lg:block">
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <h2 className="font-bold text-[var(--ink)]">진행 단계</h2>
              <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4 text-sm font-semibold text-[var(--ink-muted)]">
                {debateStageLabels[debate.currentStage]}
              </p>
              {started && currentSpeaker ? (
                <div className="mt-3 rounded-xl border border-[var(--line)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--ink-muted)]">남은 발언 시간</p>
                  <p className={`mt-1 font-mono text-2xl font-bold ${remainingSeconds === 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`} aria-live="polite">
                    {formatTurnTime(remainingSeconds)}
                  </p>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
