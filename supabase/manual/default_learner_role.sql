-- Run manually in the Supabase SQL Editor as the project database owner.
-- Uses the existing public.users and public.user_roles tables.
-- Adds missing records; does not reactivate disabled accounts/roles or grant elevated roles.
begin;

lock table public.users, public.user_roles in share row exclusive mode;

create or replace function public.provision_campustutor_account()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(new.email, '') !~* '^[^[:space:]@]+@carsu[.]edu[.]ph$' then
    return new;
  end if;

  insert into public.users (user_id, csu_email, first_name, last_name, email_verified_at)
  values (
    new.id, lower(new.email),
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name', ''),
    new.email_confirmed_at
  ) on conflict (user_id) do nothing;

  -- Serializes provisioning of this user without requiring a new unique constraint.
  perform 1 from public.users where user_id = new.id for update;
  insert into public.user_roles (user_id, role, is_active)
  select new.id, 'learner', true
  where exists (select 1 from public.users where user_id = new.id and account_status = 'active')
    and not exists (select 1 from public.user_roles where user_id = new.id and role = 'learner');
  return new;
end;
$$;

revoke execute on function public.provision_campustutor_account() from public, anon, authenticated;

-- Replaces only the trigger previously documented by this project.
drop trigger if exists provision_campustutor_account_after_signup on auth.users;
create trigger provision_campustutor_account_after_signup
after insert on auth.users
for each row execute function public.provision_campustutor_account();

-- Repair already registered, verified CSU accounts, preserving existing profile data.
insert into public.users (user_id, csu_email, first_name, last_name, email_verified_at)
select a.id, lower(a.email),
  coalesce(a.raw_user_meta_data->>'first_name', a.raw_user_meta_data->>'given_name', ''),
  coalesce(a.raw_user_meta_data->>'last_name', a.raw_user_meta_data->>'family_name', ''),
  a.email_confirmed_at
from auth.users a
where a.email ~* '^[^[:space:]@]+@carsu[.]edu[.]ph$'
  and a.email_confirmed_at is not null
on conflict (user_id) do nothing;

insert into public.user_roles (user_id, role, is_active)
select u.user_id, 'learner', true
from public.users u join auth.users a on a.id = u.user_id
where a.email ~* '^[^[:space:]@]+@carsu[.]edu[.]ph$'
  and a.email_confirmed_at is not null
  and u.account_status = 'active'
  and not exists (select 1 from public.user_roles r where r.user_id = u.user_id and r.role = 'learner');

alter table public.users enable row level security;
alter table public.user_roles enable row level security;
grant select on public.users, public.user_roles to authenticated;

-- Read only: the browser cannot assign roles through these policies.
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile" on public.users for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users read own roles" on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));

commit;

-- Verify the backfill without exposing email addresses.
select role, is_active, count(*) from public.user_roles group by role, is_active;
