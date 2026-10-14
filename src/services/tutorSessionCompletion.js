import { getSupabaseClient } from "./supabaseClient.js";

export async function completeTutorSession(bookingId) {
  const { error } = await getSupabaseClient().rpc("complete_tutor_session", {
    p_booking_id: Number(bookingId),
  });
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Apply supabase/manual/complete_tutor_session.sql in Supabase SQL Editor to enable session completion."
        : error.code === "42501"
          ? "You are not allowed to complete this session. Confirm that you are signed in as its tutor."
          : error.message || "Unable to mark this session as completed.",
    );
}
