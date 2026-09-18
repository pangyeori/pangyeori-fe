"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { useDebateStatus } from "@/features/debates/hooks/useDebateStatus";
import { cancelDebateRequest, getInvitation, requestDebate } from "@/features/debates/api/debates";
import { DebateTimeBadges } from "@/features/debates/components/DebateTimeBadges";
import { DebateRoomSkeleton } from "@/features/debates/components/DebateRoomSkeleton";
import { useMyProfile } from "@/features/mypage/hooks/useMyProfile";
import { requestAge } from "@/features/debates/candidateList";

const steps = [
  [1, "초대 확인", "토론 주제와 입장을 확인합니다."],
  [2, "참여 신청", "개설자에게 참여를 요청합니다."],
  [3, "승인 대기", "개설자의 선택을 기다립니다."],
] as const;

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

export function JoinRoom({ inviteToken, debateId }: { inviteToken: string; debateId: string | null }) {
  const router = useRouter();
  const { accessToken, isReady } = useAuth();
  const profileQuery = useMyProfile();
  const invitationQuery = useQuery({
    queryKey: ["debate-invitations", inviteToken, accessToken],
    queryFn: () => getInvitation(inviteToken, accessToken!),
    enabled: isReady && Boolean(inviteToken && accessToken),
  });
  const hostIsPros = invitationQuery.data?.guestPosition !== "PROS";
  const actualDebateId = invitationQuery.data?.debateId ?? debateId;
  const invitationStatus = invitationQuery.data?.guestStatus;
  const statusDebateId = invitationStatus === "PENDING" || invitationStatus === "REJECTED" || invitationStatus === "ACCEPTED" || (invitationQuery.isError && debateId)
    ? actualDebateId : null;
  const statusQuery = useDebateStatus(statusDebateId);
  const guestStatus = statusQuery.isSuccess ? statusQuery.data.guestStatus : invitationQuery.data?.guestStatus;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const performAction = async (action: "request" | "cancel") => {
    if (!actualDebateId || !accessToken) return;
    setBusy(true);
    setActionError("");
    try {
      if (action === "request") await requestDebate(actualDebateId, accessToken);
      else await cancelDebateRequest(actualDebateId, accessToken);
      await invitationQuery.refetch();
      setCancelOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };
  const requested = guestStatus === "PENDING";
  const cancelled = guestStatus === "CANCELLED";
  const rejected = guestStatus === "REJECTED";
  const accepted = guestStatus === "ACCEPTED";
  const roomClosed = (statusQuery.data?.debateStatus ?? invitationQuery.data?.debateStatus) === "READY";
  const createdAge = requestAge(invitationQuery.data?.createdAt, invitationQuery.dataUpdatedAt);

  useEffect(() => {
    if (isReady && !accessToken && inviteToken) {
      const returnTo = `/debates/join?token=${encodeURIComponent(inviteToken)}${debateId ? `&debateId=${encodeURIComponent(debateId)}` : ""}`;
      router.replace(`/signin?next=${encodeURIComponent(returnTo)}`);
    }
  }, [accessToken, debateId, inviteToken, isReady, router]);

  useEffect(() => {
    if (accepted) router.replace("/debates/starting");
  }, [accepted, router]);

  if (!isReady) return <DebateRoomSkeleton />;
  if (!inviteToken) return <p className="p-8 text-center" role="alert">초대 링크가 올바르지 않습니다.</p>;
  if (!accessToken) return null;
  if (invitationQuery.isPending || (requested && statusQuery.isPending)) return <DebateRoomSkeleton />;

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
            함께 토론할 준비가 되었나요?
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)] sm:text-base">
            주제와 내 입장을 확인한 뒤 참여를 신청해주세요.
          </p>
        </div>

        {invitationQuery.isPending || (requested && statusQuery.isPending) ? <p className="mt-8 text-center text-sm text-[var(--ink-muted)]">참여 상태를 불러오고 있습니다.</p> : null}
        {actionError || (invitationQuery.isError && !statusQuery.isSuccess) || (requested && statusQuery.isError) ? (
          <p className="mt-8 text-center text-sm text-[var(--danger)]" role="alert">
            {actionError || (invitationQuery.error instanceof Error ? invitationQuery.error.message : "") || (statusQuery.error instanceof Error ? statusQuery.error.message : "참여 상태를 불러오지 못했습니다.")}
          </p>
        ) : null}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[270px_1fr]">
          <aside className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.05)]">
            <h2 className="text-lg font-bold text-[var(--ink)]">참여 순서</h2>
            <ol className="mt-5 space-y-3">
              {steps.map(([number, title, description]) => {
                const complete =
                  number === 1 ||
                  (number === 2 && guestStatus != null) ||
                  (number === 3 && accepted);
                const current =
                  !cancelled && !rejected && !accepted && !roomClosed &&
                  number === (requested ? 3 : 2);

                return (
                  <li
                    key={number}
                    className={`flex gap-3 rounded-xl border p-4 ${
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
                      <p className={`text-sm font-bold ${current ? "text-white" : "text-[var(--ink)]"}`}>
                        {title}
                      </p>
                      <p className={`mt-1 text-xs ${current ? "text-slate-300" : "text-[var(--ink-muted)]"}`}>
                        {description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
            <div className="border-b border-[var(--line)] p-6 sm:p-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${cancelled ? "bg-rose-100 text-rose-700" : rejected ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-[var(--brand-blue)]"}`}>
                      {cancelled
                          ? "참여 신청 취소됨"
                          : rejected
                              ? "참여 신청 거절됨"
                              : accepted
                                  ? "참여 확정"
                                  : requested
                                      ? "참여 승인 대기 중"
                                      : roomClosed
                                          ? "참여 마감"
                                          : "참여자 모집 중"}
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
                  {invitationQuery.data?.description ? <p className="mt-2 text-sm text-[var(--ink-muted)]">{invitationQuery.data.description}</p> : null}
                </div>
                <div className="shrink-0"><DebateTimeBadges turnTimeSeconds={invitationQuery.data?.turnTimeSeconds} freeDebateTimeSeconds={invitationQuery.data?.freeDebateTimeSeconds} /></div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <h3 className="text-sm font-bold text-[var(--ink-muted)]">토론 입장</h3>
              <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className={`rounded-2xl border p-5 ${hostIsPros ? "border-blue-200 bg-blue-50" : "border-rose-200 bg-rose-50"}`}>
                  <p className={`text-sm font-bold ${hostIsPros ? "text-blue-600" : "text-rose-600"}`}>{invitationQuery.data?.guestPosition === "PROS" ? "반대" : "찬성"} 진영</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full font-bold text-white ${hostIsPros ? "bg-[var(--brand-blue)]" : "bg-rose-500"}`}>{hostIsPros ? "찬" : "반"}</span>
                    <div>
                      <p className="font-bold text-[var(--ink)]">{invitationQuery.data?.hostNickname ?? "개설자 정보 확인 중"}</p>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">상대방</p>
                    </div>
                  </div>
                </div>

                <span className="text-center font-[family-name:var(--font-display)] text-sm font-bold text-[var(--ink-faint)]">VS</span>

                <div className={`rounded-2xl border p-5 ${cancelled ? "border-gray-300 bg-gray-200" : hostIsPros ? "border-rose-200 bg-rose-50" : "border-blue-200 bg-blue-50"}`}>
                  <p className={`text-sm font-bold ${cancelled ? "text-gray-600" : hostIsPros ? "text-rose-600" : "text-blue-600"}`}>
                    {invitationQuery.data?.guestPosition === "PROS" ? "찬성" : "반대"} 진영 <span className={cancelled ? "text-gray-600" : "text-[var(--ink)]"}>(나)</span>
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full font-bold text-white ${cancelled ? "bg-gray-500" : hostIsPros ? "bg-rose-500" : "bg-[var(--brand-blue)]"}`}>나</span>
                    <div>
                      <p className={`font-bold ${cancelled ? "text-gray-600" : "text-[var(--ink)]"}`}>{profileQuery.data?.nickname ?? "내 정보 확인 중"}</p>
                      <p className={`mt-1 text-xs ${cancelled ? "inline-flex rounded-full bg-rose-100 px-2 py-1 font-bold text-rose-700" : "text-[var(--ink-muted)]"}`}>
                        {cancelled
                          ? "참여 신청 취소됨"
                          : rejected
                            ? "참여 신청 거절됨"
                            : accepted
                              ? "참여 확정"
                              : requested
                                ? "참여 신청 완료"
                                : roomClosed
                                  ? "참여 마감"
                                  : "참여 신청 전"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 border-t border-[var(--line)] pt-7">
                {requested ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5" role="status">
                    <p className="font-bold text-[var(--ink)]">참여 신청을 보냈습니다</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      개설자가 참여자를 선택할 때까지 기다려주세요.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-5 !w-auto px-5"
                      disabled={busy}
                      onClick={() => setCancelOpen(true)}
                    >
                      신청 취소
                    </Button>
                  </div>
                ) : cancelled ? (
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-5" role="status">
                    <p className="font-bold text-[var(--ink)]">참여 신청을 취소했습니다</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      이 초대 링크로는 다시 신청할 수 없습니다.
                    </p>
                  </div>
                ) : rejected ? (
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-5" role="status">
                    <p className="font-bold text-[var(--ink)]">참여 신청이 거절되었습니다</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      개설자가 다른 참여자를 선택했습니다. 이번 토론에는 참여할 수 없습니다.
                    </p>
                  </div>
                ) : accepted ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5" role="status">
                    <p className="font-bold text-[var(--ink)]">토론 참여가 확정되었습니다</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      개설자가 상대방으로 선택했습니다.
                    </p>
                  </div>
                ) : roomClosed ? (
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-5" role="status">
                    <p className="font-bold text-[var(--ink)]">참여 신청이 마감되었습니다</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      개설자가 토론 상대를 확정했습니다.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-5 text-center text-sm text-[var(--ink-muted)]">
                      참여 신청 후 개설자의 승인을 기다리게 됩니다.
                    </p>
                    <Button
                      className="bg-[var(--brand-blue)] hover:bg-blue-700"
                      disabled={busy || !invitationQuery.isSuccess || roomClosed}
                      onClick={() => performAction("request")}
                    >
                      토론 참여 신청
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Modal
        open={cancelOpen}
        title="참여 신청을 취소할까요?"
        onClose={() => setCancelOpen(false)}
      >
        <p>취소하면 이 초대 링크로 다시 신청할 수 없습니다.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>
            계속 대기
          </Button>
          <Button
            className="bg-[var(--danger)] hover:brightness-90"
            disabled={busy}
            onClick={() => performAction("cancel")}
          >
            신청 취소
          </Button>
        </div>
      </Modal>
    </div>
  );
}
