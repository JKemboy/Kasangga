-- Record review start and atomically hold clearance for new conditional decisions. Existing authorization and per-evidence validation guards remain.
CREATE OR REPLACE FUNCTION public.osas_save_record(p_kind text, p_id bigint, p_action text, p_value jsonb, p_expected text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.incident_reports%rowtype; c public.cases%rowtype; e public.incident_evidence%rowtype;
 old_value jsonb; next_status text; d jsonb; latest public.case_decisions%rowtype; notes text;
 cid bigint; reviewer uuid:=auth.uid(); criterion text; checks jsonb;
begin
 if not public.is_portal_osas() then raise exception 'An active OSAS account is required.'; end if;
 notes:=btrim(coalesce(p_value->>'notes',p_value#>>'{history,-1,notes}',p_value#>>'{assessment,notes}',''));
 if p_kind='incident' then
  select * into r from public.incident_reports where report_id=p_id for update;
  if not found then raise exception 'Report not found.'; end if;
  old_value:=to_jsonb(r);
  if r.osas_referral_status<>'referred' or r.report_status='resolved' or exists(select 1 from public.cases where report_id=p_id) then raise exception 'This report is not awaiting referred OSAS assessment.'; end if;
  if p_action='open' then
   insert into public.cases(report_id,case_type,priority,case_status,assigned_osas_id) values(p_id,r.incident_type,r.priority,'open',reviewer) returning case_id into cid;
   insert into public.case_actions(case_id,performed_by,action_type,action_details) values(cid,reviewer,'opened',jsonb_build_object('notes','Opened after Admin referral. No finding of responsibility.')::text);
   if not exists(select 1 from public.clearance_reviews cr where cr.user_id=r.reported_against and cr.academic_year='Case follow-up' and cr.semester='Case follow-up' and cr.clearance_status in ('pending','requires_resolution','on_hold')) then
    insert into public.clearance_reviews(user_id,academic_year,semester,clearance_status) values(r.reported_against,'Case follow-up','Case follow-up','pending');
   end if;
   update public.incident_reports set report_status='under_review',osas_referral_status='case_opened' where report_id=p_id;
  elsif p_action='close' and length(notes)>=10 then
   update public.incident_reports set report_status='resolved',osas_referral_status='closed_no_case',resolved_at=now() where report_id=p_id;
  else raise exception 'Choose open or close with review notes.'; end if;
  update public.incident_reports set osas_assessment=jsonb_build_object('action',p_action,'notes',notes,'at',now(),'by',reviewer) where report_id=p_id;
 elsif p_kind='case' then
  select * into c from public.cases where case_id=p_id for update;
  if not found or c.archived_at is not null then raise exception 'Case is missing or archived.'; end if;
  old_value:=to_jsonb(c);
  if p_expected is not null and c.case_status<>p_expected then raise exception 'Case changed. Refresh before saving.'; end if;
  if p_action='begin_review' then
   if c.case_status='resolved' then return; end if;
   if not exists(select 1 from public.case_actions where case_id=p_id and action_type='begin_review') then
    insert into public.case_actions(case_id,performed_by,action_type,action_details) values(p_id,reviewer,'begin_review','{"notes":"Opened Case Details & Evidence for review."}');
   end if;
   return;
  end if;
  select * into latest from public.case_decisions where case_id=p_id order by decision_id desc limit 1;
  if p_action='note' and coalesce(p_value#>>'{history,-1,action}','Case note') not in ('Case note','Interview conducted','Notice sent to parties','Meeting scheduled','Referral to counseling','Correspondence logged','Note') then raise exception 'Choose a valid case action type.'; end if;
  if p_action in ('note','status','decision') then
   next_status:=replace(lower(p_value->>'status'),' ','_');
   if p_action='decision' or next_status in ('under_review','pending_decision') then
    if not exists(select 1 from public.incident_evidence where report_id=c.report_id) or exists(select 1 from public.incident_evidence where report_id=c.report_id and validation_status is distinct from 'validated') then raise exception 'Validate every evidence file before proceeding to case review or decision.'; end if;
   end if;
   if (next_status='pending_decision' and c.case_status<>'pending_decision') or p_action='decision' then
    if p_action<>'decision' and c.case_status not in ('open','under_review') then raise exception 'Open or Under Review cases can move to Pending Decision.'; end if;
   end if;
  end if;
  if p_action='archive' and exists(select 1 from public.clearance_holds where case_id=p_id and hold_status='active') then raise exception 'Release active clearance holds before archiving.'; end if;

  if exists(select 1 from public.incident_evidence where report_id=c.report_id and validation_status='insufficient') and p_action<>'archive_insufficient' then raise exception 'Evidence is insufficient. Archive this case to close it without a finding.'; end if;
  if p_action='archive_insufficient' then
   if not exists(select 1 from public.incident_evidence where report_id=c.report_id and validation_status='insufficient') then raise exception 'No insufficient evidence is recorded.'; end if;
   if latest.decision_id is not null or exists(select 1 from public.clearance_holds where case_id=p_id and hold_status='active') then raise exception 'Resolve existing decisions or holds before archiving.'; end if;
   notes:='Closed and archived due to insufficient evidence. No finding of responsibility.';
   update public.cases set case_status='resolved',resolved_at=now(),resolution='Insufficient evidence',resolution_notes=notes,archived_at=now(),archived_by=reviewer where case_id=p_id;
   update public.incident_reports set report_status='resolved',resolved_at=now() where report_id=c.report_id;
  elsif p_action='archive' then
   if c.case_status<>'resolved' or latest.decision_id is null then raise exception 'Resolve this case before archiving.'; end if;
   d:=latest.decision_details::jsonb;
   if coalesce(d->>'condition','')<>'' and coalesce((d->>'conditionDone')::boolean,false)=false then raise exception 'Complete the recorded condition before archiving.'; end if;
   update public.cases set archived_at=now(),archived_by=reviewer where case_id=p_id;
  elsif p_action='condition' then
   if c.case_status not in ('resolved','pending_completion') or latest.decision_id is null then raise exception 'No recorded decision awaiting condition completion.'; end if;
   d:=latest.decision_details::jsonb;
   if coalesce(d->>'condition','')='' then raise exception 'No pending condition.'; end if;
   update public.case_decisions set decision_details=(d||jsonb_build_object('conditionDone',true,'completedAt',now()))::text where decision_id=latest.decision_id;
   update public.cases set case_status='resolved',resolved_at=now() where case_id=p_id;
   update public.incident_reports set report_status='resolved',resolved_at=now() where report_id=c.report_id;
  else
   if c.case_status='resolved' then raise exception 'Resolved decisions are read-only.'; end if;
   if p_action='decision' then
    d:=p_value->'decision';
    if c.case_status<>'pending_decision' or latest.decision_id is not null or length(coalesce(d->>'notes',''))<30 or length(btrim(coalesce(d->>'basis','')))=0 or d->>'outcome' not in ('No Violation','Case Dismissed','Counseled','Verbal Warning','Written Warning','Referred for Further Action','Clearance Hold Recommended') or d->>'outcome' is null then raise exception 'Complete an impartial decision with an outcome, notes and policy basis.'; end if;
    if coalesce(d->>'condition','')<>'' and coalesce(d->>'due','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Choose a condition due date.'; end if;
    d:=d||jsonb_build_object('at',now(),'conditionDone',coalesce(d->>'condition','')='');
    insert into public.case_decisions(case_id,decided_by,decision_type,decision_details,clearance_effect) values(p_id,reviewer,d->>'outcome',d::text,case when d->>'outcome'='Clearance Hold Recommended' or btrim(coalesce(d->>'condition',''))<>'' then 'hold_recommended' else 'none' end);
    if btrim(coalesce(d->>'condition',''))<>'' then
     select * into r from public.incident_reports where report_id=c.report_id;
     perform pg_advisory_xact_lock(hashtextextended(r.reported_against::text,0));
     select clearance_review_id into cid from public.clearance_reviews where user_id=r.reported_against order by clearance_review_id desc limit 1 for update;
     if cid is null then
      insert into public.clearance_reviews(user_id,academic_year,semester,clearance_status) values(r.reported_against,'Case follow-up','Case follow-up','on_hold') returning clearance_review_id into cid;
     end if;
     insert into public.clearance_holds(clearance_review_id,case_id,reason,placed_by)
      select cid,p_id,d->>'condition',reviewer where not exists(select 1 from public.clearance_holds where clearance_review_id=cid and case_id=p_id and hold_status='active');
     update public.clearance_reviews set clearance_status='on_hold',decision_reason=d->>'condition',reviewed_by=reviewer,reviewed_at=now() where clearance_review_id=cid;
    end if;
    update public.cases set case_status=case when coalesce(d->>'condition','')<>'' then 'pending_completion' else 'resolved' end,resolved_at=case when coalesce(d->>'condition','')<>'' then null else now() end,resolution=d->>'outcome',resolution_notes=d->>'notes' where case_id=p_id;
    update public.incident_reports set report_status=case when coalesce(d->>'condition','')<>'' then 'under_review' else 'resolved' end,resolved_at=case when coalesce(d->>'condition','')<>'' then null else now() end where report_id=c.report_id;
   elsif p_action='request' then
    d:=p_value->'evidenceRequest';
    if length(coalesce(d->>'notes',''))<10 or coalesce(d->>'due','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Enter evidence request details and a due date.'; end if;
    if not exists(select 1 from public.incident_reports where report_id=c.report_id and d->>'recipientId' in (reported_by::text,reported_against::text)) then raise exception 'Select one of the case participants.'; end if;
    update public.cases set case_status='awaiting_evidence' where case_id=p_id;
    notes:=d->>'notes';
   elsif p_action in ('note','status') then
    next_status:=replace(lower(p_value->>'status'),' ','_');
    if next_status not in ('open','under_review','awaiting_evidence','pending_decision') or next_status is null then raise exception 'Invalid case status.'; end if;
    if p_action='note' and length(notes)<10 then raise exception 'Enter at least 10 characters.'; end if;
    if next_status='pending_decision' and exists(select 1 from public.incident_evidence where report_id=c.report_id and validation_status<>'validated') then raise exception 'Review all submitted evidence before a decision.'; end if;
    update public.cases set case_status=next_status where case_id=p_id;
   else raise exception 'Invalid case action.'; end if;
  end if;
  insert into public.case_actions(case_id,performed_by,action_type,action_details) values(p_id,reviewer,p_action,jsonb_build_object('notes',notes,'status',p_value->>'status','evidenceRequest',p_value->'evidenceRequest','actionLabel',case when p_action='note' then coalesce(p_value#>>'{history,-1,action}','Case note') else null end)::text);
  if p_action='request' or (p_action='decision' and coalesce((d->>'notify')::boolean,false)) then
   insert into public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id)
   select party,case when p_action='request' then 'case_evidence_requested' else 'case_update' end,'OSAS case update',case when p_action='decision' then 'OSAS has recorded a decision. Contact OSAS for the institutional review record.' else notes||' Due: '||(d->>'due') end,'cases',p_id from public.incident_reports ir cross join lateral (values(ir.reported_by),(ir.reported_against)) parties(party) where ir.report_id=c.report_id and (p_action='decision' or party::text=d->>'recipientId');
  end if;
 elsif p_kind='evidence' then
  select * into e from public.incident_evidence where evidence_id=p_id for update;
  if not found or e.validation_status in ('validated','insufficient') then raise exception 'Evidence missing or already validated.'; end if;
  old_value:=to_jsonb(e);
  perform 1 from public.cases where report_id=e.report_id for update;
  if exists(select 1 from public.incident_evidence where report_id=e.report_id and validation_status='insufficient') then raise exception 'Evidence is insufficient. Archive the case instead of continuing validation.'; end if;
  if not exists(select 1 from public.cases where report_id=e.report_id and archived_at is null and case_status<>'resolved') then raise exception 'Open a formal OSAS case before validating evidence.'; end if;
  if exists(select 1 from public.cases where report_id=e.report_id and (archived_at is not null or case_status='resolved')) then raise exception 'Resolved case evidence is read-only.'; end if;
  d:=p_value#>'{history,-1}'; checks:=d->'criteria'; notes:=d->>'notes';
  next_status:=replace(lower(p_value->>'status'),' ','_');
  if next_status not in ('validated','insufficient') or next_status is null or length(coalesce(notes,''))<10 then raise exception 'Choose a validation result and enter notes.'; end if;
  if not exists(select 1 from jsonb_each_text(coalesce(checks,'{}'::jsonb)) x where x.value in ('Meets criterion','Not applicable')) then raise exception 'Assess at least one evidence criterion.'; end if;
  if next_status='validated' then
   foreach criterion in array array['Authenticity','Readability','Context Completeness','Relevance to Case','Source Verification','Signs of Manipulation'] loop
    if coalesce(checks->>criterion,'')<>'Meets criterion' and not (criterion='Source Verification' and checks->>criterion='Not applicable') then raise exception 'Complete every evidence criterion.'; end if;
   end loop;
  end if;
  insert into public.evidence_validations(evidence_id,reviewer_id,authenticity_checked,readability_checked,context_complete,relevant_to_case,no_manipulation_signs,source_verified,validation_result,reviewer_notes)
  values(p_id,reviewer,coalesce(checks->>'Authenticity'='Meets criterion',false),coalesce(checks->>'Readability'='Meets criterion',false),coalesce(checks->>'Context Completeness'='Meets criterion',false),coalesce(checks->>'Relevance to Case'='Meets criterion',false),coalesce(checks->>'Signs of Manipulation'='Meets criterion',false),coalesce(checks->>'Source Verification' in ('Meets criterion','Not applicable'),false),next_status,notes);
  update public.incident_evidence set validation_status=next_status where evidence_id=p_id;
 elsif p_kind='clearance' then
  if p_action='create_follow_up' then
   if nullif(p_value->>'userId','') is null or not exists(select 1 from public.users u where u.user_id=(p_value->>'userId')::uuid) then raise exception 'Student record not found.'; end if;
   if not exists(select 1 from public.cases ca join public.incident_reports ir using(report_id) where ir.reported_against=(p_value->>'userId')::uuid and ca.archived_at is null and ca.case_status<>'resolved') then raise exception 'An unresolved OSAS case is required for a case follow-up review.'; end if;
   insert into public.clearance_reviews(user_id,academic_year,semester,clearance_status)
   values((p_value->>'userId')::uuid,coalesce(nullif(p_value->>'academicYear',''),'Case follow-up'),coalesce(nullif(p_value->>'semester',''),'Case follow-up'),'pending')
   returning clearance_review_id into cid;
   p_id:=cid;
  end if;
  select to_jsonb(cr) into old_value from public.clearance_reviews cr where clearance_review_id=p_id for update;
  if old_value is null then raise exception 'Clearance request not found.'; end if;
  next_status:=replace(lower(p_value->>'status'),' ','_');
  if next_status='pending_review' then next_status:='pending'; end if;
  notes:=coalesce(p_value#>>'{history,-1,notes}',p_value#>>'{history,-1,note}',p_value->>'notes');
  if next_status not in ('pending','cleared','on_hold','requires_resolution') or next_status is null or (next_status='pending' and old_value->>'clearance_status'<>'pending') then raise exception 'Select a valid clearance decision.'; end if;
  if next_status='requires_resolution' and not exists(select 1 from public.cases ca join public.incident_reports ir using(report_id) where ir.reported_against=(old_value->>'user_id')::uuid and (ca.case_status<>'resolved' or exists(select 1 from public.case_decisions cd where cd.case_id=ca.case_id and coalesce(cd.decision_details::jsonb->>'condition','')<>'' and not coalesce((cd.decision_details::jsonb->>'conditionDone')::boolean,false)))) then raise exception 'Requires Resolution must refer to an unresolved case or condition.'; end if;
  if next_status='cleared' and exists(select 1 from public.clearance_holds where clearance_review_id=p_id and hold_status='active') then raise exception 'Release active clearance holds before clearing.'; end if;
  if next_status='on_hold' then
   if not exists(select 1 from public.cases ca join public.incident_reports ir using(report_id) join public.case_decisions cd using(case_id) where ir.reported_against=(old_value->>'user_id')::uuid and cd.clearance_effect='hold_recommended') then raise exception 'A clearance hold requires a recorded recommendation.'; end if;
   insert into public.clearance_holds(clearance_review_id,case_id,reason,placed_by)
   select p_id,ca.case_id,coalesce(nullif(btrim(notes),''),'Clearance hold based on recorded OSAS case decision.'),reviewer from public.cases ca join public.incident_reports ir using(report_id) join public.case_decisions cd using(case_id)
   where ir.reported_against=(old_value->>'user_id')::uuid and cd.clearance_effect='hold_recommended' and not exists(select 1 from public.clearance_holds ch where ch.clearance_review_id=p_id and ch.case_id=ca.case_id and ch.hold_status='active');
  end if;
  update public.clearance_reviews set clearance_status=next_status,decision_reason=notes,reviewed_by=reviewer,reviewed_at=now() where clearance_review_id=p_id;
 elsif p_kind='hold' then
  select to_jsonb(ch) into old_value from public.clearance_holds ch where hold_id=p_id for update;
  if old_value is null or old_value->>'hold_status'<>'active' or p_action<>'release' or length(notes)<15 then raise exception 'Choose an active hold and record a release basis.'; end if;
  select * into c from public.cases where case_id=(old_value->>'case_id')::bigint;
  if c.case_status<>'resolved' or exists(select 1 from public.case_decisions cd where cd.case_id=c.case_id and coalesce(cd.decision_details::jsonb->>'condition','')<>'' and not coalesce((cd.decision_details::jsonb->>'conditionDone')::boolean,false)) then raise exception 'Resolve the case and complete conditions before releasing a hold.'; end if;
  update public.clearance_holds set hold_status='released',resolved_at=now() where hold_id=p_id;
 elsif p_kind='settings' then
  if coalesce(p_value->>'pageSize','') not in ('5','6','10','15','20','25','50') or p_value->>'timezone'<>'Asia/Manila' then raise exception 'Invalid OSAS display settings.'; end if;
  insert into public.system_settings(setting_key,setting_value,setting_group,updated_by,updated_at) values('osas:'||reviewer::text,p_value::text,'osas',reviewer,now()) on conflict(setting_key) do update set setting_value=excluded.setting_value,updated_by=reviewer,updated_at=now();
 else raise exception 'Unsupported OSAS action.'; end if;
 insert into public.audit_logs(user_id,action,module,target_type,target_id,previous_value,new_value,result) values(reviewer,'osas_'||p_action,'osas',p_kind,p_id,old_value::text,p_value::text,'success');
end $function$
;
