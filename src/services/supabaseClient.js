import { createClient } from "@supabase/supabase-js";

let client;
export function getSupabaseClient() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase is not configured. Set the Vite Supabase environment variables and restart the app.",
    );
  client = createClient(url.replace(/\/rest\/v1\/?$/, ""), key);
  return client;
}
