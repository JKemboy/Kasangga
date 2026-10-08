# Saved Tutors

Run `supabase/manual/saved_tutors.sql` manually in Supabase SQL Editor after the existing `find_tutor_services.sql`. The supplied schema has no bookmark table; this adds `public.saved_tutors` with a composite learner/tutor primary key and save timestamp. No hosted SQL was run automatically.

RLS permits signed-in users to read/delete only their own bookmarks. Insert also requires that the tutor is visible through the existing learner directory, including its active-role/account and tutor-verification checks. Anonymous access and direct updates are not granted. No service-role key is used.

Save buttons use tutor profile IDs and the authenticated user's ID. Saves are confirmed by Supabase before the UI changes, duplicate saves are idempotent, and failures are shown without local fallback. The list refreshes on sign-in, page reload and window focus. Unavailable tutors remain removable with an unavailable placeholder; their obsolete details are not presented as current.

Legacy `saved` entries are removed from the current user's browser workspace record and are not imported. Other workspace data is unchanged. Bookmarks are excluded from subsequent local workspace writes.

After installation: save a tutor from Find a Tutor, verify a row in `saved_tutors`, reload or sign in in another browser, then remove it and verify the row disappears. A different learner must see only their own saves. Build, service tests and isolated PostgreSQL-compatible RLS checks pass; hosted end-to-end verification still requires installing the SQL.
