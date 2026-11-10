import { paidSession, sessionLifecycle } from "./sessionLifecycle.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { meetingPlatform } from "./sessionMeeting.js";
import { attachCompletionProofs } from "./tutorSessionCompletion.js";

const label = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export function mapTutorSession(row, now = new Date()) {
  return {
    id: String(row.booking_id),
    booking: `BK-${row.booking_id}`,
    completionProof: row.completionProof || null,
    serviceId: String(row.service_id),
    learnerId: row.learner_id,
    learnerUserId: row.learner_id,
    learner: row.learner_name || "Learner",
    service: row.service_title,
    topic: row.specific_topic || "",
    date: row.session_date,
    start: row.start_time,
    end: row.end_time,
    amount: Number(row.amount),
    type: row.session_type?.toLowerCase() === "online" ? "Online" : "In-person",
    provider:
      row.session_type?.toLowerCase() === "online"
        ? meetingPlatform(row.meeting_platform, row.meeting_link)
        : row.location || "Not provided",
    location: row.location,
    meetingUrl: row.meeting_link || "",
    status: label(row.booking_status),
    lifecycle: sessionLifecycle(row, now),
    startAt: new Date(
      `${row.session_date}T${String(row.start_time).length === 5 ? row.start_time + ":00" : String(row.start_time).slice(0, 8)}+08:00`,
    ).toISOString(),
    endAt: new Date(
      `${row.session_date}T${String(row.end_time).length === 5 ? row.end_time + ":00" : String(row.end_time).slice(0, 8)}+08:00`,
    ).toISOString(),
    payment: label(row.payment_status),
    transaction:
      row.transaction_reference ||
      (row.payment_id ? String(row.payment_id) : ""),
    paymentReference: row.transaction_reference,
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
    bookedAt: row.created_at,
    completedAt: row.completed_at,
    transferredAt: row.transferred_at,
    allocation: row.allocation,
  };
}
export async function listTutorSessions(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("list_my_paid_tutor_sessions");
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Run supabase/manual/paid_sessions.sql in Supabase SQL Editor to enable tutor sessions."
        : error.message,
    );
  const rows = (data || []).filter(paidSession);
  const missing = rows.filter(
    (row) => !row.transaction_reference && !row.payment_id,
  );
  if (missing.length) {
    const { data: payments, error: paymentError } = await client
      .from("payments")
      .select("booking_id,payment_id,transaction_reference,payment_status")
      .in(
        "booking_id",
        missing.map((row) => row.booking_id),
      )
      .order("payment_id", { ascending: true });
    if (paymentError)
      throw new Error(
        `Unable to load transaction IDs: ${paymentError.message}`,
      );
    for (const row of missing) {
      const related = (payments || []).filter(
        (payment) => String(payment.booking_id) === String(row.booking_id),
      );
      const payment =
        related.findLast((item) => item.payment_status === "paid") ||
        related.at(-1);
      if (payment) {
        row.payment_id = payment.payment_id;
        row.transaction_reference = payment.transaction_reference;
      }
    }
  }
  return (await attachCompletionProofs(rows, client)).map((row) =>
    mapTutorSession(row),
  );
}
