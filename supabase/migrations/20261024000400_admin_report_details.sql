-- Enrich the same read-only projection with Admin activity and own refund facts.
-- No new tables or columns; does not change review decisions or clearance state.
begin;
create or replace function public.my_reports_snapshot() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); filed jsonb; about jsonb:='[]'; r record; details jsonb; decision jsonb; holds jsonb; own_files jsonb; activities jsonb;
begin
  if uid is null or not exists(select 1 from public.users where user_id=uid and account_status='active') then
    raise exception 'An active signed-in account is required';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'report_id',ir.report_id,'booking_id',ir.booking_id,'incident_type',ir.incident_type,
    'description',ir.description,'report_status',ir.report_status,'osas_referral_status',ir.osas_referral_status,
    'submitted_at',ir.submitted_at,'resolved_at',ir.resolved_at,'referred_at',ir.referred_at,
    'filing_role',case when b.learner_id=uid then 'Learner' when tp.user_id=uid then 'Tutor' else 'Student' end,
    'other_party',concat_ws(' ',other_user.first_name,other_user.last_name),
    'other_party_role',case when ir.reported_against=b.learner_id then 'Learner' when ir.reported_against=tp.user_id then 'Tutor' else 'Student' end,
    'admin_activity',coalesce((select jsonb_agg(jsonb_build_object('title',case lower(a.action) when 'resolved by admin' then 'Resolved by Kasangga Admin' when 'admin screening complete' then 'Admin completed report screening' else 'Kasangga Admin reviewed this report' end,'at',a.created_at) order by a.created_at)
      from public.audit_logs a where a.target_type='incident_reports' and a.target_id=ir.report_id and a.module='incident_reports'
      and lower(a.action) in ('admin review','under review','resolved by admin','admin screening complete')),'[]'::jsonb),
    'refund',(select jsonb_build_object('status',rf.refund_status,'amount',rf.refund_amount,'full',rf.refund_amount>=p.gross_amount,'method',p.payment_method,'processed_at',rf.processed_at,
      'confirmed',rf.refund_status in ('refunded','completed','processed') and rf.processed_at is not null and nullif(rf.provider_refund_id,'') is not null)
      from public.refunds rf join public.payments p using(payment_id) where p.booking_id=ir.booking_id and rf.requested_by=uid order by rf.requested_at desc limit 1),
    'session',case when b.booking_id is not null then jsonb_build_object('title',coalesce(b.service_title_snapshot,s.title),'date',b.session_date,'start',b.start_time,'end',b.end_time,'type',b.session_type,'platform',b.meeting_platform,'location',b.location) end,
    'case',case when c.case_id is not null then jsonb_build_object('case_id',c.case_id,'opened_at',c.opened_at,
      'resolved_at',c.resolved_at,'resolved',c.case_status='resolved' or c.archived_at is not null) end,
    'evidence',coalesce((select jsonb_agg(jsonb_build_object('id',e.evidence_id,'name',e.file_name,'path',e.file_path,'uploaded_at',e.uploaded_at)) from public.incident_evidence e where e.report_id=ir.report_id and e.submitted_by=uid),'[]'::jsonb),
    'refund_status',(select rf.refund_status from public.refunds rf join public.payments p using(payment_id) where p.booking_id=ir.booking_id and rf.requested_by=uid order by rf.requested_at desc limit 1)
  ) order by ir.submitted_at desc),'[]'::jsonb) into filed
  from public.incident_reports ir
  left join public.bookings b on b.booking_id=ir.booking_id
  left join public.services s on s.service_id=b.service_id
  left join public.tutor_profiles tp on tp.tutor_profile_id=s.tutor_profile_id
  left join public.users other_user on other_user.user_id=ir.reported_against
  left join lateral(select * from public.cases cc where cc.report_id=ir.report_id order by cc.opened_at desc,cc.case_id desc limit 1) c on true
  where ir.reported_by=uid;

  for r in
    select c.*,ir.incident_type,ir.booking_id,ir.submitted_at,ir.referred_at,
      b.session_date,b.start_time,b.end_time,b.session_type,b.location,coalesce(b.service_title_snapshot,s.title) service_title,
      cd.decision_type,cd.decision_details,cd.decision_date,cd.clearance_effect,
      concat_ws(' ',officer.first_name,officer.last_name) officer_name
    from public.cases c join public.incident_reports ir using(report_id)
    left join public.bookings b on b.booking_id=ir.booking_id
    left join public.services s on s.service_id=b.service_id
    left join public.users officer on officer.user_id=c.assigned_osas_id
    left join lateral(select * from public.case_decisions d where d.case_id=c.case_id order by d.decision_id desc limit 1) cd on true
    where ir.reported_against=uid
    order by c.opened_at desc,c.case_id desc
  loop
    begin details:=coalesce(r.decision_details::jsonb,'{}'); exception when invalid_text_representation then details:=jsonb_build_object('notes',r.decision_details); end;
    decision:=case when r.decision_type is not null then jsonb_build_object(
      'outcome',r.decision_type,'notes',details->>'notes','basis',details->>'basis',
      'condition',details->>'condition','condition_done',coalesce(details->>'conditionDone','false')='true',
      'due',details->>'due','at',coalesce(details->>'at',r.decision_date::text),'completed_at',details->>'completedAt',
      'clearance_effect',r.clearance_effect) end;
    select coalesce(jsonb_agg(jsonb_build_object('id',ch.hold_id,'status',ch.hold_status,'reason',ch.reason,'placed_at',ch.placed_at,'resolved_at',ch.resolved_at)),'[]') into holds
      from public.clearance_holds ch join public.clearance_reviews cr using(clearance_review_id) where ch.case_id=r.case_id and cr.user_id=uid;
    select coalesce(jsonb_agg(jsonb_build_object('id',e.evidence_id,'name',e.file_name,'path',e.file_path,'uploaded_at',e.uploaded_at)),'[]') into own_files
      from public.incident_evidence e where e.report_id=r.report_id and e.submitted_by=uid;
    select coalesce(jsonb_agg(jsonb_build_object('type',a.action_type,'at',a.created_at) order by a.created_at),'[]') into activities
      from public.case_actions a where a.case_id=r.case_id and a.action_type in ('opened','status','decision','condition','archive','archive_insufficient','request');
    about:=about||jsonb_build_array(jsonb_build_object(
      'case_id',r.case_id,'report_id',r.report_id,'booking_id',r.booking_id,'incident_type',r.incident_type,
      'case_status',r.case_status,'resolution',r.resolution,'opened_at',r.opened_at,'resolved_at',r.resolved_at,'archived_at',r.archived_at,
      'officer',r.officer_name,'decision',decision,'holds',holds,'evidence',own_files,'activity',activities,
      'session',case when r.booking_id is not null then jsonb_build_object('title',r.service_title,'date',r.session_date,'start',r.start_time,'end',r.end_time,'type',r.session_type,'location',r.location) end
    ));
  end loop;
  return jsonb_build_object('created',filed,'received',about,
    'student',(select jsonb_build_object('name',concat_ws(' ',first_name,last_name),'student_id',student_id) from public.users where user_id=uid));
end $$;
revoke all on function public.my_reports_snapshot() from public,anon;
grant execute on function public.my_reports_snapshot() to authenticated;
commit;
