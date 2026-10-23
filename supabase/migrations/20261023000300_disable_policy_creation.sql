begin;
create or replace function public.save_admin_policy(p_id bigint, p_value jsonb, p_expected timestamptz default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare old_record public.policies%rowtype; result_id bigint; next_status text;
begin
  if not public.is_portal_admin() then raise exception 'An active administrator account is required.'; end if;
  if jsonb_typeof(p_value) is distinct from 'object' then raise exception 'Invalid policy details.'; end if;
  next_status := p_value->>'status';
  if length(btrim(coalesce(p_value->>'title',''))) not between 1 and 200
    or length(btrim(coalesce(p_value->>'category',''))) not between 1 and 100
    or length(btrim(coalesce(p_value->>'version',''))) not between 1 and 30
    or length(btrim(coalesce(p_value->>'document_owner',''))) not between 1 and 200
    or length(btrim(coalesce(p_value->>'content',''))) not between 1 and 50000
    or next_status is null or next_status not in ('active','draft','archived')
    or (next_status='active' and nullif(p_value->>'effective_date','') is null)
    or (coalesce(p_value->>'document_path','')<>'' and (length(p_value->>'document_path')>2000 or p_value->>'document_path' !~* '^https://')) then
    raise exception 'Complete the required policy fields, valid status and effective date for active policies.';
  end if;
  if p_id is null then raise exception 'Adding policies is disabled. Choose an existing policy to edit.'; end if;
    select * into old_record from public.policies where policy_id=p_id for update;
    if not found then raise exception 'Policy not found.'; end if;
    if p_expected is null or old_record.updated_at is distinct from p_expected then raise exception 'Policy changed. Reload it before saving.'; end if;
    update public.policies set title=btrim(p_value->>'title'),category=btrim(p_value->>'category'),version=btrim(p_value->>'version'),effective_date=nullif(p_value->>'effective_date','')::date,document_owner=btrim(p_value->>'document_owner'),status=next_status,document_path=nullif(p_value->>'document_path',''),content=btrim(p_value->>'content'),updated_by=auth.uid(),updated_at=clock_timestamp()
    where policy_id=p_id returning policy_id into result_id;
  insert into public.audit_logs(user_id,action,module,target_type,target_id,previous_value,new_value,result)
  values(auth.uid(),'Policy updated','policies','policies',result_id,to_jsonb(old_record)::text,p_value::text,'success');
  return result_id;
end $$;
revoke all on function public.save_admin_policy(bigint,jsonb,timestamptz) from public,anon;
grant execute on function public.save_admin_policy(bigint,jsonb,timestamptz) to authenticated;

commit;
