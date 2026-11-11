import { getSupabaseClient } from "./supabaseClient.js";
export function serviceReviewSummary(entries, serviceId) {
  const reviews = entries.filter(
    (entry) =>
      entry.serviceId != null &&
      String(entry.serviceId) === String(serviceId) &&
      Number.isFinite(entry.rating) &&
      entry.rating >= 1 &&
      entry.rating <= 5,
  );
  return {
    reviewCount: reviews.length,
    rating: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null,
  };
}
export async function getTutorCompletedSessions(
  tutorProfileId,
  client = getSupabaseClient(),
) {
  if (!/^\d+$/.test(String(tutorProfileId)))
    throw new Error("A valid tutor profile is required.");
  const { data, error } = await client.rpc("get_tutor_completed_sessions", {
    p_tutor_profile_id: String(tutorProfileId),
  });
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Apply the updated supabase/manual/tutor_reviews.sql to load completed-session counts."
        : error.message || "Unable to load completed sessions.",
    );
  const count = Number(data);
  if (data == null || !Number.isSafeInteger(count) || count < 0)
    throw new Error("Unable to load a valid completed-session count.");
  return count;
}
export async function listTutorReviews(
  tutorProfileId,
  client = getSupabaseClient(),
) {
  if (!/^\d+$/.test(String(tutorProfileId)))
    throw new Error("A valid tutor profile is required to load reviews.");
  const { data, error } = await client.rpc("list_tutor_service_reviews", {
    p_tutor_profile_id: String(tutorProfileId),
  });
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Apply scripts/tutor-service-review-ids.sql in Supabase SQL Editor to display tutor reviews."
        : error.message || "Unable to load tutor reviews.",
    );
  const entries = (data || []).map((row) => ({
    id: String(row.review_id),
    name: row.learner_name || "Learner",
    rating: Number(row.rating),
    text: row.review_text || "",
    date: new Date(row.reviewed_at).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    service: row.service_title,
    serviceId: row.service_id == null ? null : String(row.service_id),
    topic: row.topic,
  }));
  return {
    entries,
    count: entries.length,
    average: entries.length
      ? entries.reduce((sum, row) => sum + row.rating, 0) / entries.length
      : 0,
  };
}
