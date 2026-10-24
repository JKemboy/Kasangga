import { useCallback, useEffect, useState } from "react";
import { readMessages } from "./bookingMessages.js";
import { loadBookingInbox } from "./bookingInbox.js";
import { getSupabaseClient } from "./supabaseClient.js";

export default function useBookingInbox(role, userId) {
  const [feed, setFeed] = useState({ notifications: [], threads: [] });
  const [readIds, setReadIds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setReadIds([]);
  }, [userId]);

  useEffect(() => {
    if (!userId || !["learner", "tutor"].includes(role)) {
      setFeed({ notifications: [], threads: [] });
      return undefined;
    }
    setFeed({ notifications: [], threads: [] });
    setError("");
    let live = true;
    const load = async () => {
      try {
        const next = await loadBookingInbox(role, userId);
        if (live) {
          setFeed(next);
          setError("");
        }
      } catch (cause) {
        if (live) setError(cause.message || "Unable to load your inbox.");
      }
    };
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener("focus", load);
    window.addEventListener("campustutor:sessions-changed", load);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener("campustutor:sessions-changed", load);
    };
  }, [role, userId]);

  const markRead = useCallback(
    async (notifications) => {
      const ids = notifications
        .map((item) => (typeof item === "string" ? item : item.id))
        .filter(Boolean);
      const selected = feed.notifications.filter((item) =>
        ids.includes(item.id),
      );
      const messageIds = selected
        .filter((item) => item.kind === "message")
        .map((item) => item.bookingId);
      try {
        const storedIds = selected
          .filter((item) => item.kind === "database")
          .map((item) => item.notificationId);
        if (storedIds.length) {
          const { error } = await getSupabaseClient()
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .in("notification_id", storedIds);
          if (error) throw error;
        }
        await Promise.all(
          messageIds.map((bookingId) => readMessages(bookingId)),
        );
      } catch (cause) {
        setError(cause.message || "Unable to mark booking messages as read.");
        return;
      }
      setReadIds((current) => [...new Set([...current, ...ids])]);
      if (messageIds.length) {
        const readBookings = new Set(messageIds.map(String));
        setFeed((current) => ({
          ...current,
          threads: current.threads.map((thread) =>
            readBookings.has(String(thread.booking_id))
              ? { ...thread, unread: 0 }
              : thread,
          ),
        }));
      }
    },
    [feed.notifications, userId],
  );
  const notifications = feed.notifications.map((item) => ({
    ...item,
    read: !!item.read || readIds.includes(item.id),
  }));
  return {
    notifications,
    sessions: feed.sessions || [],
    threads: feed.threads,
    error,
    markRead,
  };
}
