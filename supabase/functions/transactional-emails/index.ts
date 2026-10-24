import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@7.0.13";
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
    from: Deno.env.get("EMAIL_FROM"),
    appUrl: Deno.env.get("APP_URL"),
  };
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");
  const port = Number(Deno.env.get("SMTP_PORT") || 465);
  if (!host || !user || !pass || !config.from || !config.appUrl)
    return new Response("SMTP credentials are not configured", { status: 503 });
  if (port !== 465)
    return new Response("Use SMTP port 465 with implicit TLS", { status: 503 });
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    logger: false,
    debug: false,
  });
  try {
    // Verify without sending before claiming any jobs; bad credentials do not
    // consume the delivery queue or change booking/payment state.
    await transport.verify();
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    return Response.json(
      await processEmails(
        client,
        config,
        (message: {
          from: string;
          to: string;
          subject: string;
          text: string;
          html: string;
          messageId: string;
        }) => transport.sendMail(message),
      ),
    );
  } catch {
    return Response.json(
      { error: "Email processing failed; inspect the outbox and server logs" },
      { status: 500 },
    );
  } finally {
    transport.close();
  }
});
