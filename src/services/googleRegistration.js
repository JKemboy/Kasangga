import { getSupabaseClient } from "./supabaseClient.js";
export async function registerWithGoogle(origin, client = getSupabaseClient()) {
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/register", origin).href,
      queryParams: { hd: "carsu.edu.ph", prompt: "select_account" },
    },
  });
  if (error) throw error;
}
