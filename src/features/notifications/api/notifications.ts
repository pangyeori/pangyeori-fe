import { apiClient } from "@/lib/api/client";

export type NotificationType =
  | "QUEUE_REQUEST_ADDED"
  | "QUEUE_REQUEST_REMOVED"
  | "QUEUE_REQUEST_ACCEPTED"
  | "QUEUE_REQUEST_REJECTED"
  | "DEBATE_CANCELLED";

export type NotificationItem = {
  notificationId: string;
  debateId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsPage = {
  items: NotificationItem[];
  nextCursor: string | null;
  hasNext: boolean;
};

export function getNotifications(
  token: string,
  cursor: string | null = null,
) {
  const query = new URLSearchParams({ pageSize: "20" });
  if (cursor) query.set("cursor", cursor);
  return apiClient<NotificationsPage>(`/api/v1/notifications?${query}`, { token });
}

export function getUnreadNotificationCount(token: string) {
  return apiClient<{ count: number }>("/api/v1/notifications/unread-count", { token });
}

export function markNotificationRead(notificationId: string, token: string) {
  return apiClient<void>(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
    token,
  });
}

export function markAllNotificationsRead(token: string) {
  return apiClient<void>("/api/v1/notifications/read-all", {
    method: "PATCH",
    token,
  });
}

export function deleteNotification(notificationId: string, token: string) {
  return apiClient<void>(`/api/v1/notifications/${encodeURIComponent(notificationId)}`, {
    method: "DELETE",
    token,
  });
}
