# Connected flow verification — October 24, 2026

## Recheck — October 26, 2026

- All 27 automated tests and the production build passed.
- GitHub reports a successful Vercel deployment for commit `17712e2`.
- `https://kasangga-test.vercel.app`, its JavaScript/CSS assets, section URLs, and `/login` returned HTTP 200.
- The deployed bundle includes the current policy dropdown, Case Action flow, and OSAS About Me screens. It uses the same linked Supabase project as local development. Different build asset hashes alone do not establish an outdated deployment; this supersedes the deployment uncertainty below.
- All seven October 24 migrations and the required report, cancellation, OSAS, and notification-read RPCs are present in Supabase.
- Anonymous HTTP calls to those four protected RPCs correctly return HTTP 401. Auth settings are reachable.
- Live-schema rollback tests passed again for learner/tutor cancellation, paid refund review, permissions, notification deduplication, and the connected OSAS decision/hold/My Reports/completion/release flow. Case tests used a temporary fixture because existing cases had progressed; the fixture and mutations were rolled back.
- Actual signed-in browser interaction across every role remains unverified. No real payment or refund was sent.
- `SMTP_PASSWORD` is still missing from Edge Function secrets. Actual email delivery remains blocked by this configuration.

## Earlier verification

Verified against the linked Supabase project, with test mutations rolled back:

- Learner and tutor can cancel their own booking; unrelated users cannot.
- Cancellation requires acknowledgement, preserves payment state, and queues paid amounts for Admin refund review. A repeated cancellation creates no duplicate notifications.
- OSAS review start persists once. Unvalidated evidence prevents progression to a decision.
- Recording a decision with a condition creates an active clearance hold.
- The reported student's My Reports receives that hold and their own case decision without reporter identity or statement.
- OSAS cannot release a hold before condition completion. Verified completion followed by release removes the active hold from My Reports.

Fixes made during verification:

- Added the missing `cancel_chat_session` RPC used by both learner and tutor.
- Kept completed conditional decisions at Clearance Effect while an actual hold remains active, regardless of the decision outcome label.
- Broadcast session updates after tutor cancellation/report actions so connected views can refresh.

Local verification: production build and all 26 automated tests passed.

Remaining external checks:

- The public Vercel domain returned HTTP 200, but its JavaScript/CSS asset names differed from the current production build. Latest deployment and signed-in browser flows remain unverified; this environment has no Vercel authentication.
- `SMTP_PASSWORD` is absent from Edge Function secrets, and the email scheduler is inactive. Actual email delivery and scheduled reminders are not verified or enabled.
- No real payment, refund, email, or permanent test decision was sent as part of these checks. Existing PayMongo integration was unchanged.
