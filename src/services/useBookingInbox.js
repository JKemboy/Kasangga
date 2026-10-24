import { useCallback, useEffect, useRef, useState } from "react";
import { persistNotificationRead } from "./notificationReadState.js";
import { loadBookingInbox } from "./bookingInbox.js";

export default function useBookingInbox(role, userId) {
  const [feed, setFeed] = useState({ notifications: [], threads: [] });
  const [readIds, setReadIds] = useState([]);
  const [error, setError] = useState("");
  const account = useRef(userId);
  account.current = userId;

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
    const changed = (event) => {
      if (event.detail?.userId === userId)
        setReadIds((current) => [
          ...new Set([...current, ...event.detail.ids]),
        ]);
      load();
    };
    window.addEventListener("campustutor:notifications-changed", changed);
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener("focus", load);
    window.addEventListener("campustutor:sessions-changed", load);
    return () => {
      live = false;
      window.removeEventListener("campustutor:notifications-changed", changed);
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
      if (!userId || !selected.length) return false;
      const messageIds = selected
        .filter((item) => item.kind === "message")
        .map((item) => item.bookingId);
      try {
        await persistNotificationRead(userId, selected);
        if (account.current !== userId) return false;
      } catch (cause) {
        setError(cause.message || "Unable to mark notification as read.");
        return false;
      }
      setError("");
      window.dispatchEvent(
        new CustomEvent("campustutor:notifications-changed", {
          detail: { userId, ids },
        }),
      );
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
      return true;
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
