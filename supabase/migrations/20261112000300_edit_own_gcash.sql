begin;
create or replace function public.save_my_gcash_account(p_name text, p_number text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (
    select 1 from public.users u join public.user_roles r using(user_id)
    where u.user_id=uid and u.account_status='active'
      and r.is_active and r.role in ('learner','tutor')
  ) then raise exception 'An active learner or tutor account is required.'; end if;
  if coalesce(length(btrim(p_name)),0) not between 1 and 150 then
    raise exception 'Enter your GCash account name (up to 150 characters).';
  end if;
  if coalesce(p_number,'') !~ '^\+639[0-9]{9}$' then
    raise exception 'Enter a valid Philippine GCash mobile number.';
  end if;
  insert into public.account_gcash(user_id,gcash_name,gcash_number)
  values(uid,btrim(p_name),p_number)
  on conflict(user_id) do update set gcash_name=excluded.gcash_name,gcash_number=excluded.gcash_number;
  return jsonb_build_object('name',btrim(p_name),'number',p_number);
end;
$$;
revoke all on function public.save_my_gcash_account(text,text) from public;
grant execute on function public.save_my_gcash_account(text,text) to authenticated;
commit;
