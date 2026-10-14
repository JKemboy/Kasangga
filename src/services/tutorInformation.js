import { getSupabaseClient } from "./supabaseClient.js";
import { listTutorReviews } from "./tutorReviews.js";
async function request(name, args, client) {
  const { data, error } = await client.rpc(name, args);
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Apply supabase/manual/tutor_information.sql in Supabase SQL Editor to enable Tutor Information."
        : error.message || "Unable to save tutor information.",
    );
  if (!data) throw new Error("An active tutor profile is required.");
  return data;
}
export const loadTutorInformation = async (client = getSupabaseClient()) => {
  const info = await request("get_my_tutor_information", {}, client);
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user)
    throw new Error("Unable to verify the tutor account.");
  const { data: profile, error } = await client
    .from("tutor_profiles")
    .select("tutor_profile_id")
    .eq("user_id", auth.user.id)
    .single();
  if (error) throw new Error(error.message);
  const reviews = await listTutorReviews(profile.tutor_profile_id, client);
  return {
    ...info,
    rating: reviews.count ? reviews.average : null,
    reviewCount: reviews.count,
  };
};
export const saveTutorInformation = (values, client = getSupabaseClient()) =>
  request(
    "save_my_tutor_information",
    {
      p_bio: values.bio,
      p_expertise: values.expertise,
      p_skills: values.skills,
    },
    client,
  );
