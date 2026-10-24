import {
  listMyReportAlerts,
  receivedReportNotifications,
} from "./myReports.js";
import { listChats } from "./bookingMessages.js";
import { listLearnerSessions } from "./learnerSessions.js";
import { listTutorSessions } from "./tutorSessions.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { loadActivityReadIds } from "./notificationReadState.js";

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
  const [chats, sessions, reports] = await Promise.all([
    listChats(role),
    role === "tutor" ? listTutorSessions() : listLearnerSessions(),
    userId ? listMyReportAlerts() : Promise.resolve({ received: [] }),
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
  // Notification read state is independent of conversation read state:
  // opening Messages must not silently clear unclicked notification items.
  const { data: incoming, error: incomingError } = await getSupabaseClient()
    .from("messages")
    .select(
      "message_id,message_content,sent_at,conversations!inner(booking_id)",
    )
    .neq("sender_id", userId)
    .order("sent_at", { ascending: false })
    .limit(50);
  if (incomingError)
    throw new Error(
      `Unable to load message notifications: ${incomingError.message}`,
    );
  const chatNotifications = (incoming || []).map((message) => {
    const bookingId = String(message.conversations?.booking_id || "");
    const name =
      threads.find((t) => String(t.booking_id) === bookingId)?.name ||
      (role === "tutor" ? "Learner" : "Tutor");
    return {
      id: `message-${bookingId}-${message.message_id}`,
      kind: "message",
      category: "Messages",
      title: `New message from ${name}`,
      text: message.message_content,
      time: message.sent_at,
      view: "messages",
      args: { bookingId, learner: name },
      bookingId,
    };
  });
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
      .neq("notification_type", "activity_read_receipt")
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
        notificationType: row.notification_type,
        entityType: entity,
        entityId: id,
        kind: "database",
        title: row.title,
        text: row.message,
        time: row.created_at,
        read: row.is_read,
        category:
          entity === "incident_reports"
            ? "Safety and Reports"
            : entity === "services"
              ? "Services"
              : entity === "payments"
                ? "Payments"
                : "System",
        view:
          entity === "incident_reports"
            ? "reports"
            : entity === "services"
              ? "services"
              : entity === "bookings"
                ? "sessions"
                : "notifications",
        args:
          entity === "incident_reports"
            ? { reportId: id }
            : entity === "services"
              ? { serviceId: id }
              : entity === "bookings"
                ? { sessionId: id }
                : { notificationId: `notification-${row.notification_id}` },
      };
    });
  }
  const readIds = userId ? await loadActivityReadIds(userId) : new Set();
  return {
    threads,
    notifications: [
      ...stored,
      ...receivedReportNotifications(reports.received, stored),
      ...transfers,
      ...chatNotifications,
      ...sessionNotifications,
    ]
      .map((item) => ({ ...item, read: !!item.read || readIds.has(item.id) }))
      .sort((left, right) =>
        String(right.time).localeCompare(String(left.time)),
      ),
    sessions,
  };
}
