"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { getInvitation, acceptDebateGuest } from "@/features/debates/api/debates";
import { useDebateStatus } from "@/features/debates/hooks/useDebateStatus";
import { DebateTimeBadges } from "@/features/debates/components/DebateTimeBadges";
import { DebateRoomSkeleton } from "@/features/debates/components/DebateRoomSkeleton";
import { useMyProfile } from "@/features/mypage/hooks/useMyProfile";
import { getCandidatePage, requestAge } from "@/features/debates/candidateList";

type Candidate = {
  id: string;
  name: string;
  requestedAt?: string | null;
};

const steps = [
  [1, "링크 공유", "초대 링크를 전달합니다."],
  [2, "참여자 선택", "함께할 상대를 선택합니다."],
  [3, "진행 확정", "토론 시작을 확정합니다."],
] as const;

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="m3.5 8.25 2.75 2.75 6.25-6.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WaitingRoom({ debateId, inviteToken }: { debateId: string; inviteToken: string }) {
  const router = useRouter();
  const { accessToken, isReady } = useAuth();
  const profileQuery = useMyProfile();
  const invitationQuery = useQuery({
    queryKey: ["debate-invitations", inviteToken, accessToken],
    queryFn: () => getInvitation(inviteToken, accessToken!),
    enabled: isReady && Boolean(inviteToken && accessToken),
  });
  const hostIsPros = invitationQuery.data?.guestPosition !== "PROS";
  const statusQuery = useDebateStatus(debateId);
  const refreshIconRef = useRef<SVGSVGElement>(null);
  const inviteUrl = `/debates/join?token=${encodeURIComponent(inviteToken)}&debateId=${encodeURIComponent(debateId)}`;
  const [shareOpen, setShareOpen] = useState(true);
  const [linkShared, setLinkShared] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedOpponent, setOpponent] = useState<Candidate | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [refreshingManually, setRefreshingManually] = useState(false);
  const [actionError, setActionError] = useState("");
  const confirmed = statusQuery.data?.debateStatus === "READY";
  const opponent = selectedOpponent && (confirmed || !statusQuery.data?.requestList ||
    statusQuery.data.requestList.some(({ userId }) => userId === selectedOpponent.id))
    ? selectedOpponent : null;
  const candidates = (statusQuery.data?.requestList ?? [])
      .filter(({ userId }) => userId !== opponent?.id)
      .map(({ userId, nickname, requestedAt }) => ({ id: userId, name: nickname, requestedAt }));
  const { total, pageCount, currentPage, visible: visibleCandidates } = getCandidatePage(candidates, search, page);
  const createdAge = requestAge(invitationQuery.data?.createdAt, invitationQuery.dataUpdatedAt);

  const completedStep = confirmed ? 3 : opponent ? 2 : linkShared || candidates.length > 0 ? 1 : 0;
  const currentStep = Math.min(completedStep + 1, 3);

  useEffect(() => {
    if (!toastVisible) return;
    const timeout = window.setTimeout(() => setToastVisible(false), 2400);
    return () => window.clearTimeout(timeout);
  }, [toastVisible]);

  useEffect(() => {
    if (confirmed) router.replace("/debates/starting");
  }, [confirmed, router]);

  const openShareModal = () => {
    setCopyState("idle");
    setToastVisible(false);
    setShareOpen(true);
  };

  const closeShareModal = () => {
    setShareOpen(false);
    setCopyState("idle");
    setToastVisible(false);
  };

  const copyInviteLink = async () => {
    try {
      if (!inviteUrl) throw new Error("초대 링크가 없습니다.");
      await navigator.clipboard.writeText(new URL(inviteUrl, window.location.origin).href);
      setCopyState("copied");
      setLinkShared(true);
      setToastVisible(true);
    } catch {
      setCopyState("error");
    }
  };

  const acceptCandidate = (candidate: Candidate) => {
    setOpponent(candidate);
  };

  const confirmOpponent = async () => {
    if (!opponent || !accessToken) return;
    setBusy(true);
    setActionError("");
    try {
      await acceptDebateGuest(debateId, opponent.id, accessToken);
      await statusQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const cancelOpponent = () => {
    if (!opponent) return;
    setOpponent(null);
  };

  if (!isReady) return <DebateRoomSkeleton />;
  if (!accessToken) return <p className="p-8 text-center">토론방을 보려면 <Link className="underline" href={`/signin?next=${encodeURIComponent(`/debates/${debateId}/waiting?token=${inviteToken}`)}`}>로그인</Link>해주세요.</p>;
  if (!inviteToken) return <p className="p-8 text-center" role="alert">초대 링크 정보가 없습니다. 토론방을 다시 생성해주세요.</p>;
  if (invitationQuery.isPending) return <DebateRoomSkeleton />;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader
        rightSlot={
          <Link
            href="/"
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]"
          >
            나가기
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <div className="text-center">
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            상대방을 기다리고 있어요
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)] sm:text-base">
            링크를 공유하고 함께 토론할 상대를 선택해주세요.
          </p>
        </div>

        {actionError || statusQuery.isError || invitationQuery.isError ? (
          <p className="mt-4 text-center text-sm text-[var(--danger)]" role="alert">
            {actionError || (invitationQuery.error instanceof Error ? invitationQuery.error.message : "") || (statusQuery.error instanceof Error ? statusQuery.error.message : "참여 상태를 불러오지 못했습니다.")}
          </p>
        ) : null}

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[270px_1fr]">
          <aside className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.05)] lg:sticky lg:top-6">
            <h2 className="text-lg font-bold text-[var(--ink)]">진행 순서</h2>
            <ol className="mt-5 space-y-3">
              {steps.map(([number, title, description]) => {
                const complete = number <= completedStep;
                const current = number === currentStep && !confirmed;

                return (
                  <li
                    key={number}
                    className={`flex gap-3 rounded-xl border p-4 transition-colors ${
                      complete
                        ? "border-blue-200 bg-blue-50"
                        : current
                          ? "border-[var(--ink)] bg-[var(--ink)]"
                          : "border-[var(--line)] bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        complete
                          ? "bg-[var(--brand-blue)] text-white"
                          : current
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {complete ? <CheckIcon /> : number}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-bold ${
                          current ? "text-white" : "text-[var(--ink)]"
                        }`}
                      >
                        {title}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          current ? "text-slate-300" : "text-[var(--ink-muted)]"
                        }`}
                      >
                        {description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
              <div className="border-b border-[var(--line)] p-6 sm:p-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-[var(--brand-blue)]">
                            {confirmed
                                ? "진행 확정"
                                : opponent
                                    ? "상대방 선택 완료"
                                    : completedStep > 0
                                        ? "참여자 선택 중"
                                        : "링크 공유 대기"}
                          </span>
                      {createdAge ? (
                          <span className="text-sm font-semibold text-[var(--ink-muted)]">
                              {createdAge}
                            </span>
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-2xl font-bold leading-9 tracking-tight text-[var(--ink)] [overflow-wrap:anywhere]">
                      {invitationQuery.data?.title ?? "토론 정보를 불러오고 있습니다."}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      {invitationQuery.data?.description}
                    </p>
                  </div>
                  <div className="xl:shrink-0">
                    <DebateTimeBadges turnTimeSeconds={invitationQuery.data?.turnTimeSeconds} freeDebateTimeSeconds={invitationQuery.data?.freeDebateTimeSeconds} />
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <h3 className="text-sm font-bold text-[var(--ink-muted)]">토론 참여자</h3>
                <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className={`rounded-2xl border p-5 ${hostIsPros ? "border-blue-200 bg-blue-50" : "border-rose-200 bg-rose-50"}`}>
                    <p className={`text-sm font-bold ${hostIsPros ? "text-blue-600" : "text-rose-600"}`}>
                      {invitationQuery.data?.guestPosition === "PROS" ? "반대" : "찬성"} 진영 <span className="text-[var(--ink)]">(나)</span>
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-full font-bold text-white ${hostIsPros ? "bg-[var(--brand-blue)]" : "bg-rose-500"}`}>나</span>
                      <div>
                        <p className="font-bold text-[var(--ink)]">{profileQuery.data?.nickname ?? "내 정보 확인 중"}</p>
                        <p className="mt-1 text-xs text-[var(--ink-muted)]">방장</p>
                      </div>
                    </div>
                  </div>

                  <span className="text-center font-[family-name:var(--font-display)] text-sm font-bold text-[var(--ink-faint)]">VS</span>

                  {opponent ? (
                    <div className={`rounded-2xl border-2 p-5 ${hostIsPros ? "border-rose-300 bg-rose-50 shadow-[0_8px_24px_rgba(244,63,94,0.12)]" : "border-blue-300 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,235,0.12)]"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold ${hostIsPros ? "text-rose-600" : "text-blue-600"}`}>{invitationQuery.data?.guestPosition === "PROS" ? "찬성" : "반대"} 진영</p>
                        <button
                          type="button"
                          className={`text-xs font-semibold underline-offset-4 hover:underline ${hostIsPros ? "text-rose-600" : "text-blue-600"}`}
                          onClick={cancelOpponent}
                          disabled={confirmed}
                        >
                          선택 취소
                        </button>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <span className={`flex h-11 w-11 items-center justify-center rounded-full font-bold text-white ${hostIsPros ? "bg-rose-500" : "bg-[var(--brand-blue)]"}`}>
                          {opponent.name[0]}
                        </span>
                        <div>
                          <p className="font-bold text-[var(--ink)]">{opponent.name}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)] p-5 text-center">
                      <div>
                        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-4xl text-[var(--ink-faint)]">+</span>
                        <p className="mt-3 text-sm font-semibold text-[var(--ink-muted)]">{invitationQuery.data?.guestPosition === "PROS" ? "찬성" : "반대"} 진영을 선택해주세요</p>
                      </div>
                    </div>
                  )}
                </div>

                {opponent ? (
                  <div className="mt-6 border-t border-[var(--line)] pt-6">
                    <Button
                      className="bg-[var(--brand-blue)] hover:bg-blue-700"
                      onClick={confirmOpponent}
                      disabled={confirmed || busy}
                    >
                      {confirmed ? "토론 진행 확정 완료" : "토론 진행 확정"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.05)] sm:p-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-[var(--ink)]">참여 신청</h2>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    {statusQuery.isPending
                      ? "참여 신청을 불러오고 있습니다."
                      : confirmed
                        ? "토론 상대가 확정되었습니다."
                      : opponent
                        ? "상대방 선택을 취소하면 다른 참여자를 선택할 수 있습니다."
                        : candidates.length === 0
                          ? "초대 링크를 공유해 참여 신청을 받아보세요."
                        : `${candidates.length}명이 토론을 기다리고 있습니다.`}
                  </p>
                </div>
                <div className="flex w-full items-start gap-2 xl:w-auto xl:shrink-0">
                  <input
                    type="search"
                    aria-label="참여자 검색"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="닉네임으로 검색"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)] sm:w-56"
                  />
                  <button
                    type="button"
                    className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:opacity-40"
                    aria-label="참여 신청 목록 새로고침"
                    title="새로고침"
                    disabled={refreshingManually}
                    onClick={async () => {
                      setRefreshingManually(true);
                      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                        refreshIconRef.current?.animate(
                          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
                          { duration: 600, easing: "ease-in-out" },
                        );
                      }
                      try {
                        await statusQuery.refetch();
                      } finally {
                        setRefreshingManually(false);
                      }
                    }}
                  >
                    <span className="flex h-[22px] w-[22px] origin-center items-center justify-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:rotate-[30deg]">
                      <svg ref={refreshIconRef} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transformBox: "view-box", transformOrigin: "center" }}>
                        <path d="M20 12a8 8 0 1 1-1.1-4M15.4 8h3.5V4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              {statusQuery.isPending ? (
                <ul aria-label="참여 신청 불러오는 중" aria-busy="true" className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)] motion-safe:animate-pulse">
                  {Array.from({ length: 3 }, (_, index) => (
                    <li key={index} className="flex items-center gap-3 py-5">
                      <span className="h-11 w-11 shrink-0 rounded-full bg-slate-200" />
                      <span className="min-w-0 flex-1 space-y-2">
                        <span className="block h-4 w-36 max-w-full rounded bg-slate-200" />
                        <span className="block h-3 w-3/4 max-w-sm rounded bg-slate-100" />
                      </span>
                      <span className="h-10 w-16 shrink-0 rounded-lg bg-slate-200" />
                    </li>
                  ))}
                </ul>
              ) : visibleCandidates.length > 0 ? (
                <ul className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                  {visibleCandidates.map((candidate) => {
                    const age = requestAge(candidate.requestedAt, statusQuery.dataUpdatedAt);
                    return (
                      <li key={candidate.id} className="flex items-center justify-between gap-4 py-5">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${hostIsPros ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"}`}>
                            {candidate.name[0]}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-[var(--ink)]">{candidate.name}</p>
                              <span className={`rounded-full px-2 py-1 text-xs font-bold ${hostIsPros ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"}`}>{invitationQuery.data?.guestPosition === "PROS" ? "찬성" : "반대"}</span>
                            </div>
                            {age && (
                              <p className="mt-1 text-xs text-[var(--ink-muted)]">{age}</p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Button
                            className="!h-10 !w-auto bg-[var(--brand-blue)] px-4 hover:bg-gray-700"
                            disabled={Boolean(opponent) || busy || confirmed}
                            onClick={() => acceptCandidate(candidate)}
                          >
                            수락
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-4 rounded-xl bg-[var(--surface-muted)] px-5 py-10 text-center text-sm text-[var(--ink-muted)]">
                  <p>{search ? "검색 결과가 없습니다." : confirmed ? "토론 상대가 확정되었습니다." : opponent ? "선택한 참여자가 있습니다." : "아직 참여 신청이 없습니다."}</p>
                  {!search && !confirmed && !opponent ? (
                    <Button variant="outline" className="!h-9 !w-auto px-3 text-sm" onClick={openShareModal}>
                      <CopyIcon />
                      초대 링크 공유
                    </Button>
                  ) : null}
                </div>
              )}
              {total > 10 ? (
                <nav aria-label="참여 신청 페이지" className="mt-6 flex items-center justify-center gap-4 text-sm">
                  <Button variant="outline" className="!h-9 !w-auto px-3" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>이전</Button>
                  <span className="text-[var(--ink-muted)]">{currentPage} / {pageCount}</span>
                  <Button variant="outline" className="!h-9 !w-auto px-3" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>다음</Button>
                </nav>
              ) : null}
            </section>
          </div>
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
        <div
          role={toastVisible ? "status" : undefined}
          className={`flex items-center gap-3 rounded-full bg-[white] px-5 py-3 text-sm font-semibold text-gray-800 shadow-[0_12px_36px_rgba(15,23,42,0.3)] transition-all duration-300 ease-out ${
            toastVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0"
          }`}
        >
          <span className="shrink-0 text-blue-600">
            <CheckIcon />
          </span>
          링크를 클립보드에 복사했습니다.
        </div>
      </div>

      <Modal
        open={shareOpen}
        title="토론 링크 공유"
        onClose={closeShareModal}
      >
        <p>아래 링크를 복사해 함께 토론할 사람에게 전달해주세요.</p>
        <div className="mt-4 flex overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]">
          <button
            type="button"
            className="min-w-0 flex-1 truncate px-4 py-3 text-left text-[var(--brand-blue)] hover:underline"
            title={inviteUrl}
            onClick={copyInviteLink}
          >
            {inviteUrl}
          </button>
          <button
            type="button"
            className="flex w-12 shrink-0 items-center justify-center border-l border-[var(--line)] bg-white text-[var(--ink)] hover:bg-blue-50 hover:text-[var(--brand-blue)]"
            aria-label="초대 링크 복사"
            title="복사"
            onClick={copyInviteLink}
          >
            <CopyIcon />
          </button>
        </div>
        {copyState === "error" ? (
          <p
            className="mt-3 text-xs font-semibold text-[var(--danger)]"
            role="alert"
          >
            링크를 복사하지 못했습니다. 다시 시도해주세요.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
