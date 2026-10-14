import { getSupabaseClient } from "./supabaseClient.js";
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
export const loadTutorInformation = (client = getSupabaseClient()) =>
  request("get_my_tutor_information", {}, client);
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
