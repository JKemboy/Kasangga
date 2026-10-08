# Tutor services database integration

The app uses the existing `public.services` and `public.service_topics` tables, with `tutor_profiles`, `users` and `user_roles` to identify the signed-in tutor. Learner directory reads use the narrowly scoped `find_tutor_services()` SQL function in `supabase/manual/find_tutor_services.sql` so learners can see verified tutor listings without granting broad read access to private columns in `public.users`.

Create, edit, status changes, and My Services reads use the Supabase client against the existing tables. Create/edit operations save topics in `service_topics`; the learner directory function returns active services only for profiles with `verification_status` `verified` or `approved`, active accounts, and active tutor roles. The function is executable only by authenticated users with an active learner role. The tutor must have an active account, active tutor role, and a `tutor_profiles` row. A tutor cannot edit another tutor's service or a suspended service.

Supabase Row Level Security must permit the signed-in tutor to read their own account, role and profile, and read/insert/update their own services and topics. The directory function bypasses table RLS only for its fixed, public tutor/service fields and verified listings; it does not expose learner or tutor private profile columns. Database permission errors are shown in the interface; no service-role key is used.

My Services and the dashboard's Create Service action save to Supabase and wait for the database response. Services are excluded from browser workspace persistence; old local demo services are ignored, not automatically imported. Find a Tutor loads database services and refreshes on mount/window focus.

The supplied `availability_slots` table contains recurring weekdays/times, not dated slots. The old service form's local-only date editor has been removed to avoid silently saving schedules only in the browser or converting individual dates into recurring availability. This change connects service details/topics/discovery only; the separate scheduling and booking flows are not migrated here.

Verify in Supabase:

1. Run `supabase/manual/find_tutor_services.sql` in Supabase SQL Editor.
2. Sign in as an active tutor with a profile. Create a service and check `services` and `service_topics`.
3. Reload My Services; edit its title/rate/topics and reload again.
4. With a verified tutor profile, open the learner Find a Tutor page and check its card/profile/services.
5. Deactivate the service; revisit/focus Find a Tutor and verify it disappears. Reactivate and verify it returns.
6. Confirm a different tutor cannot edit it and suspended services cannot be reactivated.
