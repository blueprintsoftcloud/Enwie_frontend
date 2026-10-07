// src/context/UserNotificationContext.tsx
// Migrated: TanStack Query handles initial fetch + cache invalidation.
// Socket.IO handles real-time push.

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import socket from "../utils/socket";
import { useAuth } from "./AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface UserNotification {
  _id?: string;
  id?: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt?: string;
  /** Present on order-related notifications (NEW_ORDER/ORDER_UPDATE/PAYMENT_SUCCESS/
   * PAYMENT_FAILED) — see notification.controller.ts's getUserNotifications. Null/absent
   * for non-order types or if the order was since deleted. */
  order?: { id: string } | null;
  [key: string]: unknown;
}

interface UserNotificationContextValue {
  notifications: UserNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────
const UserNotificationContext = createContext<UserNotificationContextValue | undefined>(undefined);

export const useUserNotifications = (): UserNotificationContextValue => {
  const ctx = useContext(UserNotificationContext);
  if (!ctx) throw new Error("useUserNotifications must be used inside <UserNotificationProvider>");
  return ctx;
};

// ── Provider ───────────────────────────────────────────────────────────────────
export const UserNotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Query: initial fetch ─────────────────────────────────────────────────────
  const { data: notifications = [] } = useQuery<UserNotification[]>({
    queryKey: ["user-notifications"],
    queryFn: async () => {
      const res = await api.get<UserNotification[]>("/notifications/user");
      return res.data;
    },
    enabled: user?.isAuthenticated === true && navigator.onLine,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // ── Derived unread count (always 100% in sync with notifications state) ─────────
  const unreadCount = useMemo(() => {
    return (notifications ?? []).filter((n) => !n.isRead).length;
  }, [notifications]);

  // ── Mark single as read ───────────────────────────────────────────────────────
  const markAsRead = useCallback(
    async (id: string) => {
      queryClient.setQueryData<UserNotification[]>(
        ["user-notifications"],
        (prev) =>
          (prev ?? []).map((n) =>
            (n._id === id || n.id === id) ? { ...n, isRead: true } : n,
          ),
      );

      try {
        await api.put(`/notifications/${id}/read`);
      } catch (err) {
        console.error("markAsRead failed:", err);
        queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      }
    },
    [queryClient],
  );

  // ── Mark all as read ─────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    queryClient.setQueryData<UserNotification[]>(
      ["user-notifications"],
      (prev) => (prev ?? []).map((n) => ({ ...n, isRead: true })),
    );

    try {
      await api.put("/notifications/mark-all-read");
    } catch (err) {
      console.error("markAllRead failed:", err);
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    }
  }, [queryClient]);

  // ── Delete single notification ───────────────────────────────────────────────
  const deleteNotification = useCallback(
    async (id: string) => {
      queryClient.setQueryData<UserNotification[]>(
        ["user-notifications"],
        (prev) => (prev ?? []).filter((n) => n._id !== id && n.id !== id),
      );

      try {
        await api.delete(`/notifications/${id}`);
      } catch (err) {
        console.error("deleteNotification failed:", err);
        queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      }
    },
    [queryClient],
  );

  // ── Clear all notifications ──────────────────────────────────────────────────
  const clearAllNotifications = useCallback(async () => {
    queryClient.setQueryData<UserNotification[]>(
      ["user-notifications"],
      [],
    );

    try {
      await api.delete("/notifications/clear-all");
    } catch (err) {
      console.error("clearAllNotifications failed:", err);
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    }
  }, [queryClient]);

  // ── Socket.IO real-time push ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.isAuthenticated) return;
    if (!navigator.onLine) return;

    if (!socket.connected) socket.connect();

    const handleNotification = (notification: UserNotification) => {
      queryClient.setQueryData<UserNotification[]>(
        ["user-notifications"],
        (prev) => {
          const notifId = notification.id ?? notification._id;
          const list = prev ?? [];
          if (notifId && list.some((n) => (n.id ?? n._id) === notifId)) {
            return list;
          }
          return [notification, ...list];
        },
      );
    };

    socket.on("new-notification", handleNotification);
    return () => { socket.off("new-notification", handleNotification); };
  }, [user?.isAuthenticated, queryClient]);

  return (
    <UserNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
        markAllAsRead: markAllRead,
        deleteNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </UserNotificationContext.Provider>
  );
};
