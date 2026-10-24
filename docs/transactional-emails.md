# Transactional email setup

Implementation is separate from PayMongo. No browser secrets or local storage.
The provider and sender must be configured before enabling this service.

## Events

| Recipient | Database event | Email |
| --- | --- | --- |
| Learner | Payment changes to paid | Payment received |
| Learner | Booking becomes confirmed and paid | Booking confirmation |
| Tutor | Booking becomes confirmed and paid | Booked session |
| Both | 24 hours before the session in Asia/Manila | Session reminder |
| Tutor | Paid payment has transferred_at recorded by Admin | Payment transferred |

Reminders are checked every minute. Bookings made within 24 hours receive the
confirmation only. Cancelled, completed, unpaid, refunded, rescheduled and already
started bookings do not receive obsolete reminders. Payment transfers report the
stored tutor allocation; no allocation is invented if it is unavailable.

## Activation

1. Configure a Resend account and verify your sender domain. This implementation
   uses [Resend's send API](https://resend.com/docs/api-reference/emails/send-email).
   Supabase Auth SMTP configuration alone does not send these transactional emails.
2. Add **Edge Function secrets**, never `VITE_` environment variables:
   `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Kasangga <notifications@your-verified-domain>`),
   `EMAIL_WORKER_SECRET` (random, at least 32 characters), and `APP_URL`
   (`https://kasangga-test.vercel.app`). Existing Supabase service credentials are
   injected into the worker by Supabase. Do not alter the PayMongo secrets.
3. Apply only `supabase/migrations/20261024000100_transactional_email_outbox.sql`
   after review. It adds one private RLS-enabled outbox table, restricted helper
   functions, and two event triggers; it does not rewrite existing tables or send
   historical emails. Do not blindly push unrelated migrations.
4. Deploy: `supabase functions deploy transactional-emails`.
5. In Supabase Vault add `kasangga_email_worker_url` with the full function URL
   `https://<project-ref>.supabase.co/functions/v1/transactional-emails`, and
   `kasangga_email_worker_secret` with the same value as `EMAIL_WORKER_SECRET`.
6. Run `supabase/setup/transactional_email_schedule.sql` to enable a once-per-minute
   Cron job. The scheduler follows the [Supabase Cron/Edge Function pattern](https://supabase.com/docs/guides/functions/schedule-functions).
   Only database administrators should have access to Vault and the HTTP queue.

## Verification and operations

- Use an authorized test booking and test payment. Verify exactly one payment
  receipt, one learner confirmation and one tutor booking email.
- Use a future test session for the reminder; check both recipients and cancel a
  second test session to verify its reminder is skipped.
- Record a test transfer via the existing Admin flow; confirm the tutor email.
- Inspect outbox status and provider logs. `sent` means accepted by the provider,
  not guaranteed inbox delivery. Bounces are visible in provider logs.
- Unique event keys prevent duplicate queue records. Atomic leases prevent normal
  overlapping workers. Provider idempotency keys protect ambiguous timeout retries.
  [Resend retains keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys);
  retries stop after eight attempts or 23 hours from first attempt. Failed jobs
  require inspection before manual intervention; never blindly requeue old jobs.
- To pause sending: `select cron.unschedule('kasangga-transactional-emails');`.
  Existing booking/payment functionality remains independent of the email worker.
- No authenticated browser user can read/write the queue or invoke its privileged
  functions. The worker authenticates a dedicated server-only secret and reads no
  recipient or message from the HTTP request body.

## Local checks

`node --test scripts/transactional-emails.test.mjs`

These tests use mocked delivery and do not email real users.
