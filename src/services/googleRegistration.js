import { getSupabaseClient } from "./supabaseClient.js";
export const CAMPUS_TUTOR_TERMS_VERSION = "2026-11-09";
export async function registerWithGoogle(
  origin,
  acceptedTerms,
  client = getSupabaseClient(),
) {
  if (!acceptedTerms) throw new Error("Accept Terms & Conditions to register.");
  const { data: nonce, error: termsError } = await client.rpc(
    "prepare_terms_acceptance",
    { p_terms_version: CAMPUS_TUTOR_TERMS_VERSION },
  );
  if (termsError || !nonce)
    throw new Error(
      termsError?.message ||
        "Could not record your Terms & Conditions acceptance.",
    );
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL(`/register?terms_nonce=${nonce}`, origin).href,
      queryParams: { hd: "carsu.edu.ph", prompt: "select_account" },
    },
  });
  if (error) throw error;
}
