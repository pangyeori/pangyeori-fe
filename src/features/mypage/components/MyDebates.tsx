"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RefreshButton } from "@/components/ui/RefreshButton";
import type { MyDebate, Position } from "@/features/debates/api/debates";
import { RelativeDate } from "@/features/debates/components/RelativeDate";
import {
  debateStatusLabel,
  fetchRemainingDebatePages,
  isPastDebate,
} from "@/features/debates/debateList";
import { useMyDebates } from "@/features/debates/hooks/useMyDebates";
import { rememberDebateRoom } from "@/features/debates/roomSession";

function positionLabel(position: Position) {
  return position === "PROS" ? "찬성" : "반대";
}

function rememberHostRoom(debate: MyDebate) {
  const guestPosition: Position = debate.myPosition === "PROS" ? "CONS" : "PROS";
  rememberDebateRoom({
    debateId: debate.debateId,
    title: debate.title,
    description: debate.description,
    hostPosition: debate.myPosition,
    guestPosition,
    turnTimeSeconds: debate.turnTimeSeconds,
    freeDebateTimeSeconds: debate.freeDebateTimeSeconds,
    createdAt: debate.createdAt,
  });
}

function DebateItem({ debate, now }: { debate: MyDebate; now: number }) {
  const canManage = debate.myRole === "HOST" && debate.debateStatus === "WAITING";
  const cancelled = debate.debateStatus === "CANCELLED";
  const badgeClass = isPastDebate(debate.debateStatus)
    ? cancelled
      ? "bg-slate-100 text-slate-600"
      : "bg-emerald-50 text-emerald-700"
    : debate.debateStatus === "WAITING"
      ? "bg-amber-50 text-amber-700"
      : "bg-blue-50 text-blue-700";

  return (
    <li className="rounded-xl border border-[var(--line)] bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
            {debateStatusLabel(debate.debateStatus)}
          </span>
          <span className="text-xs font-medium text-[var(--ink-faint)]">
            {debate.myRole === "HOST" ? "방장" : "참여자"} · {positionLabel(debate.myPosition)}
          </span>
        </div>
        <h3 className="mt-3 truncate text-base font-bold text-[var(--ink)]">{debate.title}</h3>
        {debate.description ? (
          <p className="mt-1 line-clamp-1 text-sm text-[var(--ink-muted)]">{debate.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          <RelativeDate value={debate.createdAt} now={now} />
          {debate.opponent ? ` · ${debate.opponent.nickname}님과 토론` : " · 상대방을 기다리는 중"}
        </p>
      </div>

      <div className="mt-4 shrink-0 sm:mt-0">
        {canManage ? (
          <Link
            href={`/debates/${encodeURIComponent(debate.debateId)}/waiting`}
            onClick={() => rememberHostRoom(debate)}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--btn-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--btn-primary-hover)]"
          >
            대기방 입장
          </Link>
        ) : !isPastDebate(debate.debateStatus) ? (
          <span className="text-xs font-medium text-[var(--ink-faint)]">
            진행 화면 준비 중
          </span>
        ) : null}
      </div>
    </li>
  );
}

function DebateItemsSkeleton({ count }: { count: number }) {
  return (
    <div className="mt-5 space-y-3 motion-safe:animate-pulse" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl bg-[var(--surface-muted)] p-4">
          <div className="h-5 w-24 rounded-full bg-slate-200" />
          <div className="mt-3 h-5 w-2/5 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-3/4 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function DebateSection({ title, debates, emptyMessage, hasMore, loadAll, now, loading }: {
  title: string;
  debates: MyDebate[];
  emptyMessage: string;
  hasMore: boolean;
  loadAll: () => Promise<void>;
  now: number;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const canToggle = debates.length > 3 || hasMore;
  const visibleDebates = expanded ? debates : debates.slice(0, 3);

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanding(true);
    try {
      await loadAll();
      setExpanded(true);
    } finally {
      setExpanding(false);
    }
  };

  return (
    <section aria-busy={loading} className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-8">
      <h2 className="border-b border-[var(--line)] pb-4 text-base font-bold text-[var(--ink)]">{title}</h2>
      {loading ? (
        <DebateItemsSkeleton count={Math.max(1, Math.min(visibleDebates.length, 3))} />
      ) : debates.length ? (
        <ul className="mt-5 space-y-3">
          {visibleDebates.map((debate) => <DebateItem key={debate.debateId} debate={debate} now={now} />)}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-[var(--ink-muted)]">{emptyMessage}</p>
      )}
      {!loading && canToggle ? (
        <button
          type="button"
          className="ml-auto mt-5 block text-sm font-semibold text-[var(--ink-muted)] underline-offset-4 transition hover:text-[var(--ink)] hover:underline disabled:cursor-wait disabled:opacity-50"
          aria-expanded={expanded}
          disabled={expanding}
          onClick={toggle}
        >
          {expanding ? "불러오는 중…" : expanded ? "간략히" : "더보기"}
        </button>
      ) : null}
    </section>
  );
}

function DebateListSkeleton() {
  return (
    <div aria-label="토론방 목록 불러오는 중" aria-busy="true" className="mt-8 space-y-8">
      {["내 토론방 목록", "지난 토론"].map((title) => (
        <section key={title} className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
          <h2 className="border-b border-[var(--line)] pb-4 text-base font-bold text-[var(--ink)]">{title}</h2>
          <DebateItemsSkeleton count={title === "내 토론방 목록" ? 2 : 1} />
        </section>
      ))}
    </div>
  );
}

export function MyDebates() {
  const query = useMyDebates();
  const debates = query.data?.pages.flatMap((page) => page.items) ?? [];
  const active = debates.filter((debate) => !isPastDebate(debate.debateStatus));
  const past = debates.filter((debate) => isPastDebate(debate.debateStatus));
  const loadAll = () => fetchRemainingDebatePages(
    Boolean(query.hasNextPage),
    () => query.fetchNextPage(),
  );

  if (query.isPending) {
    return <DebateListSkeleton />;
  }

  const refreshing = query.isFetching && !query.isFetchingNextPage;

  return (
    <div>
      {query.isError ? (
        <section className="mt-8 rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-bg)] p-6 text-center" role="alert">
          <p className="font-bold text-[var(--ink)]">토론방 목록을 불러오지 못했습니다</p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {query.error instanceof Error ? query.error.message : "잠시 후 다시 시도해주세요."}
          </p>
          <Button className="mx-auto mt-4 !h-10 !w-auto px-4" onClick={() => query.refetch()}>
            다시 시도
          </Button>
        </section>
      ) : (
        <>
          <div className="relative">
            <div className="absolute right-5 top-6 z-10 sm:right-7 sm:top-7">
              <RefreshButton label="내 토론방 목록 새로고침" onRefresh={() => query.refetch()} />
            </div>
            <DebateSection
              title="내 토론방 목록"
              debates={active}
              emptyMessage="진행 중인 토론방이 없습니다."
              hasMore={Boolean(query.hasNextPage)}
              loadAll={loadAll}
              now={query.dataUpdatedAt}
              loading={refreshing}
            />
          </div>
          <DebateSection
            title="지난 토론"
            debates={past}
            emptyMessage="지난 토론이 없습니다."
            hasMore={Boolean(query.hasNextPage)}
            loadAll={loadAll}
            now={query.dataUpdatedAt}
            loading={refreshing}
          />
        </>
      )}
    </div>
  );
}
