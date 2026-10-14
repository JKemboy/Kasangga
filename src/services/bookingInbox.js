import { listChats } from "./bookingMessages.js";
import { listLearnerSessions } from "./learnerSessions.js";
import { listTutorSessions } from "./tutorSessions.js";

const activeStatuses = new Set(["confirmed"]);
const activePayments = new Set(["paid", "partially refunded"]);

function sessionState(session, role) {
  const status =
    role === "tutor" ? session.status : session.bookingStatus || session.status;
  const payment = role === "tutor" ? session.payment : session.paymentStatus;
  return {
    status: String(status || "").toLowerCase(),
    payment: String(payment || "").toLowerCase(),
  };
}

function makeSessionNotification(session, role) {
  const name = role === "tutor" ? session.learner : session.name;
  const completed =
    String(session.status || session.bookingStatus).toLowerCase() ===
    "completed";
  return {
    id: `session-${session.id}-${session.status || session.bookingStatus}`,
    kind: "session",
    category: "Sessions",
    title: completed ? "Session Completed" : "Session Confirmed",
    text: `${name} · ${session.service || session.course} · ${session.date}`,
    time: session.date,
    view: "sessions",
    args: { sessionId: session.id, tab: completed ? "Completed" : "Upcoming" },
    bookingId: session.id,
  };
}

export async function loadBookingInbox(role) {
  const [chats, sessions] = await Promise.all([
    listChats(role),
    role === "tutor" ? listTutorSessions() : listLearnerSessions(),
  ]);
  const confirmedSessions = sessions.filter((session) => {
    const state = sessionState(session, role);
    return (
      activeStatuses.has(state.status) && activePayments.has(state.payment)
    );
  });
  const activeIds = new Set(
    confirmedSessions.map((session) => String(session.id)),
  );
  const threads = (chats || []).map((chat) => ({
    ...chat,
    id: String(chat.booking_id),
    name: chat.peer_name || "Conversation",
    last_message: chat.last_message || "",
  }));
  const chatNotifications = threads
    .filter((chat) => Number(chat.unread) > 0)
    .map((chat) => ({
      id: `message-${chat.booking_id}-${chat.last_message || chat.unread}`,
      kind: "message",
      category: "Messages",
      title: `New message from ${chat.name}`,
      text: chat.last_message || "You have an unread booking message.",
      time: chat.last_message_at || chat.session_date || "",
      view: "messages",
      args: { bookingId: String(chat.booking_id), learner: chat.name },
      bookingId: String(chat.booking_id),
    }));
  const sessionNotifications = sessions
    .filter((session) => {
      const { status, payment } = sessionState(session, role);
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      return (
        (status === "confirmed" &&
          session.date >= today &&
          activePayments.has(payment)) ||
        (status === "completed" && activePayments.has(payment))
      );
    })
    .map((session) => makeSessionNotification(session, role));
  return {
    threads,
    notifications: [...chatNotifications, ...sessionNotifications].sort(
      (left, right) => String(right.time).localeCompare(String(left.time)),
    ),
    sessions,
  };
}

export function readInboxIds(userId) {
  if (!userId || typeof localStorage === "undefined") return [];
  try {
    const value = JSON.parse(
      localStorage.getItem(`campustutor:inbox-read:${userId}`) || "[]",
    );
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function persistInboxReadIds(userId, ids) {
  if (!userId || typeof localStorage === "undefined") return;
  localStorage.setItem(
    `campustutor:inbox-read:${userId}`,
    JSON.stringify([...new Set(ids)]),
  );
}
