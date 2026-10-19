create table if not exists public.terms_acceptances (
  acceptance_id bigint generated always as identity primary key,
  acceptance_nonce uuid not null unique,
  user_id uuid references public.users(user_id) on delete set null,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  recorded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists terms_acceptances_user_version_idx
  on public.terms_acceptances (user_id, terms_version, accepted_at desc);

alter table public.terms_acceptances enable row level security;
revoke all on public.terms_acceptances from public, anon, authenticated;

drop function if exists public.record_terms_acceptance(text);
create or replace function public.prepare_terms_acceptance(
  p_terms_version text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  nonce uuid := gen_random_uuid();
begin
  if nullif(btrim(p_terms_version), '') is null or length(p_terms_version) > 40 then
    raise exception 'A valid Terms & Conditions version is required.';
  end if;
  insert into public.terms_acceptances(acceptance_nonce, terms_version)
  values (nonce, btrim(p_terms_version));
  return nonce;
end;
$$;

create or replace function public.record_terms_acceptance(
  p_nonce uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before recording terms acceptance.';
  end if;
  if not exists (
    select 1 from public.users
    where user_id = auth.uid() and account_status = 'active'
  ) then
    raise exception 'Active CampusTutor account not found.';
  end if;

  if exists (
    select 1 from public.terms_acceptances
    where acceptance_nonce = p_nonce and user_id = auth.uid()
  ) then
    return;
  end if;

  update public.terms_acceptances
  set user_id = auth.uid(), recorded_at = now()
  where acceptance_nonce = p_nonce
    and user_id is null
    and recorded_at is null
    and accepted_at > now() - interval '30 minutes';

  if not found then
    if exists (
      select 1 from public.terms_acceptances
      where acceptance_nonce = p_nonce and user_id = auth.uid()
    ) then
      return;
    end if;
    raise exception 'Terms acceptance could not be verified or has expired. Please register again.';
  end if;
end;
$$;

revoke all on function public.prepare_terms_acceptance(text) from public;
grant execute on function public.prepare_terms_acceptance(text) to anon, authenticated;
revoke all on function public.record_terms_acceptance(uuid) from public, anon;
grant execute on function public.record_terms_acceptance(uuid) to authenticated;
