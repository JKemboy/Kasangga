# Supabase authentication setup

## Environment

Use `.env.local` (ignored by Git), or your deployment environment:

```
VITE_SUPABASE_URL=https://ywcryzbemmwsawzqybhg.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

The supplied values are already configured locally. Restart Vite after changing them. The shared client prefers `VITE_SUPABASE_ANON_KEY`, with the previous publishable-key variable as a compatibility fallback. Neither key grants admin access. Never add a service-role key to a Vite variable.

## Auth behavior

Login and Register now use passwordless email OTP. Register permits account creation; Login requires an existing account. Neither requests a password or name. A session is created after verifyOtp succeeds, not when the email is sent. Google sign-in uses the CSU Google account. Supabase restores the session on refresh and logout signs out the current browser session.

Google uses Supabase OAuth when enabled. Google controls its own verification challenges; the app does not force an extra OTP after OAuth. The existing recovery route is retained for older password accounts.

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

Only @carsu.edu.ph is accepted by the UI and portal guard. Enforce this on the backend using the hook below. Google hosted-domain parameters are hints, not security enforcement. OTP signup has no name metadata, so the provisioning SQL stores empty names until profile completion; Google may supply given/family name. Metadata never grants roles. Existing non-CSU accounts must be reviewed separately; the creation hook does not revoke existing users or prevent later email changes. Backend RLS must continue to enforce authorized access.

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

## Required passwordless setup

Enable Google in Authentication > Sign In / Providers, with your Google client ID/secret and authorized Supabase callback URL. Keep your app /login redirect allowlisted.

In Authentication > Email Templates > Magic Link, include `{{ .Token }}` so the email contains the code rather than only a magic link. Configure SMTP, OTP expiration and rate limits. Example body:

```html
<h2>CampusTutor verification code</h2>
<p>Your code: {{ .Token }}</p>
```

Review and run the following function manually, then select it under Authentication > Hooks > Before User Created. No remote configuration has been applied.

```sql
create or replace function public.require_carsu_signup(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  if coalesce(event->'user'->>'email', '') !~* '^[^[:space:]@]+@carsu[.]edu[.]ph$' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Only @carsu.edu.ph accounts may register.'));
  end if;
  return '{}'::jsonb;
end;
$$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.require_carsu_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.require_carsu_signup(jsonb) from public, anon, authenticated;
```

This hook covers new email and OAuth signups. Keep the earlier profile/role provisioning trigger: this restriction hook does not create profiles. Verify OTP delivery and Google login with a real CSU test account after setup.

References: [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).

## Learner email OTP implementation

The existing shared Login/Register card uses learnerOtp.js for email OTP. Register explicitly sets shouldCreateUser:true; Login explicitly sets false, never retries as signup and offers Register when Supabase reports an unknown account. Supabase may intentionally return generic responses to avoid account enumeration; the frontend does not query public email lists to bypass this.

Only a successful verifyOtp response containing a matching authenticated session is accepted. Email OTP sets a Learner destination before verification; a missing Learner role shows an account-setup message instead of redirecting to a different portal. Tutor route permissions and OAuth behavior remain unchanged.

Registration currently collects only email. Existing profiles are preserved; no client-side insert/upsert modifies profiles or roles. The existing users/user_roles schema and the reviewed provisioning trigger above must already be configured for new users. The trigger creates the profile under the real auth UUID and only the Learner role; OTP verification then permits authenticated profile reads. No duplicate tables or automatic schema changes were made.

Custom Gmail SMTP is configured in Supabase, not React. Check that the Magic Link email template contains {{ .Token }}, SMTP delivery and Auth rate limits. Backend domain restriction still requires the Before User Created hook above; review existing-user/email-change controls and RLS separately. The provider restores Supabase sessions after refresh, learner-dashboard requires an active Learner role, and logout calls Supabase signOut. No mock login flag is used.
