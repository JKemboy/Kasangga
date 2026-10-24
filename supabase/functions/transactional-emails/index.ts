import { createClient } from "npm:@supabase/supabase-js@2";
import { processEmails } from "./worker.js";

async function sameSecret(a: string, b: string) {
  const digest = (value: string) =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  return (
    new Uint8Array(left).reduce(
      (diff, byte, i) => diff | (byte ^ new Uint8Array(right)[i]),
      0,
    ) === 0
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("EMAIL_WORKER_SECRET") || "";
  if (secret.length < 32)
    return new Response("Email worker is not configured", { status: 503 });
  if (
    !(await sameSecret(
      request.headers.get("x-email-worker-secret") || "",
      secret,
    ))
  )
    return new Response("Unauthorized", { status: 401 });
  const config = {
    apiKey: Deno.env.get("RESEND_API_KEY"),
    from: Deno.env.get("EMAIL_FROM"),
    appUrl: Deno.env.get("APP_URL"),
  };
  if (!config.apiKey || !config.from || !config.appUrl)
    return new Response("Email provider is not configured", { status: 503 });
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    return Response.json(await processEmails(client, config));
  } catch {
    return Response.json(
      { error: "Email processing failed; inspect the outbox and server logs" },
      { status: 500 },
    );
  }
});
