# Google registration and email OTP login

/register is Google-only. /login sends an email code using sendLearnerOtp in src/services/learnerOtp.js. It calls signInWithOtp with shouldCreateUser: false and no redirect option. verifyLearnerOtp calls verifyOtp with type: 'email' and requires a matching session. There is no password form or mock login.

Supabase performs the registered-account check; the frontend does not query public users by email. Some server configurations deliberately hide whether an account exists. A generic response is not proof of registration; login never enables account creation.

AuthProvider restores and observes the shared Supabase session. Protected routes require an active public.users profile and active user_roles entry. Learner is the default destination when available; Tutor-only accounts still reach Tutor. Google returns to /register and then Learner. Logout signs out through Supabase. Learner/Tutor local drafts are scoped to the user ID. Existing server RLS must enforce all permissions independently of UI guards.

## Manual setup (no SQL has been executed)

1. Keep VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env.local. Restart Vite after changes. No service-role or Google client secret belongs in Vite variables.
2. Enable Google in Supabase Authentication providers. Create a Google Web OAuth client, set the app origin (http://localhost:5173 in development), and add https://ywcryzbemmwsawzqybhg.supabase.co/auth/v1/callback as its authorized redirect URI. Put the client ID and secret in the Supabase provider settings. Configure consent screen/test users as necessary.
3. Set Supabase Site URL and add http://localhost:5173/register to the redirect allow list, plus the exact production /register URL when deployed. Host SPA fallback routes so refreshing /register works.
4. Keep email authentication enabled. In the Magic Link email template, use {{ .Token }} for the code instead of {{ .ConfirmationURL }}. Configure working custom SMTP; email rate limits still apply.
5. Review supabase/manual/default_learner_role.sql against existing triggers/policies, then run manually. It uses the supplied existing public.users and public.user_roles tables, adds a signup trigger, backfills verified CARSU accounts, and grants own-row SELECT access. It does not reactivate disabled roles or grant elevated roles. Do not give browser clients role-assignment write access. Google names may need completion in Profile if given_name/family_name are absent.
6. Review/run supabase/manual/carsu_signup_hook.sql and select require_carsu_signup under Authentication > Hooks > Before User Created. The Google hd parameter is only an account-picker hint; this server hook rejects new non-CARSU registrations. The frontend also rejects non-CARSU sessions. Review existing accounts/email-change policies separately; the signup hook only covers creation.
7. Keep schedule-uploads private and retain owner-folder Storage policies described in schedule-ocr.md.

## Verification

Automated tests cover normalized domain checks, login signup prevention, OTP/session validation, Google request configuration, and dashboard selection. Production build checks module integration. Real Google consent, email delivery, refresh, logout and database policy behavior require the configured Supabase project and a real CARSU account; no test email/account is created automatically.

Manual smoke test: Google-register a CARSU account; confirm Auth user, users profile, learner role and Learner Overview. Sign out; request OTP on /login; verify latest code; refresh dashboard; sign out and revisit a protected URL. Reject wrong domains and unknown login addresses without creating accounts. Check a tutor-enabled account still opens Tutor and uses its own schedule uploads.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google
