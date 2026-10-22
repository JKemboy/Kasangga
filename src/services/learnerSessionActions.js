import { getSupabaseClient } from "./supabaseClient.js";
export async function cancelLearnerSession(
  record,
  { reason, notes = "", acknowledged },
  client = getSupabaseClient(),
) {
  const bookingId = String(record.bookingId || record.id || "");
  if (!/^\d+$/.test(bookingId)) throw new Error("A valid booking is required.");
  if (!String(reason || "").trim())
    throw new Error("Select a cancellation reason.");
  if (!acknowledged) throw new Error("Acknowledge the cancellation policy.");
  const { data, error } = await client.rpc("cancel_chat_session", {
    p_booking_id: Number(bookingId),
    p_reason: [reason.trim(), notes.trim()].filter(Boolean).join(": "),
    p_acknowledged: true,
  });
  if (error) throw new Error(error.message || "Unable to cancel this session.");
  return data;
}
