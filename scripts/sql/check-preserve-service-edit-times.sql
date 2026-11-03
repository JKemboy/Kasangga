-- Run after preserve-service-edit-times.sql inside an uncommitted transaction.
-- Tests use an existing multi-topic service; all changes are rolled back.
do $$
declare v_service public.services%rowtype; v_user uuid; v_topics jsonb; v_before jsonb; v_after jsonb;
  v_other_topic bigint; v_slot public.availability_slots%rowtype; v_conflict jsonb;
begin
  select s.* into strict v_service from public.services s
    where (select count(*) from public.service_topics t where t.service_id=s.service_id and t.is_active)>1
      and exists(select 1 from public.availability_slots a where a.service_id=s.service_id and a.is_active)
    order by s.service_id limit 1;
  select user_id into v_user from public.tutor_profiles where tutor_profile_id=v_service.tutor_profile_id;
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  select jsonb_agg(jsonb_build_object('id',t.topic_id,'name',t.topic_name,'rate',t.rate_per_hour,
    'type',t.session_type,'meetingLink',t.meeting_link,'location',t.location,'availability',(
      select jsonb_agg(jsonb_build_object('date',coalesce(a.availability_date,
        date '2000-01-03'+array_position(array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],lower(a.day_of_week))-1),
        'repeat',a.availability_date is null,'start',a.start_time,'end',a.end_time) order by a.slot_id)
      from public.availability_slots a where a.topic_id=t.topic_id and a.is_active
    )) order by t.topic_id) into v_topics from public.service_topics t
    where t.service_id=v_service.service_id and t.is_active;
  select jsonb_agg(to_jsonb(a)-'updated_at' order by a.slot_id) into v_before
    from public.availability_slots a where a.service_id=v_service.service_id and a.is_active;
  perform public.save_tutor_topic_service(v_service.service_id,v_service.title,v_service.description,v_topics);
  select jsonb_agg(to_jsonb(a)-'updated_at' order by a.slot_id) into v_after
    from public.availability_slots a where a.service_id=v_service.service_id and a.is_active;
  if v_before is distinct from v_after then raise exception 'Unchanged saved ranges were altered'; end if;

  select * into strict v_slot from public.availability_slots a where a.service_id=v_service.service_id
    and a.is_active and a.availability_date>(now() at time zone 'Asia/Manila')::date
    order by a.availability_date limit 1;
  select topic_id into strict v_other_topic from public.service_topics
    where service_id=v_service.service_id and topic_id<>v_slot.topic_id and is_active limit 1;
  v_conflict:=jsonb_build_object('date',v_slot.availability_date,'repeat',false,'start',v_slot.start_time,'end',v_slot.end_time);
  select jsonb_agg(case when (t->>'id')::bigint=v_other_topic then
    jsonb_set(t,'{availability}',(t->'availability')||jsonb_build_array(v_conflict)) else t end)
    into v_topics from jsonb_array_elements(v_topics) t;
  begin
    perform public.save_tutor_topic_service(v_service.service_id,v_service.title,v_service.description,v_topics);
    raise exception 'FAIL: conflicting topic was accepted';
  exception when others then
    if sqlerrm not ilike '%overlaps another topic or service%' then raise; end if;
  end;
end;
$$;
select 'PASS: unchanged historical/booked times save without altering slots; real topic overlaps remain rejected' as result;
rollback;
