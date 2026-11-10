# Kasangga local setup

## Requirements

- Git
- Node.js `20.19+` or `22.12+` (or newer) and npm
- Access to the configured Supabase project

## setup

-git init

-git remote add origin https://github.com/JKemboy/Campustutor.git

-git fetch

-git checkout main

-Copy-Item .env.example .env.local

-npm i or npm install
(kung nay vulnerability)
    -npm audit fix
    -npm install-scripts approve --all

-npm run build

-npm.cmd run dev

## Notification emails

The `transactional-emails` Edge Function sends queued email using SMTP. Secrets
belong in Supabase Edge Function Secrets, never in `VITE_` variables:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=Google App Password for that same account, without spaces
EMAIL_FROM=Kasangga <your-sender@gmail.com>
APP_URL=https://your-deployed-site.example
EMAIL_WORKER_SECRET=a private random secret of at least 32 characters
```

The existing `kasangga-transactional-emails` cron job calls the worker every
minute using `x-email-worker-secret`. Each run handles up to three emails.

The linked project already has the role-notification email SQL applied. Its
one-time SQL and database check files were removed after verification at the
user's request. Worker deployment remains:

```powershell
supabase functions deploy transactional-emails
```

This SQL extends the existing email queue; it requires the original queue and
booking/payment email functions to already exist. It mirrors future notification
inserts for active learner, tutor, LCO and OSWE recipients, excluding activity
read receipts. It also emails derived booking-chat messages, received reports
and completed sessions. New bookings, paid payments and tutor applications
create LCO in-app notifications and emails. Existing OSWE referrals and clearance
requests are emailed using that account's email preferences, independently of
its in-app switches. Existing LCO alert preferences also apply.

Recipients come from `users.csu_email`; active roles come from `user_roles`.
For multiple active roles, routing prioritizes LCO, OSWE, tutor, then learner.
Generic notification emails contain a sign-in link, never report, evidence or
message contents. Existing detailed booking/payment emails remain supported.
Historical notifications are not backfilled. This covers events listed above
and future notifications written to `notifications`; events that do not create
an inbox notification still need an explicit event integration.

Template checks: `node scripts/check-email-templates.mjs`.
The rollback-only database checks were previously completed; their SQL files
are no longer included in the working tree.

Troubleshooting: check Edge Functions → transactional-emails → Logs and
`transactional_email_outbox`. `535 / 5.7.8` means SMTP authentication was rejected.
`sent` means SMTP accepted the message; confirm delivery in Inbox or Spam.


