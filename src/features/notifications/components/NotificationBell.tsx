"use client";

import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthProvider";
import { RelativeDate } from "@/features/debates/components/RelativeDate";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationsPage,
} from "@/features/notifications/api/notifications";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/hooks/useNotifications";
import {
  markNotificationItemsRead,
  notificationHref,
  unreadCountLabel,
} from "@/features/notifications/notificationList";

function BellIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const previousUnreadCount = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const countQuery = useUnreadNotificationCount();
  const notificationsQuery = useNotifications(open);
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchNotifications,
  } = notificationsQuery;
  const notifications = notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const unreadCount = countQuery.data?.count ?? 0;
  const hasUnread = unreadCount > 0 || notifications.some((item) => !item.isRead);
  const invalidateNotifications = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markCachedNotificationsRead = (notificationId?: string) => {
    queryClient.setQueryData<InfiniteData<NotificationsPage>>(
      ["notifications", "list", accessToken],
      (data) => data && ({
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: markNotificationItemsRead(page.items, notificationId),
        })),
      }),
    );
    queryClient.setQueryData<{ count: number }>(
      ["notifications", "unread-count", accessToken],
      (data) => data && ({
        count: notificationId ? Math.max(0, data.count - 1) : 0,
      }),
    );
  };

  const readMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      return markNotificationRead(notificationId, accessToken);
    },
    onSuccess: (_, notificationId) => markCachedNotificationsRead(notificationId),
  });
  const readAllMutation = useMutation({
    mutationFn: () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      return markAllNotificationsRead(accessToken);
    },
    onSuccess: () => markCachedNotificationsRead(),
  });
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      return deleteNotification(notificationId, accessToken);
    },
    onSettled: invalidateNotifications,
  });

  const resetMutationErrors = () => {
    readMutation.reset();
    readAllMutation.reset();
    deleteMutation.reset();
  };

  useEffect(() => {
    const count = countQuery.data?.count;
    if (count === undefined) return;

    const changed = previousUnreadCount.current !== null && previousUnreadCount.current !== count;
    previousUnreadCount.current = count;
    if (!changed) return;

    if (open) {
      void refetchNotifications();
    } else {
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "list", accessToken],
        exact: true,
        refetchType: "none",
      });
    }
  }, [accessToken, countQuery.data?.count, open, queryClient, refetchNotifications]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const target = loadMoreRef.current;
    const root = scrollRef.current;
    if (!open || !target || !root || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    open,
  ]);

  const actionError = readMutation.error ?? readAllMutation.error ?? deleteMutation.error;

  const openNotification = async (notification: NotificationItem) => {
    resetMutationErrors();
    if (!notification.isRead) {
      try {
        await readMutation.mutateAsync(notification.notificationId);
      } catch {
        return;
      }
    }

    const href = notificationHref(notification.type, notification.debateId);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={unreadCount ? `알림, 읽지 않은 알림 ${unreadCount}개` : "알림"}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => {
          resetMutationErrors();
          if (!open) void refetchNotifications();
          setOpen(!open);
        }}
        className="relative flex size-10 items-center justify-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)]"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold leading-5 text-white"
          >
            {unreadCountLabel(unreadCount)}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          id="notification-panel"
          aria-label="알림 목록"
          className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)] sm:left-auto sm:right-4 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <h2 className="font-bold text-[var(--ink)]">알림</h2>
            <button
              type="button"
              disabled={!hasUnread || readAllMutation.isPending}
              onClick={() => {
                resetMutationErrors();
                readAllMutation.mutate();
              }}
              className="text-xs font-semibold text-[var(--ink-faint)] hover:text-[var(--ink-muted)] disabled:cursor-not-allowed disabled:text-[var(--ink-faint)]"
            >
              {readAllMutation.isPending ? "처리 중…" : "모두 읽음"}
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[min(70dvh,36rem)] overflow-y-auto">
            {actionError ? (
              <p className="border-b border-[var(--danger-soft)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">
                {actionError.message}
              </p>
            ) : null}

            {notificationsQuery.isPending ? (
              <div className="space-y-1 p-2" aria-label="알림 불러오는 중" aria-busy="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="animate-pulse rounded-xl p-3">
                    <div className="h-4 w-4/5 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-16 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : notificationsQuery.isError && notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-[var(--ink-muted)]">알림을 불러오지 못했습니다.</p>
                <button
                  type="button"
                  onClick={() => notificationsQuery.refetch()}
                  className="mt-3 text-sm font-semibold text-[var(--brand-blue)] underline-offset-4 hover:underline"
                >
                  다시 시도
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-[var(--ink-muted)]">새로운 알림이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {notifications.map((notification) => {
                  const reading = readMutation.isPending && readMutation.variables === notification.notificationId;
                  const deleting = deleteMutation.isPending && deleteMutation.variables === notification.notificationId;
                  return (
                    <li
                      key={notification.notificationId}
                      className={`relative flex items-start gap-1 p-2 hover:bg-[var(--surface-muted)] ${notification.isRead ? "bg-white" : "bg-blue-50/70"}`}
                    >
                      <button
                        type="button"
                        disabled={reading}
                        onClick={() => void openNotification(notification)}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2 text-left disabled:cursor-wait"
                      >
                        <span className="mt-1.5 flex size-2 shrink-0 rounded-full bg-[var(--brand-blue)] data-[read=true]:bg-transparent" data-read={notification.isRead}>
                          {!notification.isRead ? <span className="sr-only">읽지 않음</span> : null}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm leading-6 ${notification.isRead ? "text-[var(--ink-muted)]" : "font-semibold text-[var(--ink)]"}`}>
                            {notification.message}
                          </span>
                          <RelativeDate
                            value={notification.createdAt}
                            now={notificationsQuery.dataUpdatedAt}
                            className="mt-1 block text-xs text-[var(--ink-faint)]"
                          />
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-label="알림 삭제"
                        disabled={deleting}
                        onClick={() => {
                          resetMutationErrors();
                          deleteMutation.mutate(notification.notificationId);
                        }}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-[var(--ink-faint)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink-muted)] disabled:cursor-wait disabled:opacity-50"
                      >
                        <span aria-hidden>✕</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div ref={loadMoreRef} className="h-1" />
            {notificationsQuery.isFetchingNextPage ? (
              <p className="px-4 py-3 text-center text-xs text-[var(--ink-faint)]" role="status">알림을 더 불러오는 중…</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
