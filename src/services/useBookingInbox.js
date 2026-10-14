import { useCallback, useEffect, useState } from "react";
import { readMessages } from "./bookingMessages.js";
import {
  loadBookingInbox,
  persistInboxReadIds,
  readInboxIds,
} from "./bookingInbox.js";

export default function useBookingInbox(role, userId) {
  const [feed, setFeed] = useState({ notifications: [], threads: [] });
  const [readIds, setReadIds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setReadIds(readInboxIds(userId));
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
        const next = await loadBookingInbox(role);
        if (live) {
          setFeed(next);
          setError("");
        }
      } catch (cause) {
        if (live) setError(cause.message || "Unable to load your inbox.");
      }
    };
    load();
    const timer = setInterval(load, 30000);
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
        await Promise.all(
          messageIds.map((bookingId) => readMessages(bookingId)),
        );
      } catch (cause) {
        setError(cause.message || "Unable to mark booking messages as read.");
        return;
      }
      setReadIds((current) => {
        const next = [...new Set([...current, ...ids])];
        try {
          persistInboxReadIds(userId, next);
        } catch (cause) {
          setError(cause.message || "Unable to save notification read status.");
          return current;
        }
        return next;
      });
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
    read: readIds.includes(item.id),
  }));
  return {
    notifications,
    threads: feed.threads,
    error,
    markRead,
  };
}
