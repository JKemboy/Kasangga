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
    .select("tutor_profile_id,application_id")
    .eq("user_id", auth.user.id)
    .single();
  if (error) throw new Error(error.message);
  if (!profile.application_id)
    throw new Error(
      "No approved application is linked to this tutor profile. Contact support.",
    );
  const { data: application, error: applicationError } = await client
    .from("tutor_applications")
    .select("application_details,application_status")
    .eq("application_id", profile.application_id)
    .eq("user_id", auth.user.id)
    .eq("application_status", "approved")
    .maybeSingle();
  if (applicationError)
    throw new Error(
      "Could not load approved tutor information: " + applicationError.message,
    );
  if (!application)
    throw new Error(
      "Approved tutor application information is unavailable. Contact support.",
    );
  const approved = application.application_details || {};
  const subjects = Array.isArray(approved.subjects)
    ? approved.subjects.filter(
        (subject) => typeof subject === "string" && subject.trim(),
      )
    : [];
  const skills = Object.values(approved.topics || {})
    .flat()
    .filter((value) => typeof value === "string")
    .join(", ");
  const reviews = await listTutorReviews(profile.tutor_profile_id, client);
  return {
    ...info,
    bio: approved.bio || "",
    expertise: subjects.join(", "),
    skills,
    approvedApplication: {
      subjects,
      courseCode: approved.courseCode || "",
      courseDescription: approved.courseDescription || "",
      experience: approved.experience || "",
      motivation: approved.motivation || "",
    },
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
