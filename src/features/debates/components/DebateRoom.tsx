"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/auth/context/AuthProvider";
import {
  getDebate,
  getDebateHistories,
  getDebateFreeMessages,
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
import { DebateMessagesSkeleton, DebateRoomSkeleton } from "@/features/debates/components/DebateRoomSkeleton";
import { DebateFinalVerdict, DebateFinalVerdictSkeleton } from "@/features/debates/components/DebateFinalVerdict";
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
import { detectNewMessage } from "@/features/debates/debateMessages";
import { canSendFreeMessage, mergeFreeMessages } from "@/features/debates/freeDebateMessages";
import { useDebatePresence } from "@/features/debates/hooks/useDebatePresence";
import { mergeDebateHistoriesEvent, shouldNotifyEarlyEndDeclined, type DebateConnectionEvent, type DebateEarlyEndAction, type PresenceStatus } from "@/features/debates/presenceEvents";
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
      <p className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-center text-[11px] font-medium text-slate-500 sm:text-xs">
        {stage === "FREE" ? "자유 토론이 시작되었습니다." : `${debateStageLabels[stage]} 단계가 시작되었습니다.`}
      </p>
      <span className="h-px flex-1 bg-slate-100" aria-hidden />
    </li>
  );
}

function DebateStageProgress({ currentStage }: { currentStage: DebateStage }) {
  const currentIndex = debateStages.indexOf(currentStage);

  return (
    <ol className="mt-4 space-y-2">
      {debateStages.slice(1).map((stage, index) => {
        const stageIndex = index + 1;
        const current = stage === currentStage;
        const complete = stageIndex < currentIndex;

        return (
          <li
            key={stage}
            aria-current={current ? "step" : undefined}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              current
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : complete
                  ? "border-slate-200 bg-slate-100 text-slate-500"
                  : "border-[var(--line)] bg-white text-[var(--ink-faint)]"
            }`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${current ? "bg-[var(--brand-blue)] shadow-[0_0_0_4px_rgba(59,130,246,0.14)]" : complete ? "bg-slate-400" : "bg-slate-200"}`} aria-hidden />
            <span className="text-xs font-bold">{debateStageLabels[stage]}</span>
          </li>
        );
      })}
    </ol>
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

function HistoryItem({ history, hostPosition, myPosition, opponentName, opponentProfileImageUrl, authorRole }: {
  history: DebateHistory;
  hostPosition: Position;
  myPosition: Position | undefined;
  opponentName: string;
  opponentProfileImageUrl: string | null;
  authorRole?: DebateRole;
}) {
  const position = authorRole
    ? authorRole === "HOST" ? hostPosition : hostPosition === "PROS" ? "CONS" : "PROS"
    : speakingPosition(history.stage);
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

export function DebateRoom({ debateId, finalView = false }: { debateId: string; finalView?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isReady } = useAuth();
  const [content, setContent] = useState("");
  const [scheduledContent, setScheduledContent] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [showFloatingProgress, setShowFloatingProgress] = useState(false);
  const [newMessagePreview, setNewMessagePreview] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [earlyEndOpen, setEarlyEndOpen] = useState(false);
  const [earlyEndError, setEarlyEndError] = useState("");
  const [earlyEndDeclinedOpen, setEarlyEndDeclinedOpen] = useState(false);

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
        && debate.currentStage !== "FINAL_VERDICT" ? 3000 : false;
    },
  });
  const entryAllowed = debateQuery.data?.status === "READY"
    || debateQuery.data?.status === "IN_PROGRESS"
    || debateQuery.data?.status === "FINISHED";
  const realtimeEnabled = debateQuery.data?.status === "READY" || debateQuery.data?.status === "IN_PROGRESS";
  const historiesQuery = useQuery({
    queryKey: ["debates", debateId, "histories", accessToken],
    queryFn: () => getDebateHistories(debateId, accessToken!),
    enabled: Boolean(accessToken && entryAllowed),
    retry: false,
    refetchInterval: (query) => debateQuery.data?.currentStage === "FINAL_VERDICT"
      && !query.state.data?.verdicts.some(({ stage }) => stage === "FINAL_VERDICT") ? 3000 : false,
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
  const presence = useDebatePresence(debateId, realtimeEnabled);
  const freeMessagesEnabled = Boolean(accessToken && entryAllowed
    && (debateQuery.data?.currentStage === "FREE" || debateQuery.data?.currentStage === "FINAL_VERDICT"));
  const freeMessagesQuery = useInfiniteQuery({
    queryKey: ["debates", debateId, "free-messages", accessToken],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getDebateFreeMessages(debateId, accessToken!, pageParam),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
    enabled: freeMessagesEnabled,
    retry: false,
  });
  const freeMessages = useMemo(() => mergeFreeMessages(
    freeMessagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    presence.freeMessages,
  ), [freeMessagesQuery.data, presence.freeMessages]);
  const syncedConnection = useRef(0);
  const recoveredDeadline = useRef<string | null>(null);
  const scheduledSubmissionInFlight = useRef(false);
  const messageViewport = useRef<HTMLDivElement>(null);
  const shouldStickToLatestMessage = useRef(true);
  const latestMessageId = useRef<string | null>(null);
  const statementInput = useRef<HTMLTextAreaElement>(null);
  const { refetch: refetchDebate } = debateQuery;
  const { refetch: refetchHistories } = historiesQuery;
  const { refetch: refetchMember } = memberQuery;
  const { refetch: refetchFreeMessages } = freeMessagesQuery;

  const freeMessageMutation = useMutation({
    mutationFn: (message: string) => {
      if (!memberQuery.data || !canSendFreeMessage(debateQuery.data, presence.connectionStatus === "connected", Date.now())) {
        throw new Error("지금은 자유 토론 메시지를 전송할 수 없습니다.");
      }
      return presence.sendFreeMessage(message, memberQuery.data.myRole);
    },
    onSuccess: () => {
      setContent("");
      setSubmitError("");
      if (statementInput.current) resetStatementInput(statementInput.current);
    },
    onError: (error) => {
      setSubmitError(error.message);
      void Promise.all([refetchFreeMessages(), refetchDebate()]);
    },
  });

  const earlyEndMutation = useMutation({
    mutationFn: (action: DebateEarlyEndAction) => presence.sendEarlyEndAction(action),
    onError: (error) => {
      setEarlyEndError(error instanceof Error ? error.message : "조기 종료 요청을 처리하지 못했습니다.");
      void presence.refreshEarlyEnd().catch(() => {});
    },
  });

  const submitEarlyEndAction = (action: DebateEarlyEndAction) => {
    setEarlyEndError("");
    earlyEndMutation.mutate(action, {
      onSuccess: () => {
        if (action !== "propose") setEarlyEndOpen(false);
      },
    });
  };

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
    if (freeMessagesEnabled && presence.connectedAt) void refetchFreeMessages();
  }, [freeMessagesEnabled, debateQuery.data?.currentStage, presence.connectedAt, refetchFreeMessages]);

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
    if (event.type === "DEBATE_ENDED") {
      queryClient.setQueryData<DebateDetail>(
        ["debates", debateId, "detail", accessToken],
        (data) => data ? {
          ...data,
          status: "FINISHED",
          currentStage: "FINAL_VERDICT",
          winnerPosition: event.winnerPosition ?? null,
          turnEndsAt: null,
        } : data,
      );
    }
    queryClient.setQueryData<DebateHistories>(
      ["debates", debateId, "histories", accessToken],
      (data) => mergeDebateHistoriesEvent(data, event),
    );
    void Promise.all([refetchDebate(), refetchHistories()]);
  }, [accessToken, debateId, presence.latestProgressEvent, queryClient, refetchDebate, refetchHistories]);

  useEffect(() => {
    if (!debateQuery.data?.turnEndsAt && !presence.earlyEnd.expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [debateQuery.data?.turnEndsAt, presence.earlyEnd.expiresAt]);

  const activeEarlyEnd = useRef<string | null>(null);
  const announcedEarlyEnd = useRef<string | null>(null);
  const handledEarlyEndDecline = useRef<DebateConnectionEvent | null>(null);
  useEffect(() => {
    const key = presence.earlyEnd.pending
      ? `${presence.earlyEnd.proposerRole}:${presence.earlyEnd.expiresAt}`
      : null;
    const previous = activeEarlyEnd.current;
    activeEarlyEnd.current = key;
    let update: (() => void) | null = null;
    if (previous && !key) {
      announcedEarlyEnd.current = null;
      update = () => {
        setEarlyEndOpen(false);
        setEarlyEndError("");
      };
    } else if (key && announcedEarlyEnd.current !== key && memberQuery.data
      && presence.earlyEnd.proposerRole !== memberQuery.data.myRole) {
      announcedEarlyEnd.current = key;
      update = () => setEarlyEndOpen(true);
    }
    if (!update) return;
    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [memberQuery.data, presence.earlyEnd.expiresAt, presence.earlyEnd.pending, presence.earlyEnd.proposerRole]);

  useEffect(() => {
    const event = presence.latestEarlyEndEvent;
    if (!shouldNotifyEarlyEndDeclined(event, memberQuery.data?.myRole)
      || handledEarlyEndDecline.current === event) return;
    handledEarlyEndDecline.current = event;
    const frame = requestAnimationFrame(() => setEarlyEndDeclinedOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [memberQuery.data?.myRole, presence.latestEarlyEndEvent]);

  useEffect(() => {
    const turnEndsAt = debateQuery.data?.turnEndsAt;
    const deadline = parseServerTime(turnEndsAt);
    if (!turnEndsAt || !Number.isFinite(deadline) || recoveredDeadline.current === turnEndsAt) return;
    const timer = window.setTimeout(() => {
      recoveredDeadline.current = turnEndsAt;
      // The free-message endpoint also recovers a delayed server stage timer.
      void (freeMessagesEnabled ? refetchFreeMessages() : refetchHistories()).then(() => refetchDebate());
    }, Math.max(0, deadline - Date.now()) + 300);
    return () => window.clearTimeout(timer);
  }, [debateQuery.data?.turnEndsAt, freeMessagesEnabled, refetchDebate, refetchFreeMessages, refetchHistories]);

  useEffect(() => {
    const updateFloatingProgress = () => setShowFloatingProgress(window.scrollY > 24);
    updateFloatingProgress();
    window.addEventListener("scroll", updateFloatingProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateFloatingProgress);
  }, [entryAllowed]);

  const pendingVerdictStage = awaitingVerdictStage(debateQuery.data?.currentStage ?? "NONE", historiesQuery.data);
  const awaitingVerdict = Boolean(pendingVerdictStage);

  useEffect(() => {
    const next = detectNewMessage(
      latestMessageId.current,
      [...(historiesQuery.data?.histories ?? []), ...freeMessages],
      shouldStickToLatestMessage.current,
    );
    latestMessageId.current = next.latestId;
    if (next.preview) setNewMessagePreview(next.preview);
  }, [historiesQuery.data?.histories, freeMessages]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (messageViewport.current && shouldStickToLatestMessage.current) {
        messageViewport.current.scrollTop = messageViewport.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [debateQuery.data?.currentStage, historiesQuery.data?.histories.length, historiesQuery.data?.verdicts.length, freeMessages.length, awaitingVerdict, scheduledContent]);

  const canChat = Boolean(memberQuery.data)
    && canSendFreeMessage(debateQuery.data, presence.connectionStatus === "connected", now);
  useEffect(() => {
    if (canChat && !freeMessageMutation.isPending) statementInput.current?.focus();
  }, [canChat, freeMessageMutation.isPending]);

  const shouldFocusStatement = debateQuery.data?.status === "IN_PROGRESS"
    && debateQuery.data.currentStage !== "FREE"
    && canSubmitStatement(debateQuery.data.currentStage, historiesQuery.data)
    && !awaitingVerdict
    && speakingPosition(debateQuery.data.currentStage) === memberQuery.data?.myPosition;

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

  if (!isReady || (accessToken && debateQuery.isPending)) {
    if (!finalView) return <DebateRoomSkeleton />;
    return (
      <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
        <SiteHeader />
        <DebateFinalVerdictSkeleton />
      </div>
    );
  }
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
  const isFreeDebate = debate.currentStage === "FREE";
  const remainingSeconds = remainingTurnSeconds(debate.turnEndsAt, now);
  const earlyEndServerRemainingSeconds = remainingTurnSeconds(presence.earlyEnd.expiresAt, now);
  const earlyEndRemainingSeconds = earlyEndServerRemainingSeconds === null
    ? null
    : Math.min(30, earlyEndServerRemainingSeconds);
  const earlyEndProposedByMe = presence.earlyEnd.pending
    && presence.earlyEnd.proposerRole === member?.myRole;
  const earlyEndButtonLabel = presence.earlyEnd.pending
    ? `${earlyEndProposedByMe ? "응답 대기" : "조기 종료 요청"} ${formatTurnTime(earlyEndRemainingSeconds)}`
    : "조기 종료 제안";
  const floatingEarlyEndLabel = presence.earlyEnd.pending
    ? `${earlyEndProposedByMe ? "대기" : "응답"} ${formatTurnTime(earlyEndRemainingSeconds)}`
    : "종료 제안";
  const isMyTurn = started && !isFreeDebate && Boolean(currentSpeaker && currentSpeaker === myPosition);
  const canCompose = isFreeDebate ? canChat : started && Boolean(member) && Boolean(currentSpeaker) && !scheduledContent;
  const isPrewriting = canCompose && !isFreeDebate && !isMyTurn;
  const isSending = submitMutation.isPending || freeMessageMutation.isPending;
  const maxLength = isFreeDebate ? 500 : 1000;
  const myNickname = profileQuery.data?.nickname ?? "내 정보 확인 중";
  const hostName = member?.myRole === "HOST" ? `${myNickname}(나)` : member?.opponent?.nickname ?? "개설자";
  const guestName = member?.myRole === "GUEST" ? `${myNickname}(나)` : member?.opponent?.nickname ?? "게스트";
  const opponentName = member?.opponent?.nickname ?? "상대방";
  const myProfileImageUrl = profileQuery.data?.profileImageUrl ?? null;
  const opponentProfileImageUrl = opponentImageQuery.data?.url ?? null;
  const histories = historiesQuery.data?.histories;
  const verdicts = historiesQuery.data?.verdicts;
  const currentVerdict = verdicts?.find((verdict) => verdict.stage === debate.currentStage);
  const finalVerdict = verdicts?.find((verdict) => verdict.stage === "FINAL_VERDICT");
  const currentStageIndex = debateStages.indexOf(debate.currentStage);
  const timelineStages = currentStageIndex > 0 ? debateStages.slice(1, currentStageIndex + 1) : [];
  const hostProfileImageUrl = member?.myRole === "HOST" ? myProfileImageUrl : opponentProfileImageUrl;
  const guestProfileImageUrl = member?.myRole === "GUEST" ? myProfileImageUrl : opponentProfileImageUrl;
  const turnStatusLabel = !member
    ? "차례 확인 중"
    : isFreeDebate
      ? "자유 토론"
    : isMyTurn
      ? "내 차례"
      : currentSpeaker
        ? "상대방 차례"
        : awaitingVerdict ? "AI 판결 중" : currentVerdict ? "AI 판결 완료" : "다음 단계 대기";
  const inputPlaceholder = !started
    ? "토론 시작을 기다리고 있습니다."
    : !member
      ? "내 진영 정보를 확인하고 있습니다."
      : isFreeDebate
        ? remainingSeconds === 0
          ? "자유 토론 시간이 종료되었습니다."
          : presence.connectionStatus !== "connected"
            ? "채팅 연결 중입니다. 잠시 기다려주세요."
            : "순서에 관계없이 자유롭게 의견을 나눠보세요."
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
    if (!canCompose || !statement || content.length > maxLength || isSending) return;
    setSubmitError("");
    shouldStickToLatestMessage.current = true;
    if (isFreeDebate) {
      freeMessageMutation.mutate(statement);
      return;
    }
    if (!isMyTurn) {
      setScheduledContent(statement);
      setContent("");
      if (statementInput.current) resetStatementInput(statementInput.current);
      return;
    }
    submitMutation.mutate(statement);
  };

  if (debate.currentStage === "FINAL_VERDICT") {
    const completedStages = timelineStages.filter((stage) => stage !== "FINAL_VERDICT");
    const historyLoading = historiesQuery.isPending || freeMessagesQuery.isPending;

    return (
      <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
        <SiteHeader />
        <DebateFinalVerdict
          title={debate.title}
          verdict={finalVerdict}
          myPosition={myPosition}
          isLoading={historiesQuery.isPending || memberQuery.isPending}
        >
          <section className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-7" aria-labelledby="completed-debate-history-title">
            <div className="border-b border-[var(--line)] pb-4">
              <h2 id="completed-debate-history-title" className="font-bold text-[var(--ink)]">지난 토론 내용</h2>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">토론 중 주고받은 발언과 판정을 시간순으로 확인할 수 있습니다.</p>
            </div>
            <div className="pt-6">
              {historyLoading ? (
                <DebateMessagesSkeleton label="지난 토론 내용 불러오는 중" />
              ) : historiesQuery.isError && !historiesQuery.data ? (
                <div className="py-10 text-center" role="alert">
                  <p className="text-sm text-[var(--danger)]">지난 토론 내용을 불러오지 못했습니다.</p>
                  <button className="mt-3 text-sm font-semibold text-[var(--brand-blue)] underline" type="button" onClick={() => void Promise.all([refetchHistories(), refetchFreeMessages()])}>다시 시도</button>
                </div>
              ) : (
                <ol className="space-y-5">
                  {completedStages.map((stage) => (
                    <Fragment key={stage}>
                      <StageNotice stage={stage} />
                      {stage === "FREE" ? (
                        <>
                          {freeMessagesQuery.hasNextPage ? (
                            <li className="text-center">
                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--brand-blue)] underline disabled:opacity-50"
                                disabled={freeMessagesQuery.isFetchingNextPage}
                                onClick={() => void freeMessagesQuery.fetchNextPage()}
                              >
                                {freeMessagesQuery.isFetchingNextPage ? "이전 대화 불러오는 중…" : "이전 대화 더 보기"}
                              </button>
                            </li>
                          ) : null}
                          {freeMessagesQuery.isError ? (
                            <li className="py-3 text-center text-sm text-[var(--danger)]" role="alert">
                              <p>{freeMessagesQuery.error.message}</p>
                              <button type="button" className="mt-2 underline" onClick={() => void refetchFreeMessages()}>대화 다시 불러오기</button>
                            </li>
                          ) : null}
                          {!freeMessages.length && !freeMessagesQuery.isError ? (
                            <li className="py-4 text-center text-sm text-[var(--ink-muted)]">자유 토론에서 주고받은 메시지가 없습니다.</li>
                          ) : null}
                          {freeMessages.map((message) => (
                            <HistoryItem
                              key={message.id}
                              history={{ ...message, stage: "FREE" }}
                              authorRole={message.role}
                              hostPosition={debate.hostPosition}
                              myPosition={myPosition}
                              opponentName={opponentName}
                              opponentProfileImageUrl={opponentProfileImageUrl}
                            />
                          ))}
                        </>
                      ) : null}
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
                          <DebateVerdictCard verdict={verdict} />
                        </li>
                      ))}
                    </Fragment>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </DebateFinalVerdict>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader />
      {showFloatingProgress ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-3">
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-[var(--line)] bg-white/95 px-3 py-2 shadow-[0_12px_34px_rgba(15,23,42,0.2)] backdrop-blur sm:gap-3 sm:px-5 sm:py-3">
            <span className="max-w-32 truncate text-sm font-bold text-[var(--ink)] sm:max-w-none">{debateStageLabels[debate.currentStage]}</span>
            <span className="h-5 w-px bg-[var(--line)]" />
            <span className={`font-mono text-lg font-bold ${remainingSeconds === 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
              {formatTurnTime(remainingSeconds)}
            </span>
            {isFreeDebate ? (
              <button
                type="button"
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${presence.earlyEnd.pending && !earlyEndProposedByMe
                  ? "bg-[var(--brand-blue)] text-white hover:bg-[var(--btn-primary-hover)]"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                onClick={() => {
                  setEarlyEndError("");
                  setEarlyEndOpen(true);
                }}
              >
                {floatingEarlyEndLabel}
              </button>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isMyTurn ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                {turnStatusLabel}
              </span>
            )}
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

          {started && (currentSpeaker || isFreeDebate) ? (
            <div className="mt-4 flex items-end justify-between rounded-xl bg-[var(--surface-muted)] px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-[var(--ink-muted)]">{isFreeDebate ? "남은 자유 토론 시간" : "남은 발언 시간"}</p>
                <p className={`mt-1 font-mono text-3xl font-bold tracking-tight ${remainingSeconds === 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`} aria-live="polite">
                  {formatTurnTime(remainingSeconds)}
                </p>
              </div>
              <p className="pb-1 text-right text-xs font-semibold text-[var(--ink-muted)]">
                {isFreeDebate ? "양측 자유 발언" : `${positionLabel(currentSpeaker!)} 측 발언`}<br />제한 {formatDebateTime(isFreeDebate ? debate.freeDebateTimeSeconds : debate.turnTimeSeconds)}
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--ink-muted)]">
              {started ? "다음 단계를 준비하고 있습니다." : "두 참여자의 입장을 기다리고 있습니다."}
            </p>
          )}

          <div className={`mt-4 grid gap-2 border-t border-[var(--line)] pt-4 ${isFreeDebate ? "grid-cols-2" : ""}`}>
            {isFreeDebate ? (
              <Button variant="outline" className="!h-10" onClick={() => {
                setEarlyEndError("");
                setEarlyEndOpen(true);
              }}>
                {earlyEndButtonLabel}
              </Button>
            ) : null}
            <Button variant="outline" className="!h-10" onClick={() => setExitOpen(true)}>
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
              <ParticipantCard role="HOST" position={debate.hostPosition} status={presence.roles.HOST} name={hostName} profileImageUrl={hostProfileImageUrl} />
              <ParticipantCard role="GUEST" position={debate.guestPosition} status={presence.roles.GUEST} name={guestName} profileImageUrl={guestProfileImageUrl} />
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

            <div className="relative">
              <div
                ref={messageViewport}
                className="min-h-56 max-h-[60vh] overflow-y-auto overscroll-y-auto p-4 sm:min-h-72 sm:p-5 lg:max-h-[640px]"
                onScroll={(event) => {
                  const element = event.currentTarget;
                  shouldStickToLatestMessage.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
                  if (shouldStickToLatestMessage.current) setNewMessagePreview(null);
                }}
              >
              {historiesQuery.isPending ? (
                <DebateMessagesSkeleton />
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
                      {stage === "FREE" ? (
                        <>
                          {freeMessagesQuery.hasNextPage ? (
                            <li className="text-center">
                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--brand-blue)] underline disabled:opacity-50"
                                disabled={freeMessagesQuery.isFetching}
                                onClick={async () => {
                                  const viewport = messageViewport.current;
                                  const height = viewport?.scrollHeight ?? 0;
                                  const top = viewport?.scrollTop ?? 0;
                                  shouldStickToLatestMessage.current = false;
                                  await freeMessagesQuery.fetchNextPage();
                                  requestAnimationFrame(() => {
                                    if (viewport) viewport.scrollTop = top + viewport.scrollHeight - height;
                                  });
                                }}
                              >
                                {freeMessagesQuery.isFetchingNextPage ? "이전 대화 불러오는 중…" : "이전 대화 더 보기"}
                              </button>
                            </li>
                          ) : null}
                          {freeMessagesQuery.isPending ? (
                            <li className="py-4 text-center text-sm text-[var(--ink-muted)]" role="status">자유 토론 대화를 불러오고 있습니다.</li>
                          ) : !freeMessages.length && !freeMessagesQuery.isError ? (
                            <li className="py-4 text-center text-sm text-[var(--ink-muted)]">아직 메시지가 없습니다. 자유롭게 의견을 나눠보세요.</li>
                          ) : null}
                          {freeMessagesQuery.isError ? (
                            <li className="py-3 text-center text-sm text-[var(--danger)]" role="alert">
                              <p>{freeMessagesQuery.error.message}</p>
                              <button type="button" className="mt-2 underline" onClick={() => void (
                                freeMessagesQuery.isFetchNextPageError ? freeMessagesQuery.fetchNextPage() : refetchFreeMessages()
                              )}>대화 다시 불러오기</button>
                            </li>
                          ) : null}
                          {freeMessages.map((message) => (
                            <HistoryItem
                              key={message.id}
                              history={{ ...message, stage: "FREE" }}
                              authorRole={message.role}
                              hostPosition={debate.hostPosition}
                              myPosition={myPosition}
                              opponentName={opponentName}
                              opponentProfileImageUrl={opponentProfileImageUrl}
                            />
                          ))}
                        </>
                      ) : null}
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
              {newMessagePreview ? (
                <button
                  type="button"
                  className="absolute inset-x-4 bottom-3 mx-auto flex max-w-sm items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-left text-xs shadow-[0_8px_24px_rgba(15,23,42,0.16)] sm:inset-x-5"
                  aria-label="최신 메시지로 이동"
                  onClick={() => {
                    const viewport = messageViewport.current;
                    if (!viewport) return;
                    shouldStickToLatestMessage.current = true;
                    setNewMessagePreview(null);
                    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
                  }}
                >
                  <span className="shrink-0 font-bold text-[var(--brand-blue)]">새 메시지</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--ink-muted)]">{newMessagePreview}</span>
                  <span className="text-base text-[var(--ink-muted)]" aria-hidden>↓</span>
                </button>
              ) : null}
            </div>

            <form className="border-t border-[var(--line)] p-4 sm:p-5" onSubmit={submitStatement}>
              <label className="sr-only" htmlFor="debate-statement">{isFreeDebate ? "자유 토론 메시지" : "토론 발언"}</label>
              <textarea
                ref={statementInput}
                id="debate-statement"
                aria-describedby="debate-statement-help"
                rows={1}
                className={`h-11 max-h-36 min-h-11 w-full resize-none overflow-y-hidden rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm leading-6 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-70 ${isPrewriting ? "bg-slate-100" : isMyTurn ? "bg-white" : "bg-[var(--surface-muted)]"}`}
                value={content}
                maxLength={maxLength}
                disabled={!canCompose || isSending}
                placeholder={inputPlaceholder}
                onChange={(event) => {
                  setContent(event.target.value);
                  resizeStatementInput(event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }}
              />
              <div className="mt-3 flex items-start justify-between gap-2 sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <span className={`text-xs ${content.length > maxLength ? "text-[var(--danger)]" : "text-[var(--ink-faint)]"}`}>{content.length}/{maxLength}</span>
                  {submitError ? <p className="mt-1 text-xs font-semibold text-[var(--danger)]" role="alert">{submitError}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <p id="debate-statement-help" className="whitespace-nowrap text-[10px] leading-4 text-[var(--ink-faint)] sm:text-[11px]">
                    전송 Enter · 줄바꿈 Shift + Enter
                  </p>
                  <Button className="!h-10 !w-auto shrink-0 px-4 sm:px-5" type="submit" loading={isSending} disabled={!canCompose || !content.trim() || content.length > maxLength}>
                    {isFreeDebate ? "메시지 전송" : "발언 제출"}
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <aside className="hidden lg:sticky lg:top-6 lg:block">
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.05)]">
              <h2 className="font-bold text-[var(--ink)]">진행 단계</h2>
              <DebateStageProgress currentStage={debate.currentStage} />
              {started && (currentSpeaker || isFreeDebate) ? (
                <div className="mt-3 rounded-xl border border-[var(--line)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--ink-muted)]">{isFreeDebate ? "남은 자유 토론 시간" : "남은 발언 시간"}</p>
                  <p className={`mt-1 font-mono text-2xl font-bold ${remainingSeconds === 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`} aria-live="polite">
                    {formatTurnTime(remainingSeconds)}
                  </p>
                </div>
              ) : null}
              <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-5">
                {isFreeDebate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEarlyEndError("");
                      setEarlyEndOpen(true);
                    }}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                  >
                    {earlyEndButtonLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setExitOpen(true)}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                >
                  나가기
                </button>
              </div>
            </section>
          </aside>
        </div>
      </main>
      <Modal open={exitOpen} title="토론방에서 나갈까요?" onClose={() => setExitOpen(false)}>
        <p className="text-center">
          토론은 계속 진행되며,
          <br />
          마이페이지에서 다시 들어올 수 있습니다.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setExitOpen(false)}>계속 참여하기</Button>
          <Link href="/mypage" className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--btn-primary)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--btn-primary-hover)]">
            나가기
          </Link>
        </div>
      </Modal>
      <Modal
        open={earlyEndOpen && isFreeDebate}
        title={presence.earlyEnd.pending
          ? earlyEndProposedByMe ? "상대방의 응답을 기다리고 있습니다" : "상대방이 조기 종료를 제안했습니다"
          : "자유 토론을 조기 종료할까요?"}
        onClose={() => !earlyEndMutation.isPending && setEarlyEndOpen(false)}
      >
        {presence.earlyEnd.pending ? (
          <>
            <p className="text-center">
              {earlyEndProposedByMe
                ? "상대방이 수락하면 자유 토론을 종료하고 최종 판정을 진행합니다."
                : "수락하면 자유 토론을 종료하고 바로 최종 판정을 진행합니다."}
            </p>
            <p className="mt-4 text-center font-mono text-3xl font-bold text-[var(--ink)]" aria-live="polite">
              {formatTurnTime(earlyEndRemainingSeconds)}
            </p>
            <p className="mt-1 text-center text-xs">남은 응답 시간</p>
            {earlyEndError ? <p className="mt-4 text-center text-xs font-semibold text-[var(--danger)]" role="alert">{earlyEndError}</p> : null}
            <div className="mt-6 flex gap-3">
              {earlyEndProposedByMe ? (
                <Button
                  variant="outline"
                  loading={earlyEndMutation.isPending}
                  disabled={presence.connectionStatus !== "connected"}
                  onClick={() => submitEarlyEndAction("cancel")}
                >
                  제안 취소
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    loading={earlyEndMutation.isPending && earlyEndMutation.variables === "decline"}
                    disabled={presence.connectionStatus !== "connected" || earlyEndMutation.isPending}
                    onClick={() => submitEarlyEndAction("decline")}
                  >
                    거절
                  </Button>
                  <Button
                    loading={earlyEndMutation.isPending && earlyEndMutation.variables === "accept"}
                    disabled={presence.connectionStatus !== "connected" || earlyEndMutation.isPending}
                    onClick={() => submitEarlyEndAction("accept")}
                  >
                    수락
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-center">
              상대방이 수락하면 남은 시간과 관계없이 자유 토론을 종료하고 최종 판정을 진행합니다.
              제안은 30초 후 자동으로 만료됩니다.
            </p>
            {earlyEndError ? <p className="mt-4 text-center text-xs font-semibold text-[var(--danger)]" role="alert">{earlyEndError}</p> : null}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" disabled={earlyEndMutation.isPending} onClick={() => setEarlyEndOpen(false)}>계속 토론하기</Button>
              <Button
                loading={earlyEndMutation.isPending}
                disabled={presence.connectionStatus !== "connected"}
                onClick={() => submitEarlyEndAction("propose")}
              >
                조기 종료 제안
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={earlyEndDeclinedOpen}
        title="조기 종료 제안이 거절되었습니다"
        onClose={() => setEarlyEndDeclinedOpen(false)}
      >
        <p className="text-center">상대방이 조기 종료 제안을 거절했습니다.<br />자유 토론을 계속 진행해주세요.</p>
        <Button className="mt-6" onClick={() => setEarlyEndDeclinedOpen(false)}>확인</Button>
      </Modal>
    </div>
  );
}
