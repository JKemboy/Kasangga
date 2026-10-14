import { getSupabaseClient } from "./supabaseClient.js";
export function mapLearnerReview(row) {
  return {
    id: String(row.rating_id),
    sessionId: String(row.booking_id),
    rating: Number(row.rating_score),
    text: row.comment || "",
    date: row.rated_at,
    visible: row.is_visible,
  };
}
function check(error) {
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Apply supabase/manual/learner_reviews.sql in Supabase SQL Editor to enable reviews."
        : error.message || "Unable to save review.",
    );
}
export async function listLearnerReviews(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("list_my_learner_reviews");
  check(error);
  return (data || []).map(mapLearnerReview);
}
export async function saveLearnerReview(
  bookingId,
  values,
  client = getSupabaseClient(),
) {
  const { data, error } = await client.rpc("save_my_learner_review", {
    p_booking_id: Number(bookingId),
    p_rating: values.rating,
    p_comment: values.text,
  });
  check(error);
  return mapLearnerReview(data);
}
