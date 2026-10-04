# Supabase authentication setup

## Environment

Use `.env.local` (ignored by Git), or your deployment environment:

```
VITE_SUPABASE_URL=https://ywcryzbemmwsawzqybhg.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

The supplied values are already configured locally. Restart Vite after changing them. The shared client prefers `VITE_SUPABASE_ANON_KEY`, with the previous publishable-key variable as a compatibility fallback. Neither key grants admin access. Never add a service-role key to a Vite variable.

## Auth behavior

Email/password login uses `signInWithPassword`. Registration uses `signUp` with first/last name metadata; it never accepts a role from the browser. With email confirmation enabled, signup creates an Auth user but **no session until confirmation/login**. Password login creates a real persistent Supabase session. The shared provider restores it and listens for refresh/sign-out changes. Logout signs out the current browser session.

Google uses Supabase OAuth if you enable the Google provider. Forgot Password sends a Supabase recovery email to `/reset-password`. The former Remember me checkbox is now Show password: Supabase sessions persist consistently rather than offering a nonfunctional persistence toggle.

Dashboard access requires an active `public.users` profile and a matching active `public.user_roles` row. Supported roles are exactly `learner`, `tutor`, `admin`, `osas`; default routing prioritizes admin, OSAS, tutor, then learner. Missing profiles/roles and database errors fail closed with a retry/sign-out screen. Browser-editable user metadata never grants a role. Client route checks are not a replacement for backend RLS.

## Existing tables and manual SQL

The supplied schema already includes `public.users` (profile details and account status) and `public.user_roles` (authorized roles). Auth alone handles email/password/session; the profile fields require these additional tables. Do not recreate them. No SQL has been executed by this implementation.

Review existing policies/triggers before applying the following setup. Merge with an existing provisioning trigger rather than installing duplicate provisioning logic. The example below grants only Learner to new users; Tutor/Admin/OSAS must be assigned through trusted administration.

```sql
alter table public.users enable row level security;
alter table public.user_roles enable row level security;

grant select on public.users, public.user_roles to authenticated;

create policy "Users read own profile"
on public.users for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users read own roles"
on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.provision_campustutor_account()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.users (user_id, csu_email, first_name, last_name)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name', '')
  ) on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role, is_active)
  select new.id, 'learner', true
  where not exists (
    select 1 from public.user_roles where user_id = new.id and role = 'learner'
  );
  return new;
end;
$$;

revoke execute on function public.provision_campustutor_account() from public, anon, authenticated;

create trigger provision_campustutor_account_after_signup
after insert on auth.users
for each row execute function public.provision_campustutor_account();
```

This trigger handles new users only. Existing Auth users need matching `users` profiles and role rows provisioned manually with their real Auth UUIDs. Check unique `csu_email` / `student_id` constraints before backfilling. Assign an active `tutor` role to approved tutors; retain `learner` if they should use both portals. Do not allow authenticated clients to insert/update their own roles or `account_status`. Review existing permissive policies for privilege escalation. Keep required existing administrator policies when merging this setup.

Name metadata is for display only. The email/password registration form accepts `carsu.edu.ph` and `csu.edu.ph`, matching existing project conventions. If CSU-only accounts are mandatory, enforce your institution's exact domain list in a Supabase Before User Created hook or equivalent trusted backend check, including OAuth. A browser validation alone is not enforcement. Configure Google only after deciding the same institution policy. Profile email synchronization after future Auth email changes is a separate backend concern.

## Private schedule storage

Keep `schedule-uploads` private. The existing flow uses the current verified Auth user and UUID file names: `<user-id>/<uuid>.<extension>`. OCR remains in the browser. Required owner-scoped INSERT and SELECT policies and MIME/size settings are in [schedule-ocr.md](./schedule-ocr.md). No anonymous/public access or service-role key is used. If Tutor-only uploads are required, add a trusted active-role/account-status check to Storage policies as well; route guards alone do not secure API requests.

## Supabase Dashboard checklist

1. Enable email/password signups and choose email confirmation settings. Configure production SMTP and email templates.
2. Set Site URL and allowed redirect URLs for development/production `/login` and `/reset-password`.
3. Apply/reconcile the reviewed profile provisioning and SELECT policies above. Provision existing accounts and approved Tutor roles.
4. Configure private Storage policies and limits from schedule-ocr.md.
5. Optionally enable Google OAuth and configure Google's authorized Supabase callback URL.
6. Test real registration, confirmation, login, refresh, logout, denied Tutor access for a Learner, and uploads with two separate approved tutors. Verify that one tutor cannot read another's files.

The app's remaining domain data and draft persistence are not migrated to Supabase. Learner/Tutor drafts are now partitioned by user UUID, but browser storage is still local prototype persistence. No account was created, email sent, bucket changed or schema migration executed during automated verification. Live tests require configured accounts and dashboard settings.

References: [Supabase signup](https://supabase.com/docs/reference/javascript/auth-signup), [user data](https://supabase.com/docs/guides/auth/managing-user-data), [auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).
