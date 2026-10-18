# Schedule PDF/image OCR and private storage

The existing Tutor Availability & Schedule modal now accepts PDF, JPEG, PNG and WebP files up to 10 MiB. PDFs may contain up to 10 pages; longer PDFs are rejected rather than partially read. PDF.js renders each page to an image and Tesseract reads the pages sequentially, including scanned PDFs. OCR runs in a browser Tesseract worker (English), with progress and a local image preview. Engine/language downloads require internet access on the first run. No OCR server or Edge Function is used.

After recognition, the original file is uploaded to the existing private `schedule-uploads` bucket at `<profile-name>--<auth.users.id>/<random UUID>-<filename>.<extension>`. OCR parses course number, descriptive title, time, day(s), and room into editable review rows. The full recognized text is not displayed or stored in the schedule tables; personal and financial details elsewhere on the COR are ignored. The tutor must review and confirm every row before any class schedule records are written. Successful file uploads use `upsert: false`. Previous cloud files are downloaded with the authenticated client into temporary blob URLs; there are no public URLs.

## Configuration and authentication

This repository previously had no Supabase client. `src/services/supabaseClient.js` is the shared singleton. Copy `.env.example` to `.env.local`, set the project root URL (without `/rest/v1`) and publishable key, then restart Vite. The supplied development configuration has been placed in ignored `.env.local`; production needs these same environment variables configured separately. Never use a service-role key here.

Google registration and email OTP login use this shared client to create real Supabase sessions. See passwordless-auth.md for required dashboard configuration. `auth.getUser()` validates the user before OCR and again before upload; no user IDs are hardcoded.

Only the original file goes to Supabase Storage. On confirmation, the app inserts a `class_schedules` header and its confirmed `class_schedule_entries`, then marks the header confirmed. Partial writes are cleaned up and a failed save leaves the existing confirmed schedule unchanged. The dashboard loads the latest confirmed schedule from Supabase and uses its class times both in the Class Schedule table and as blocked times in Tutoring Availability. Learner booking-time choices exclude those blocks, and the payment handler checks for class conflicts again before creating a booking. Unconfirmed review rows remain in memory only; closing or leaving before confirmation discards them. Unreferenced images from discarded reviews may remain in private storage.

## Class schedule table policies (not executed)

The client-side writes require owner-scoped RLS on `class_schedules` and `class_schedule_entries`. The learner booking flow also calls the restricted `get_tutor_class_blocks` function, which returns only weekly time blocks for a verified tutor's latest confirmed schedule. The corresponding policies and function are included at the end of `supabase/manual/availability_slots_policies.sql`. Review the SQL and existing policies, then apply it in the Supabase SQL editor if equivalent policies are not already configured. The app does not execute SQL against the hosted project.

## Storage setup (run manually)

Run `supabase/manual/schedule_uploads_storage.sql` in Supabase SQL Editor. This fixes the missing Storage INSERT policy reported by the upload error. It keeps `schedule-uploads` private, allows PDF/JPEG/PNG/WebP up to 10 MiB, and provides a server-generated name folder based on the authenticated user's existing profile. Also run the class-table policies in `supabase/manual/availability_slots_policies.sql` if not already applied.

Example: `schedule-uploads/john-kirk-emboy--<user-uuid>/<file-uuid>-class-schedule.pdf`.

The user ID prevents collisions between people with the same name. Owner-only reads continue to support older UUID-only folders, including after a name change. Restrictive ownership guards prevent broad permissive policies from granting cross-user access. No public URLs, service-role credentials, local-save fallback, or OCR JSON files are used. Only the original schedule document is uploaded; reviewed rows and the exact source path are stored in class_schedules/class_schedule_entries. Saving verifies the private source object exists first.

The latest confirmed schedule and its source file reload from Supabase. Unconfirmed review rows are temporary React state, not browser persistence. The active dashboard does not store schedules in browser storage; Supabase manages login session persistence. Existing cloud objects are not moved or deleted automatically.

The SQL is not automatically applied to the hosted project. The RLS error will remain until the Storage policies are installed. Live verification requires an authenticated tutor and these policies.

Reference: [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
