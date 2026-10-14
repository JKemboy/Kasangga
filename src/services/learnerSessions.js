import { paidSession, sessionLifecycle } from "./sessionLifecycle.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { meetingPlatform } from "./sessionMeeting.js";

const label = (value) =>
  String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const dateInManila = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
};

export function mapLearnerSession(row, now = new Date()) {
  const date = dateInManila(row.session_date);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const clock = (value) =>
    new Date(`2000-01-01T${value}+08:00`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    });
  const tutorName = row.tutor_name || "Tutor";
  const time = `${clock(row.start_time)} – ${clock(row.end_time)}`;
  const paymentStatus = label(row.payment_status);
  const bookingStatus = label(row.booking_status);
  const sessionType =
    row.session_type?.toLowerCase() === "online" ? "Online" : "In-person";
  const venue =
    sessionType === "Online"
      ? meetingPlatform(row.meeting_platform, row.meeting_link)
      : row.location || "To be arranged";
  return {
    id: String(row.booking_id),
    bookingId: String(row.booking_id),
    lifecycle: sessionLifecycle(row, now),
    date: row.session_date,
    paymentStatus,
    bookingStatus,
    paymentMethod: row.payment_method || "",
    transactionId: row.transaction_reference || "",
    bookedOn: row.booked_at || "",
    name: tutorName,
    course: row.service_title,
    subject: row.subject || row.service_title,
    topic: row.specific_topic || "",
    duration: Number(row.duration),
    time,
    type: sessionType,
    platform: sessionType === "Online" ? venue : "",
    link: row.meeting_link || "",
    venue,
    amount: Number(row.amount),
    rate: Number(row.rate_per_hour),
    status: bookingStatus,
    canManage:
      String(row.booking_status || "").toLowerCase() === "confirmed" &&
      ["paid", "partially_refunded"].includes(
        String(row.payment_status || "").toLowerCase(),
      ),
    details: [
      date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      String(date.getUTCDate()),
      weekday,
      tutorName,
      row.service_title,
      "—",
      "0",
      row.subject || row.service_title,
      row.specific_topic || "",
      dateLabel,
      weekday,
      time,
      sessionType,
      venue,
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(Number(row.amount) || 0),
      bookingStatus,
      tutorName
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    ],
  };
}

export async function listLearnerSessions(
  client = getSupabaseClient(),
  now = new Date(),
) {
  const { data, error } = await client.rpc("list_my_paid_learner_sessions");
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Apply supabase/manual/paid_sessions.sql in Supabase SQL Editor to load your booked sessions."
        : error.message || "Unable to load your booked sessions.",
    );
  return (data || [])
    .filter(paidSession)
    .map((row) => mapLearnerSession(row, now))
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.details[11].localeCompare(right.details[11]),
    );
}
