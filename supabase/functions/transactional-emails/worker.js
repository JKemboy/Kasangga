import { emailContent } from "./templates.js";

export async function processEmails(client, config, request = fetch) {
  const { data: jobs, error } = await client.rpc("claim_transactional_emails", {
    p_limit: 10,
  });
  if (error) throw new Error("Could not claim email jobs");
  const summary = { accepted: 0, retried: 0, failed: 0 };
  for (const job of jobs || []) {
    let result;
    try {
      const content = emailContent(job, config.appUrl);
      const response = await request("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `kasangga-email/${job.id}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: [job.recipient_email],
          ...content,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.id) {
        result = {
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_id: body.id,
          last_error: null,
        };
        summary.accepted++;
      } else {
        const retryable = response.status === 429 || response.status >= 500;
        result = {
          status: retryable ? "pending" : "failed",
          last_error: `Provider rejected request (HTTP ${response.status})`,
        };
        summary[retryable ? "retried" : "failed"]++;
      }
    } catch {
      // A timeout may have accepted the message. The same provider idempotency key
      // is reused; SQL stops retries before its 24-hour expiration.
      result = {
        status: "pending",
        last_error:
          "Email request did not complete; retry with the same idempotency key",
      };
      summary.retried++;
    }
    if (result.status === "pending")
      result.due_at = new Date(
        Date.now() + Math.min(60, 2 ** job.attempts) * 60000,
      ).toISOString();
    const { error: savedError } = await client
      .from("transactional_email_outbox")
      .update({ ...result, locked_at: null, lease_token: null })
      .eq("id", job.id)
      .eq("lease_token", job.lease_token)
      .eq("status", "processing");
    if (savedError) throw new Error("Could not record email delivery result");
    // Respect provider rate limits; the batch stays within Edge runtime limits.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return summary;
}
