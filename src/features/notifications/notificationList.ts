import type {
  NotificationItem,
  NotificationType,
} from "@/features/notifications/api/notifications";

export function unreadCountLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function notificationHref(type: NotificationType, debateId: string) {
  return type === "QUEUE_REQUEST_ADDED" || type === "QUEUE_REQUEST_REMOVED"
    ? `/debates/${encodeURIComponent(debateId)}/waiting`
    : type === "QUEUE_REQUEST_ACCEPTED"
      ? `/debates/${encodeURIComponent(debateId)}`
    : null;
}

export function markNotificationItemsRead(
  items: NotificationItem[],
  notificationId?: string,
) {
  return items.map((item) =>
    notificationId && item.notificationId !== notificationId
      ? item
      : { ...item, isRead: true },
  );
}
