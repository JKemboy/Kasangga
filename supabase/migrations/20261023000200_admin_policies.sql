begin;
alter table public.policies add column if not exists content text not null default '';
create policy admin_read_policies on public.policies for select to authenticated using (public.is_portal_admin());
create function public.save_admin_policy(p_id bigint, p_value jsonb, p_expected timestamptz default null)
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
  if p_id is null then
    insert into public.policies(title,category,version,effective_date,document_owner,status,document_path,content,created_by,updated_by)
    values(btrim(p_value->>'title'),btrim(p_value->>'category'),btrim(p_value->>'version'),nullif(p_value->>'effective_date','')::date,btrim(p_value->>'document_owner'),next_status,nullif(p_value->>'document_path',''),btrim(p_value->>'content'),auth.uid(),auth.uid())
    returning policy_id into result_id;
  else
    select * into old_record from public.policies where policy_id=p_id for update;
    if not found then raise exception 'Policy not found.'; end if;
    if p_expected is null or old_record.updated_at is distinct from p_expected then raise exception 'Policy changed. Reload it before saving.'; end if;
    update public.policies set title=btrim(p_value->>'title'),category=btrim(p_value->>'category'),version=btrim(p_value->>'version'),effective_date=nullif(p_value->>'effective_date','')::date,document_owner=btrim(p_value->>'document_owner'),status=next_status,document_path=nullif(p_value->>'document_path',''),content=btrim(p_value->>'content'),updated_by=auth.uid(),updated_at=clock_timestamp()
    where policy_id=p_id returning policy_id into result_id;
  end if;
  insert into public.audit_logs(user_id,action,module,target_type,target_id,previous_value,new_value,result)
  values(auth.uid(),case when p_id is null then 'Policy created' else 'Policy updated' end,'policies','policies',result_id,to_jsonb(old_record)::text,p_value::text,'success');
  return result_id;
end $$;
revoke all on function public.save_admin_policy(bigint,jsonb,timestamptz) from public,anon;
grant execute on function public.save_admin_policy(bigint,jsonb,timestamptz) to authenticated;

-- Import the eight reference documents supplied by the user, preserving their source dates/statuses.
-- Existing matching policy titles are left intact.
do $$
declare administrator uuid; item jsonb; imported integer := 0;
begin
  select u.user_id into administrator from public.users u join public.user_roles r using(user_id)
  where r.role='admin' and r.is_active and u.account_status='active' order by r.assigned_at limit 1;
  if administrator is null then raise exception 'An active Admin is required to own the imported policy records.'; end if;
  for item in select value from jsonb_array_elements($reference$[{"title":"Student Code of Conduct","category":"Student Conduct","version":"v2.1","effective_date":"2026-01-15","document_owner":"Office of Student Affairs and Services","status":"active","updated_at":"2026-09-10","content":"## Purpose\n\nSets expectations for respectful, honest, and safe conduct by CSU students, including when they use Kasangga as tutors or learners.\n\n## Scope\n\nApplies to interactions arranged through Kasangga, whether online (external Google Meet or Zoom) or in person on campus.\n\n## Expected conduct\n\n- Treat others with respect in messages and sessions.\n- Uphold academic integrity; tutors guide, they do not complete graded work.\n- Keep personal information private and use approved campus locations for in-person sessions.\n\n## Due process\n\nAn incident report is an allegation. No sanction is applied unless OSAS completes a review under the Institutional Case Review Procedure and records a decision."},{"title":"Incident Reporting and Referral Guidelines","category":"Incident Reporting","version":"v1.6","effective_date":"2026-02-01","document_owner":"OSAS Case Management Unit","status":"active","updated_at":"2026-09-08","content":"## Purpose\n\nDescribes how Kasangga incident reports reach OSAS and when a formal case is opened.\n\n## Referral\n\n- Platform administration refers conduct, safety, and academic-integrity matters to OSAS.\n- Technical or platform-only issues remain under Admin handling and are not referred.\n\n## Assessment\n\nOSAS assesses each referral and records whether a formal case is required. A referral is not a finding of responsibility.\n\n## Update (v1.6)\n\nClarifies that reporters are notified when OSAS decides not to open a formal case."},{"title":"Evidence Handling and Validation Procedure","category":"Evidence Handling","version":"v1.4","effective_date":"2026-03-01","document_owner":"OSAS Case Management Unit","status":"active","updated_at":"2026-09-05","content":"## Purpose\n\nStandardizes how OSAS reviewers assess submitted evidence.\n\n## Validation criteria\n\n- Readability\n- Context completeness\n- Relevance to the case\n- Source verification, where applicable\n- Signs of manipulation, where review procedures support it\n\n## Results\n\nValidated, Requires Clarification, or Insufficient. Reviewer notes are required for every result other than Validated.\n\n## Automated processing\n\nOCR or automated tools may help organize evidence but do not prove authenticity or establish misconduct."},{"title":"Institutional Case Review Procedure","category":"Case Review Procedures","version":"v2.0","effective_date":"2026-04-15","document_owner":"Office of Student Affairs and Services","status":"active","updated_at":"2026-08-28","content":"## Workflow\n\nIncident Report ? OSAS Referral ? Formal Case ? Evidence Validation ? Case Review ? Case Actions ? Case Decision ? Clearance Effect where applicable ? Resolution ? Archive.\n\n## Impartiality\n\nCase officers document actions and notes neutrally and describe allegations as allegations until a decision is recorded.\n\n## Decisions\n\n- No Violation\n- Case Dismissed\n- Counseled\n- Verbal Warning\n- Written Warning\n- Referred for Further Action\n- Clearance Hold Recommended\n\n## Records\n\nEvery decision requires a written basis and a policy reference."},{"title":"Student Clearance Review Guidelines","category":"Student Clearance","version":"v1.3","effective_date":"2026-06-01","document_owner":"OSAS Clearance Unit","status":"active","updated_at":"2026-08-22","content":"## Principle\n\nAn incident report or an open case alone does not block clearance.\n\n## ?4 Holds\n\nA clearance hold requires a recorded OSAS case decision recommending a hold, or an authorized interim measure under ?5.2.\n\n## ?5.2 Interim measures\n\nFor threat-related safety matters, the OSAS Director may authorize a temporary hold pending a case decision. Interim holds are reviewed within 14 days and are not findings of responsibility.\n\n## Requires Resolution\n\nUsed when a recorded decision includes conditions that must be completed before clearance is finalized."},{"title":"Tutoring Conduct and Safety Standards","category":"Tutoring Conduct / Safety","version":"v1.5","effective_date":"2026-07-01","document_owner":"Office of Student Affairs and Services","status":"active","updated_at":"2026-08-15","content":"## Standards\n\n- Be punctual and give notice when unable to attend a booked session.\n- Use approved public campus locations for in-person sessions.\n- Keep communication within Kasangga messaging.\n\n## Repeated no-shows\n\nThree or more unexcused absences may be referred to OSAS."},{"title":"Case Documentation Retention Guide","category":"Case Review Procedures","version":"v0.9","effective_date":null,"document_owner":"OSAS Case Management Unit","status":"draft","updated_at":"2026-09-12","content":"## Draft status\n\nThis guide is under development and is not in effect.\n\n## Proposed retention\n\nArchived case records retained for five academic years, then reviewed under records-management procedures."},{"title":"Legacy Incident Handling Guide","category":"Incident Reporting","version":"v1.0","effective_date":"2024-01-10","document_owner":"OSAS Case Management Unit","status":"archived","updated_at":"2026-07-30","content":"## Archived\n\nSuperseded by the Incident Reporting and Referral Guidelines (v1.6). Kept for reference only."}]$reference$::jsonb) loop
    if not exists(select 1 from public.policies where lower(title)=lower(item->>'title')) then
      insert into public.policies(title,category,version,effective_date,document_owner,status,updated_at,content,created_by)
      values(item->>'title',item->>'category',item->>'version',(item->>'effective_date')::date,item->>'document_owner',item->>'status',((item->>'updated_at')||'T12:00:00+08:00')::timestamptz,item->>'content',administrator);
      imported := imported + 1;
    end if;
  end loop;
  insert into public.audit_logs(action,module,target_type,new_value,result)
  values('User-supplied reference policies imported','policies','policies',jsonb_build_object('count',imported,'source','User-provided OSAS screenshots')::text,'success');
end $$;
commit;
