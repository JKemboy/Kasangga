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

## Required learner profile setup

Before using the new profile form, review and manually run `supabase/manual/learner_profile_setup.sql`. It adds `short_bio` and `study_interests` to existing `public.users` and a `complete_learner_profile(details jsonb)` RPC. The RPC only updates the authenticated active learner, checks verified CSU email and required fields, and cannot edit email, role, or account status. No SQL was executed automatically.

Incomplete learner accounts (including existing accounts missing these fields) see a required popup. Dashboard, Settings, Help & Support, and Logout remain available; other navigation items stay visible and locked. The shared popup can be closed without unlocking restricted sections and reopened with Complete Profile. Successful saving reloads the database profile and unlocks the requested dashboard. Completion is derived from saved fields, not browser storage. Full name is stored using the existing first_name/last_name columns by splitting at the first space.

The gate is an interface restriction. Any future server booking/messaging mutations must enforce profile completeness in their own RPC/RLS policies as well. Existing non-learner staff roles are not subject to learner onboarding.

## Student ID images during initial profile setup

The initial setup form accepts separate front/back JPEG, PNG or WebP images (10 MiB each). Selection shows previews only; Extract ID Details explicitly starts sequential browser-side Tesseract OCR. There is no camera or live scanning. Only name, student ID, program and college are suggested. Raw OCR text for each side remains reviewable. Unknown/unlabelled values must be completed manually; OCR does not verify identity or ID authenticity. Year level, phone, bio and interests stay manual. Email comes from the authenticated CARSU account and cannot be replaced by ID text.

For OCR-assisted completion, both images must be processed and the review checkbox confirmed before initial profile submission. The explicit manual-entry option allows completion when OCR or ID images are unavailable. Closing the modal discards the images and OCR review state; corrected form values remain while the setup page is mounted. Images and raw text are held only in memory, never uploaded to schedule-uploads, localStorage or a server. Only the reviewed profile fields are saved through the existing complete_learner_profile RPC. No additional schema change or package installation is required. Existing completed profiles do not need to repeat onboarding. The OCR review gate is a UI workflow, not a server identity-verification control.

The Profile screen uses saved account values instead of placeholder identity/academic text. Its editable sections now save through the existing profile RPC and reload the Supabase profile.

## CSU college/program catalogue

`src/data/collegeProgramMap.js` is the single source of truth, based on the supplied project catalogue (including majors/departments and AY 2026-2027 Architecture/Mechanical Engineering). The setup form shows full names in College and dependent Program selects; changing College clears Program. Internal codes remain in the catalogue/OCR result; existing users.college and users.program columns store canonical names. No new table or column is required.

OCR recognizes bounded codes and full names, separators/case/spacing, and limited I/1 or O/0 substitutions. A unique program can identify its college; conflicting/multiple detected colleges or programs yield no academic suggestion. Student-ID detection supports the supplied 231-01293 format and older four-digit-prefix IDs. Existing nonempty/length/uniqueness validation remains; no universal student-ID format is invented. Names remain reviewable.

Review and re-run `supabase/manual/learner_profile_setup.sql` to install the updated RPC allow-list check. This file was generated locally, not executed. Regenerate its marked validation block with `node scripts/generate-academic-validation.mjs` after changing the catalogue; its consistency is tested. Unknown legacy academic values will require manual selection during setup.

Tests cover all requested example pairs, code collisions, OCR variations, conflicting sides, the example 231-01293 ID, manual validation and generated SQL consistency. Google registration and email OTP calls are unchanged. Real browser OCR and live RPC execution still require testing with actual images and the configured project.
