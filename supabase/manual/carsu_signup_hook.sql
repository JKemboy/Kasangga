-- Review and run manually, then select this function in Authentication > Hooks > Before User Created.
create or replace function public.require_carsu_signup(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  if coalesce(event->'user'->>'email', '') !~* '^[^[:space:]@]+@carsu[.]edu[.]ph$' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Use your @carsu.edu.ph account.'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke execute on function public.require_carsu_signup(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.require_carsu_signup(jsonb) to supabase_auth_admin;
