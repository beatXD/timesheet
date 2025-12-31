"use client";

import { useState, useEffect, useCallback } from "react";
import type { INotification } from "@/types";

interface NotificationsState {
  notifications: INotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

interface UseNotificationsOptions {
  pollingInterval?: number; // in milliseconds
  limit?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { pollingInterval = 30000, limit = 20 } = options;

  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
    error: null,
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");

      const data = await res.json();
      setState({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [limit]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark as read");

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n._id.toString() === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!res.ok) throw new Error("Failed to mark all as read");

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete notification");

      setState((prev) => {
        const notification = prev.notifications.find(
          (n) => n._id.toString() === notificationId
        );
        return {
          ...prev,
          notifications: prev.notifications.filter(
            (n) => n._id.toString() !== notificationId
          ),
          unreadCount:
            notification && !notification.read
              ? Math.max(0, prev.unreadCount - 1)
              : prev.unreadCount,
        };
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(fetchNotifications, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollingInterval]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchNotifications();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchNotifications]);

  return {
    ...state,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
