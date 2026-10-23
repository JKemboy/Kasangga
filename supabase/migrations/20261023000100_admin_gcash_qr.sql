begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gcash-qr', 'gcash-qr', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy gcash_qr_admin_guard on storage.objects as restrictive
for all to authenticated
using (bucket_id <> 'gcash-qr' or public.is_portal_admin())
with check (bucket_id <> 'gcash-qr' or public.is_portal_admin());

create policy gcash_qr_read on storage.objects for select to authenticated
using (bucket_id = 'gcash-qr' and public.is_portal_admin());
create policy gcash_qr_upload on storage.objects for insert to authenticated
with check (bucket_id = 'gcash-qr' and public.is_portal_admin()
  and name ~ '^qr/[0-9a-f-]{36}[.](png|jpg|webp)$');
create policy gcash_qr_remove on storage.objects for delete to authenticated
using (bucket_id = 'gcash-qr' and public.is_portal_admin());
create policy gcash_qr_protect_current on storage.objects as restrictive
for delete to authenticated
using (bucket_id <> 'gcash-qr' or not exists (
  select 1 from public.system_settings
  where setting_key = 'gcash_qr_path' and setting_value = objects.name
));

create function public.save_admin_gcash_qr(p_path text, p_expected_path text default null)
returns text language plpgsql security definer set search_path = ''
as $$
declare previous_path text;
begin
  if not public.is_portal_admin() then
    raise exception 'An active administrator account is required.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gcash_qr_path', 0));
  select setting_value into previous_path from public.system_settings
  where setting_key = 'gcash_qr_path' for update;
  if previous_path is distinct from p_expected_path then
    raise exception 'The QR code changed. Reload the current QR code before replacing it.';
  end if;
  if p_path is null or p_path !~ '^qr/[0-9a-f-]{36}[.](png|jpg|webp)$'
    or not exists (select 1 from storage.objects where bucket_id = 'gcash-qr'
      and name = p_path and metadata->>'mimetype' in ('image/png','image/jpeg','image/webp')
      and (metadata->>'size')::bigint between 1 and 5242880) then
    raise exception 'Upload a valid QR image of up to 5 MB first.';
  end if;
  insert into public.system_settings (setting_key, setting_value, setting_group, updated_by, updated_at)
  values ('gcash_qr_path', p_path, 'payments', auth.uid(), now())
  on conflict (setting_key) do update set setting_value = excluded.setting_value,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  return previous_path;
end;
$$;
revoke all on function public.save_admin_gcash_qr(text,text) from public, anon;
grant execute on function public.save_admin_gcash_qr(text,text) to authenticated;

commit;
