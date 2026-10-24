-- Persist derived activity read state in the existing notifications table.
-- No new tables or columns. Users can only acknowledge their own activity.
begin;
create function public.mark_activity_notifications_read(p_event_ids text[])
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid:=auth.uid(); v_event text; v_id bigint; v_entity text; v_allowed boolean;
begin
  if v_uid is null then raise exception 'Sign in to read notifications'; end if;
  if coalesce(cardinality(p_event_ids),0)>100 then raise exception 'Too many notifications'; end if;
  perform pg_advisory_xact_lock(hashtextextended('activity-read:'||v_uid::text,0));
  for v_event in select distinct unnest(p_event_ids) loop
    if length(v_event)>180 then raise exception 'Invalid notification'; end if;
    v_allowed:=false;
    if v_event ~ '^session-[0-9]+-(Confirmed|Completed)$' or v_event ~ '^transfer-[0-9]+-.{1,100}$' then
      v_id:=split_part(v_event,'-',2)::bigint; v_entity:='bookings';
      select exists(select 1 from public.bookings b join public.services s using(service_id)
        join public.tutor_profiles tp using(tutor_profile_id)
        where b.booking_id=v_id and (b.learner_id=v_uid or tp.user_id=v_uid)) into v_allowed;
    elsif v_event ~ '^message-[0-9]+-[0-9]+$' then
      v_id:=split_part(v_event,'-',2)::bigint; v_entity:='bookings';
      select exists(select 1 from public.messages m join public.conversations c using(conversation_id)
        join public.bookings b using(booking_id) join public.services s using(service_id)
        join public.tutor_profiles tp using(tutor_profile_id)
        where b.booking_id=v_id and m.message_id=split_part(v_event,'-',3)::bigint
          and m.sender_id<>v_uid and (b.learner_id=v_uid or tp.user_id=v_uid)) into v_allowed;
    elsif v_event ~ '^report-received-[0-9]+$' then
      v_id:=split_part(v_event,'-',3)::bigint; v_entity:='incident_reports';
      select exists(select 1 from public.incident_reports r where r.report_id=v_id and r.reported_against=v_uid) into v_allowed;
    end if;
    if not v_allowed then raise exception 'Notification not available to this account'; end if;
    insert into public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id,is_read)
      select v_uid,'activity_read_receipt','Activity read state',v_event,v_entity,v_id,true
      where not exists(select 1 from public.notifications where user_id=v_uid
        and notification_type='activity_read_receipt' and message=v_event);
  end loop;
end $$;
revoke all on function public.mark_activity_notifications_read(text[]) from public,anon;
grant execute on function public.mark_activity_notifications_read(text[]) to authenticated;
commit;
