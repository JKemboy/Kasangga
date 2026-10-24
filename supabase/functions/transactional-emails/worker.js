import { emailContent } from "./templates.js";

export async function processEmails(client, config, send) {
  const { data: jobs, error } = await client.rpc("claim_transactional_emails", {
    p_limit: 3,
  });
  if (error) throw new Error("Could not claim email jobs");
  const summary = { accepted: 0, retried: 0, failed: 0 };
  for (const job of jobs || []) {
    let content;
    try {
      content = emailContent(job, config.appUrl);
    } catch {
      throw new Error("Invalid stored email content; inspect the outbox");
    }
    // Persist sending BEFORE SMTP: SMTP has no idempotency guarantee. A crash
    // after acceptance must never cause an automatic duplicate on lease recovery.
    const { data: claimed, error: claimError } = await client
      .from("transactional_email_outbox")
      .update({ status: "sending" })
      .eq("id", job.id)
      .eq("lease_token", job.lease_token)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error("Could not reserve SMTP delivery");
    if (!claimed) continue;
    let result;
    try {
      const info = await send({
        from: config.from,
        to: job.recipient_email,
        ...content,
        messageId: `<kasangga-${job.id}@${new URL(config.appUrl).hostname}>`,
      });
      if (
        !info.accepted?.some(
          (email) =>
            String(email).toLowerCase() === job.recipient_email.toLowerCase(),
        )
      )
        throw new Error("SMTP did not confirm recipient acceptance");
      result = {
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_id: info.messageId,
        last_error: null,
      };
      summary.accepted++;
    } catch (error) {
      // Only an explicit SMTP 4xx rejection is known not to have been accepted.
      // Timeouts/disconnects after DATA are ambiguous: require manual inspection.
      const code = Number(error?.responseCode);
      const retryable = code >= 400 && code < 500;
      result = {
        status: retryable ? "pending" : "failed",
        last_error: retryable
          ? `SMTP temporarily rejected delivery (${code}); safe to retry`
          : code >= 500
            ? `SMTP rejected delivery (${code})`
            : "SMTP result uncertain; inspect sender Sent folder before manually retrying",
      };
      summary[retryable ? "retried" : "failed"]++;
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
      .eq("status", "sending");
    if (savedError) throw new Error("Could not record email delivery result");
  }
  return summary;
}
