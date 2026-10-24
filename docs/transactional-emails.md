# Gmail transactional email setup

The worker reuses the existing Supabase Auth Gmail account:
`leovinjozhsalarda@gmail.com`. Existing login/OTP settings remain unchanged.
It connects to `smtp.gmail.com:465` using implicit TLS, since Edge Functions
block outgoing port 587. See [Supabase limits](https://supabase.com/docs/guides/functions/limits)
and [Nodemailer SMTP](https://nodemailer.com/smtp).

## Events

| Recipient | Database event                               | Email                |
| --------- | -------------------------------------------- | -------------------- |
| Learner   | Payment becomes paid                         | Payment received     |
| Learner   | Booking becomes confirmed and paid           | Booking confirmation |
| Tutor     | Booking becomes confirmed and paid           | Booked session       |
| Both      | 24 hours before session, Asia/Manila         | Session reminder     |
| Tutor     | Admin records transferred_at on paid payment | Payment transferred  |

Reminders run every minute once scheduling is activated. Bookings made within
24 hours get confirmation only. Cancelled, completed, unpaid, refunded,
rescheduled or started sessions do not receive obsolete reminders. Historical
bookings/payments are not backfilled. PayMongo handlers are unchanged.

## Server secrets

Supabase Auth SMTP credentials are not exposed to Edge Functions. Reusing the
account requires separately setting these **Edge Function secrets**:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_USER=leovinjozhsalarda@gmail.com`
- `SMTP_PASSWORD`: Gmail App Password, entered privately in Supabase Secrets.
- `EMAIL_FROM=Kasangga <leovinjozhsalarda@gmail.com>`
- `APP_URL=https://kasangga-test.vercel.app`
- `EMAIL_WORKER_SECRET`: random, at least 32 characters; also stored in Vault.

Never put SMTP_PASSWORD in chat, Git, or VITE_ variables. Missing credentials
return 503 without claiming jobs. The worker verifies SMTP login before claiming;
authentication failure does not consume queued messages.

## Deployment

1. Apply only `supabase/migrations/20261024000100_transactional_email_outbox.sql`.
   It adds a private RLS-enabled queue and restricted event/claim functions.
   Do not blindly push unrelated migrations.
2. Deploy: `supabase functions deploy transactional-emails`.
3. Set the secrets above. In Vault configure `kasangga_email_worker_url` with
   `https://ywcryzbemmwsawzqybhg.supabase.co/functions/v1/transactional-emails`
   and `kasangga_email_worker_secret` with the same EMAIL_WORKER_SECRET value.
4. Verify SMTP login, then run `supabase/setup/transactional_email_schedule.sql`.
   Cron invokes the authenticated worker every minute. Restrict Vault and the HTTP
   request queue to database administrators.

## Delivery safety

Unique event keys deduplicate queue records. Claims use row locks and lease tokens.
Before SMTP sending, the worker persists `sending`. SMTP has no provider idempotency
keys: an interrupted or ambiguous result requires manual inspection and is never
blindly resent. Stable Message-ID aids inspection but does not guarantee recipient
deduplication. Only explicit SMTP 4xx rejection retries automatically, up to eight
attempts or 23 hours. Inspect Gmail Sent before manually retrying uncertain jobs.

`sent` means SMTP accepted the message, not guaranteed inbox delivery. HTTP callers
cannot specify recipients or content. Browser users cannot access the queue or its
privileged functions. Gmail limits/bounces still apply.

Pause: `select cron.unschedule('kasangga-transactional-emails');`.

## Validation

`node --test scripts/transactional-emails.test.mjs`

Tests mock SMTP and never email real users. Before claiming activation, verify
SMTP login and authorized test delivery, then check queued event types,
cancellation, reminders and transfer notification via the existing flows.
