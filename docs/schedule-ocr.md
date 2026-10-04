# Schedule image OCR and private storage

The existing Tutor Availability & Schedule modal now accepts JPEG, PNG and WebP images up to 10 MiB. OCR runs in a browser Tesseract worker (English), with progress and a local image preview. Engine/language downloads require internet access on the first run. No OCR server or Edge Function is used.

After recognition, the original image is uploaded to the existing private `schedule-uploads` bucket at `<auth.users.id>/<random UUID>.<extension>`. Extracted text remains visible if upload fails; retry reuses it. Successful uploads use `upsert: false`. Previous cloud images are downloaded with the authenticated client into temporary blob URLs; there are no public URLs. OCR does not automatically create class entries. The existing manual class review remains available.

## Configuration and authentication

This repository previously had no Supabase client. `src/services/supabaseClient.js` is the shared singleton. Copy `.env.example` to `.env.local`, set the project root URL (without `/rest/v1`) and anon public key, then restart Vite. The supplied development configuration has been placed in ignored `.env.local`; production needs these same environment variables configured separately. Never use a service-role key here.

Login and registration now use the shared Supabase Auth client. See [supabase-auth.md](./supabase-auth.md) for provisioning, confirmation, and role setup. `auth.getUser()` validates the user before OCR and again before upload; no user IDs are hardcoded.

Only the original image goes to Supabase Storage. Review text, upload references and manual class entries still use the existing local workspace persistence. No writes to `class_schedules` or `class_schedule_entries` are implemented. Those require a separate database integration. Closing/leaving during an in-flight upload may leave a successfully uploaded object in Storage even if its local review was not saved.

## Manual Storage policies (not executed)

The supplied table schema does not describe Storage policies, and the publishable key cannot inspect policy definitions. Check existing policies first. Keep the bucket private. If equivalent owner-scoped policies do not exist, apply these in the Supabase SQL editor:

```sql
create policy "Schedule images: insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'schedule-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Schedule images: read own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'schedule-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
```

INSERT is needed for uploads; SELECT is needed to reopen previous private images. No UPDATE, DELETE or anonymous policies are required by this flow. These policies isolate authenticated users by folder; they do not enforce a Tutor role. If your backend requires Tutor-only access, add your existing authorized role predicate to both policies. Review existing permissive policies, which can otherwise grant broader access. Configure the bucket's allowed MIME types to `image/jpeg`, `image/png`, `image/webp` and maximum file size to 10 MiB as server-side validation.

No policies, bucket visibility, or database schema were changed automatically. Live upload and cross-account access testing requires real authenticated test users and configured policies.

References: [Tesseract.js](https://github.com/naptha/tesseract.js), [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
