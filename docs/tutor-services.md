# Tutor services database integration

The app uses the existing `public.services` and `public.service_topics` tables, with `tutor_profiles`, `users` and `user_roles` to identify the signed-in tutor. Learner directory reads use the narrowly scoped `find_tutor_services()` SQL function in `supabase/manual/find_tutor_services.sql` so learners can see verified tutor listings without granting broad read access to private columns in `public.users`.

Create, edit, status changes, and My Services reads use the Supabase client against the existing tables. Create/edit operations save topics in `service_topics`; the learner directory function returns active services only for profiles with `verification_status` `verified` or `approved`, active accounts, and active tutor roles. The function is executable only by authenticated users with an active learner role. The tutor must have an active account, active tutor role, and a `tutor_profiles` row. A tutor cannot edit another tutor's service or a suspended service.

Supabase Row Level Security must permit the signed-in tutor to read their own account, role and profile, and read/insert/update their own services and topics. The directory function bypasses table RLS only for its fixed, public tutor/service fields and verified listings; it does not expose learner or tutor private profile columns. Database permission errors are shown in the interface; no service-role key is used.

My Services and the dashboard's Create Service action save to Supabase and wait for the database response. Services are excluded from browser workspace persistence; old local demo services are ignored, not automatically imported. Find a Tutor loads database services and refreshes on mount/window focus.

The supplied `availability_slots` table contains recurring weekdays/times, not dated slots. Tutor availability is saved as weekly blocks, optionally linked to one active service. Learner booking choices are limited to active slots for the selected service and weekday, and the checkout function validates the slot again before creating a booking. Class-schedule OCR/review remains a separate workflow.

Verify in Supabase:

1. Run `supabase/manual/availability_slots_policies.sql` in Supabase SQL Editor to enable safe tutor writes and learner reads for public active tutor availability.
2. Sign in as an active tutor with a profile. Add a weekly availability block and check `availability_slots`.
3. Edit and remove the block; confirm edits persist after reload and removed blocks have `is_active = false`.
4. With a verified tutor profile, choose an active service and a day with an availability block in learner booking; confirm only matching time ranges are selectable.
5. Attempt to submit a time outside the selected slot; the Edge Function must reject it before checkout.
6. Confirm another tutor cannot view or edit private/inactive availability and a learner cannot change any slot.
