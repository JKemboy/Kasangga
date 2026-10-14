import { listChats } from "./bookingMessages.js";
import { listLearnerSessions } from "./learnerSessions.js";
import { listTutorSessions } from "./tutorSessions.js";
import { getSupabaseClient } from "./supabaseClient.js";

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
    time:
      session.completedAt || session.paidAt || session.bookedAt || session.date,
    view: "sessions",
    args: { sessionId: session.id, tab: completed ? "Completed" : "Upcoming" },
    bookingId: session.id,
  };
}

export async function loadBookingInbox(role, userId) {
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
  const transfers =
    role === "tutor"
      ? sessions
          .filter((session) => session.transferredAt)
          .map((session) => ({
            id: `transfer-${session.id}-${session.transferredAt}`,
            kind: "transfer",
            category: "Payments",
            title: "Payout Transferred",
            text: `${session.booking} · ${session.service} · Payout marked as transferred by Admin.`,
            time: session.transferredAt,
            view: "earnings",
            args: { transactionId: session.transaction },
          }))
      : [];
  let stored = [];
  if (userId) {
    const { data, error } = await getSupabaseClient()
      .from("notifications")
      .select(
        "notification_id,title,message,notification_type,related_entity_type,related_entity_id,is_read,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error)
      throw new Error(`Unable to load notifications: ${error.message}`);
    stored = (data || []).map((row) => {
      const entity = row.related_entity_type,
        id = String(row.related_entity_id || "");
      return {
        id: `notification-${row.notification_id}`,
        notificationId: row.notification_id,
        kind: "database",
        title: row.title,
        text: row.message,
        time: row.created_at,
        read: row.is_read,
        category:
          entity === "services"
            ? "Services"
            : entity === "payments"
              ? "Payments"
              : "Updates",
        view:
          entity === "services"
            ? "services"
            : entity === "bookings"
              ? "sessions"
              : "notifications",
        args:
          entity === "services"
            ? { serviceId: id }
            : entity === "bookings"
              ? { sessionId: id }
              : { notificationId: `notification-${row.notification_id}` },
      };
    });
  }
  return {
    threads,
    notifications: [
      ...stored,
      ...transfers,
      ...chatNotifications,
      ...sessionNotifications,
    ].sort((left, right) =>
      String(right.time).localeCompare(String(left.time)),
    ),
    sessions,
  };
}
