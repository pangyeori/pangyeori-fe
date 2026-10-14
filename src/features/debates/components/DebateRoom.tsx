"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, type FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/context/AuthProvider";
import {
  getDebate,
  getDebateHistories,
  getMyDebate,
  submitDebateHistory,
  debateStages,
  type DebateDetail,
  type DebateHistories,
  type DebateHistory,
  type DebateRole,
  type DebateStage,
  type Position,
} from "@/features/debates/api/debates";
import { DebateRoomSkeleton } from "@/features/debates/components/DebateRoomSkeleton";
import { DebateVerdictCard, DebateVerdictPendingCard } from "@/features/debates/components/DebateVerdictCard";
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
import { mergeDebateHistoriesEvent, resolvePresenceStatus, type PresenceStatus } from "@/features/debates/presenceEvents";
import { awaitingVerdictStage, canSubmitStatement } from "@/features/debates/debateVerdict";
import { getProfileImageViewUrl } from "@/features/mypage/api/getMyProfile";
import { ProfileAvatar } from "@/features/mypage/components/ProfileAvatar";
import { useMyProfile } from "@/features/mypage/hooks/useMyProfile";

const presenceLabels: Record<PresenceStatus, string> = {
  unknown: "입장 확인 중",
  entered: "입장 완료",
  reconnecting: "재연결 중",
  left: "퇴장",
};

const messageTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const messageDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function formatMessageDateTime(date: Date) {
  const parts = new Map(messageDateTimeFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.get("year")}년 ${parts.get("month")}월 ${parts.get("day")}일 ${parts.get("dayPeriod")} ${parts.get("hour")}:${parts.get("minute")}`;
}

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

function StageNotice({ stage }: { stage: DebateStage }) {
  return (
    <li className="flex items-center gap-3 py-2" role="status">
      <span className="h-px flex-1 bg-slate-100" aria-hidden />
      <p className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-center text-xs font-medium text-slate-500 sm:text-sm">
        {stage === "FREE" ? "자유 토론이 시작되었습니다." : `${debateStageLabels[stage]} 단계가 시작되었습니다.`}
      </p>
      <span className="h-px flex-1 bg-slate-100" aria-hidden />
    </li>
  );
}

function ParticipantCard({ role, position, status, name, profileImageUrl }: {
  role: DebateRole;
  position: Position;
  status: PresenceStatus;
  name: string;
  profileImageUrl: string | null;
}) {
  const isHost = role === "HOST";
  const entered = status === "entered";

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <ProfileAvatar
          key={profileImageUrl ?? "fallback"}
          nickname={name}
          profileImageUrl={profileImageUrl}
          className="h-9 w-9 sm:h-11 sm:w-11"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate font-bold text-[var(--ink)]">{name}</p>
            {isHost ? <HostMark /> : null}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <PositionBadge position={position} />
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-1 text-[10px] font-semibold text-[var(--ink-muted)] sm:gap-1.5 sm:text-xs">
          <span className={`h-2.5 w-2.5 rounded-full ${entered ? "bg-[var(--success)]" : status === "reconnecting" ? "bg-blue-400" : status === "left" ? "bg-slate-400" : "bg-amber-400"}`} aria-hidden />
          <span className="whitespace-nowrap">{presenceLabels[status]}</span>
        </div>
      </div>
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
  const submittedAt = new Date(parseServerTime(history.createdAt));
  const messageTime = messageTimeFormatter.format(submittedAt);
  const messageDateTime = formatMessageDateTime(submittedAt);

  return (
    <li className={`flex items-start gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine ? <ProfileAvatar key={opponentProfileImageUrl ?? "fallback"} nickname={opponentName} profileImageUrl={opponentProfileImageUrl} className="mt-6 h-12 w-12" /> : null}
      <div className={`flex max-w-[82%] flex-col sm:max-w-[78%] ${mine ? "items-end" : "items-start"}`}>
        <div className={`mb-1 flex items-center gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
          {!mine ? <span className="max-w-28 truncate text-xs font-semibold text-[var(--ink-muted)]">{opponentName}</span> : null}
          {role === "HOST" ? <HostMark /> : null}
          {position ? <PositionBadge position={position} /> : null}
        </div>
        <article className={`flex min-h-12 items-center rounded-2xl px-4 py-3 ${mine ? "rounded-br-md bg-[var(--brand-blue)] text-white" : "rounded-bl-md bg-slate-100 text-[var(--ink)]"}`}>
          <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${history.content === null ? "italic opacity-75" : ""}`}>
            {history.content ?? "제한 시간 내에 발언하지 않았습니다."}
          </p>
        </article>
        <time
          className="mt-1 self-start text-[10px] text-[var(--ink-faint)] sm:text-xs"
          dateTime={history.createdAt}
          title={messageDateTime}
          aria-label={messageDateTime}
        >
          {messageTime}
        </time>
      </div>
    </li>
  );
}

export function DebateRoom({ debateId }: { debateId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isReady } = useAuth();
  const [content, setContent] = useState("");
  const [scheduledContent, setScheduledContent] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [showFloatingProgress, setShowFloatingProgress] = useState(false);

  const debateQuery = useQuery({
    queryKey: ["debates", debateId, "detail", accessToken],
    queryFn: () => getDebate(debateId, accessToken!),
    enabled: isReady && Boolean(accessToken),
    retry: false,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false;
      const debate = query.state.data;
      if (debate?.status === "READY") return 1000;
      return debate?.status === "IN_PROGRESS"
        && debate.currentStage !== "FREE"
        && debate.currentStage !== "FINAL_VERDICT" ? 3000 : false;
    },
  });
  const entryAllowed = debateQuery.data?.status === "READY" || debateQuery.data?.status === "IN_PROGRESS";
  const historiesQuery = useQuery({
    queryKey: ["debates", debateId, "histories", accessToken],
    queryFn: () => getDebateHistories(debateId, accessToken!),
    enabled: Boolean(accessToken && entryAllowed),
    retry: false,
    // Recover a missed verdict event without submitting another statement or AI request.
    refetchInterval: (query) => debateQuery.data?.status === "IN_PROGRESS"
      && query.state.status !== "error"
      && awaitingVerdictStage(debateQuery.data.currentStage, query.state.data) ? 3000 : false,
  });
  const memberQuery = useQuery({
    queryKey: ["debates", debateId, "member", accessToken],
    queryFn: () => getMyDebate(debateId, accessToken!),
    enabled: Boolean(accessToken && entryAllowed),
    staleTime: 60_000,
  });
  const profileQuery = useMyProfile();
  const opponentImageKey = memberQuery.data?.opponent?.profileImageKey;
  const opponentImageQuery = useQuery({
    queryKey: ["storage", "profile-image", opponentImageKey, accessToken],
    queryFn: () => getProfileImageViewUrl(opponentImageKey!, accessToken!),
    enabled: Boolean(accessToken && opponentImageKey),
  });
  const presence = useDebatePresence(debateId, entryAllowed);
  const syncedConnection = useRef(0);
  const recoveredDeadline = useRef<string | null>(null);
  const scheduledSubmissionInFlight = useRef(false);
  const messageViewport = useRef<HTMLDivElement>(null);
  const shouldStickToLatestMessage = useRef(true);
  const statementInput = useRef<HTMLTextAreaElement>(null);
  const { refetch: refetchDebate } = debateQuery;
  const { refetch: refetchHistories } = historiesQuery;
  const { refetch: refetchMember } = memberQuery;

  const submitMutation = useMutation({
    mutationFn: (statement: string) => submitDebateHistory(debateId, statement, accessToken!),
    onSuccess: (history) => {
      queryClient.setQueryData<DebateHistories>(
        ["debates", debateId, "histories", accessToken],
        (data) => ({
          histories: [...(data?.histories ?? []).filter((item) => item.stage !== history.stage), history],
          verdicts: data?.verdicts ?? [],
        }),
      );
      setContent("");
      setScheduledContent("");
      scheduledSubmissionInFlight.current = false;
      setSubmitError("");
      if (statementInput.current) resetStatementInput(statementInput.current);
      void Promise.all([refetchDebate(), refetchHistories()]);
    },
    onError: (error, statement) => {
      setContent(statement);
      setScheduledContent("");
      scheduledSubmissionInFlight.current = false;
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
    const event = presence.latestProgressEvent;
    if (!event) return;
    if (event.debateId !== debateId) return;
    if (event.type === "STAGE_CHANGED" && event.stage) {
      queryClient.setQueryData<DebateDetail>(
        ["debates", debateId, "detail", accessToken],
        (data) => data ? { ...data, currentStage: event.stage!, turnEndsAt: event.turnEndsAt ?? null } : data,
      );
    }
    queryClient.setQueryData<DebateHistories>(
      ["debates", debateId, "histories", accessToken],
      (data) => mergeDebateHistoriesEvent(data, event),
    );
    void Promise.all([refetchDebate(), refetchHistories()]);
  }, [accessToken, debateId, presence.latestProgressEvent, queryClient, refetchDebate, refetchHistories]);

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

  const pendingVerdictStage = awaitingVerdictStage(debateQuery.data?.currentStage ?? "NONE", historiesQuery.data);
  const awaitingVerdict = Boolean(pendingVerdictStage);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (messageViewport.current && shouldStickToLatestMessage.current) {
        messageViewport.current.scrollTop = messageViewport.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [debateQuery.data?.currentStage, historiesQuery.data?.histories.length, historiesQuery.data?.verdicts.length, awaitingVerdict, scheduledContent]);

  const shouldFocusStatement = debateQuery.data?.status === "IN_PROGRESS"
    && canSubmitStatement(debateQuery.data.currentStage, historiesQuery.data)
    && !awaitingVerdict
    && speakingPosition(debateQuery.data?.currentStage ?? "NONE") === memberQuery.data?.myPosition;

  useEffect(() => {
    if (shouldFocusStatement) statementInput.current?.focus();
  }, [shouldFocusStatement]);

  useEffect(() => {
    const statement = scheduledContent.trim();
    if (!shouldFocusStatement || !statement
      || submitMutation.isPending || scheduledSubmissionInFlight.current) return;

    scheduledSubmissionInFlight.current = true;
    submitMutation.mutate(statement);
  }, [scheduledContent, shouldFocusStatement, submitMutation]);

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
  const currentSpeaker = canSubmitStatement(debate.currentStage, historiesQuery.data) && !awaitingVerdict ? speakingPosition(debate.currentStage) : null;
  const started = presence.started || debate.status === "IN_PROGRESS";
  const isMyTurn = started && Boolean(currentSpeaker && currentSpeaker === myPosition);
  const canCompose = started && Boolean(member && currentSpeaker) && !scheduledContent;
  const isPrewriting = canCompose && !isMyTurn;
  const remainingSeconds = remainingTurnSeconds(debate.turnEndsAt, now);
  const myNickname = profileQuery.data?.nickname ?? "내 정보 확인 중";
  const hostName = member?.myRole === "HOST" ? `${myNickname}(나)` : member?.opponent?.nickname ?? "개설자";
  const guestName = member?.myRole === "GUEST" ? `${myNickname}(나)` : member?.opponent?.nickname ?? "게스트";
  const opponentName = member?.opponent?.nickname ?? "상대방";
  const myProfileImageUrl = profileQuery.data?.profileImageUrl ?? null;
  const opponentProfileImageUrl = opponentImageQuery.data?.url ?? null;
  const histories = historiesQuery.data?.histories;
  const verdicts = historiesQuery.data?.verdicts;
  const currentVerdict = verdicts?.find((verdict) => verdict.stage === debate.currentStage);
  const currentStageIndex = debateStages.indexOf(debate.currentStage);
  const timelineStages = currentStageIndex > 0 ? debateStages.slice(1, currentStageIndex + 1) : [];
  const hostProfileImageUrl = member?.myRole === "HOST" ? myProfileImageUrl : opponentProfileImageUrl;
  const guestProfileImageUrl = member?.myRole === "GUEST" ? myProfileImageUrl : opponentProfileImageUrl;
  const turnStatusLabel = !member
    ? "차례 확인 중"
    : isMyTurn
      ? "내 차례"
      : currentSpeaker
        ? "상대방 차례"
        : awaitingVerdict ? "AI 판결 중" : currentVerdict ? "AI 판결 완료" : "다음 단계 대기";
  const inputPlaceholder = !started
    ? "토론 시작을 기다리고 있습니다."
    : !member
      ? "내 진영 정보를 확인하고 있습니다."
      : awaitingVerdict
        ? "AI가 양측 발언을 검토하고 있습니다."
      : currentSpeaker === null
        ? "다음 토론 단계를 기다리고 있습니다."
        : scheduledContent
          ? "예약한 발언을 취소하면 다시 입력할 수 있습니다."
        : isMyTurn
          ? `${debateStageLabels[debate.currentStage]} 내용을 입력하세요.`
          : "내 차례에 보낼 발언을 미리 입력하세요.";

  const submitStatement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const statement = content.trim();
    if (!canCompose || !statement || submitMutation.isPending) return;
    setSubmitError("");
    shouldStickToLatestMessage.current = true;
    if (!isMyTurn) {
      setScheduledContent(statement);
      setContent("");
      if (statementInput.current) resetStatementInput(statementInput.current);
      return;
    }
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
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <div className="hidden sm:block">
              <DebateTimeBadges turnTimeSeconds={debate.turnTimeSeconds} freeDebateTimeSeconds={debate.freeDebateTimeSeconds} />
            </div>
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

          <div className="mt-4 border-t border-[var(--line)] pt-4">
            <Button variant="outline" className="!h-10" onClick={() => router.push("/mypage")}>
              나가기
            </Button>
          </div>
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
              <ParticipantCard role="HOST" position={debate.hostPosition} status={resolvePresenceStatus(presence.roles.HOST, started)} name={hostName} profileImageUrl={hostProfileImageUrl} />
              <ParticipantCard role="GUEST" position={debate.guestPosition} status={resolvePresenceStatus(presence.roles.GUEST, started)} name={guestName} profileImageUrl={guestProfileImageUrl} />
            </ul>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <h2 className="font-bold text-[var(--ink)]">토론 발언</h2>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">단계에 따라 발언과 AI 판결이 실시간으로 표시됩니다.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isMyTurn ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                {turnStatusLabel}
              </span>
            </div>

            <div
              ref={messageViewport}
              className="min-h-56 max-h-[60vh] overflow-y-auto overscroll-y-auto p-4 sm:min-h-72 sm:p-5 lg:max-h-[640px]"
              onScroll={(event) => {
                const element = event.currentTarget;
                shouldStickToLatestMessage.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
              }}
            >
              {historiesQuery.isPending ? (
                <div className="space-y-5 motion-safe:animate-pulse" aria-label="발언 내역 불러오는 중">
                  <div className="h-20 w-4/5 rounded-2xl bg-slate-100" />
                  <div className="ml-auto h-20 w-4/5 rounded-2xl bg-slate-200" />
                </div>
              ) : historiesQuery.isError && !historiesQuery.data ? (
                <div className="py-12 text-center" role="alert">
                  <p className="text-sm text-[var(--danger)]">{historiesQuery.error instanceof Error ? historiesQuery.error.message : "발언과 판결을 불러오지 못했습니다."}</p>
                  <button className="mt-3 text-sm font-semibold text-[var(--brand-blue)] underline" type="button" onClick={() => historiesQuery.refetch()}>
                    다시 시도
                  </button>
                </div>
              ) : timelineStages.length || histories?.length || verdicts?.length || scheduledContent ? (
                <ol className="space-y-5">
                  {timelineStages.map((stage) => (
                    <Fragment key={stage}>
                      <StageNotice stage={stage} />
                      {histories?.filter((history) => history.stage === stage).map((history) => (
                        <HistoryItem
                          key={history.id}
                          history={history}
                          hostPosition={debate.hostPosition}
                          myPosition={myPosition}
                          opponentName={opponentName}
                          opponentProfileImageUrl={opponentProfileImageUrl}
                        />
                      ))}
                      {verdicts?.filter((verdict) => verdict.stage === stage).map((verdict) => (
                        <li key={`verdict-${verdict.id}`}>
                          <DebateVerdictCard key={verdict.id} verdict={verdict} />
                        </li>
                      ))}
                      {pendingVerdictStage === stage && !verdicts?.some((verdict) => verdict.stage === stage) ? (
                        <li>
                          <DebateVerdictPendingCard
                            stage={stage}
                            isFetching={historiesQuery.isFetching}
                            onRetry={() => void Promise.all([refetchDebate(), refetchHistories()])}
                          />
                        </li>
                      ) : null}
                    </Fragment>
                  ))}
                  {scheduledContent ? (
                    <li className="flex justify-end">
                      <div className="flex max-w-[82%] flex-col items-end sm:max-w-[78%]">
                        <article className="flex min-h-12 items-center rounded-2xl rounded-br-md bg-slate-200 px-4 py-3 text-[var(--ink)]">
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">{scheduledContent}</p>
                        </article>
                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--ink-muted)]">
                          <span>예약됨</span>
                          <span aria-hidden>·</span>
                          <button
                            className="hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                            type="button"
                            disabled={submitMutation.isPending}
                            onClick={() => {
                              setScheduledContent("");
                              scheduledSubmissionInFlight.current = false;
                            }}
                          >
                            취소하기
                          </button>
                        </div>
                      </div>
                    </li>
                  ) : null}
                </ol>
              ) : (
                <p className="py-12 text-center text-sm text-[var(--ink-muted)]">
                  {started ? "첫 발언을 기다리고 있습니다." : "두 참여자가 입장하면 토론이 시작됩니다."}
                </p>
              )}
              {historiesQuery.isError && historiesQuery.data ? (
                <div className="mt-4 text-sm text-[var(--danger)]" role="alert">
                  <p>{historiesQuery.error instanceof Error ? historiesQuery.error.message : "최신 발언과 판결을 불러오지 못했습니다."}</p>
                  <button className="mt-2 underline" type="button" onClick={() => void Promise.all([refetchDebate(), refetchHistories()])}>다시 조회</button>
                </div>
              ) : null}
            </div>

            <form className="border-t border-[var(--line)] p-4 sm:p-5" onSubmit={submitStatement}>
              <label className="sr-only" htmlFor="debate-statement">토론 발언</label>
              <textarea
                ref={statementInput}
                id="debate-statement"
                rows={1}
                className={`h-11 max-h-36 min-h-11 w-full resize-none overflow-y-hidden rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm leading-6 outline-none transition focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue-soft)] disabled:cursor-not-allowed disabled:opacity-70 ${isPrewriting ? "bg-slate-100" : isMyTurn ? "bg-white" : "bg-[var(--surface-muted)]"}`}
                value={content}
                maxLength={1000}
                disabled={!canCompose || submitMutation.isPending}
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
                <Button className="!h-10 sm:!w-auto sm:px-5" type="submit" loading={submitMutation.isPending} disabled={!canCompose || !content.trim()}>
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
            <Button variant="outline" className="!h-10" onClick={() => router.push("/mypage")}>
              나가기
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}
