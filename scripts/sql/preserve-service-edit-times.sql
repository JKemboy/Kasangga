-- Preserve unchanged saved ranges while validating new and changed times.
begin;
CREATE OR REPLACE FUNCTION public.save_tutor_topic_service(p_service_id bigint, p_title text, p_description text, p_topics jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare tutor_id bigint; saved_id bigint; entry jsonb; topic_id_value bigint; retained bigint[] := '{}'; slot jsonb; rate numeric; mode text; topic_name_value text; lowest numeric; modes text[]; old_slot bigint;
begin
  select tp.tutor_profile_id into tutor_id from public.tutor_profiles tp join public.users u on u.user_id = tp.user_id
  where tp.user_id = auth.uid() and lower(u.account_status) = 'active'
    and exists (select 1 from public.user_roles r where r.user_id = u.user_id and lower(r.role) = 'tutor' and r.is_active);
  if tutor_id is null then raise exception 'An active tutor account is required.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(tutor_id);
  if nullif(trim(p_title), '') is null or length(p_title) > 200 or nullif(trim(p_description), '') is null or length(p_description) > 160 then raise exception 'Enter a service title and description.'; end if;
  if p_topics is null or jsonb_typeof(p_topics) <> 'array' or jsonb_array_length(p_topics) not between 1 and 20 then raise exception 'Add 1 to 20 topics.'; end if;
  if exists (select 1 from public.services where tutor_profile_id = tutor_id and lower(trim(title)) = lower(trim(p_title)) and service_id is distinct from p_service_id) then raise exception 'A service with this name already exists.'; end if;
  if exists (select 1 from jsonb_array_elements(p_topics) t group by lower(trim(t->>'name')) having count(*) > 1) then raise exception 'Topic names must be different.'; end if;
  select min((t->>'rate')::numeric), array_agg(distinct t->>'type') into lowest, modes from jsonb_array_elements(p_topics) t;
  if lowest is null or lowest < 1 then raise exception 'Enter a valid hourly rate for every topic.'; end if;
  if p_service_id is null then
    insert into public.services(tutor_profile_id,title,subject,category,level,description,session_type,rate_per_hour,service_status)
    values(tutor_id,trim(p_title),trim(p_title),'Other','All Levels',trim(p_description),case when array_length(modes,1) > 1 or 'both' = any(modes) then 'both' else modes[1] end,lowest,'active') returning service_id into saved_id;
  else
    update public.services set title=trim(p_title), subject=trim(p_title), description=trim(p_description), rate_per_hour=lowest,
      session_type=case when array_length(modes,1)>1 or 'both'=any(modes) then 'both' else modes[1] end,updated_at=now()
    where service_id=p_service_id and tutor_profile_id=tutor_id and lower(service_status) in ('active','inactive') returning service_id into saved_id;
    if saved_id is null then raise exception 'This service is unavailable or suspended.'; end if;
    -- Rebuild topic-specific schedules atomically; general availability stays intact.
    update public.availability_slots a set is_active=false,updated_at=now()
    where a.service_id=saved_id and a.topic_id is not null and not exists (
      select 1 from jsonb_array_elements(p_topics) t
      where nullif(t->>'id','')::bigint=a.topic_id
        and coalesce((select range_agg(numrange(
          extract(epoch from (v->>'start')::time),extract(epoch from (v->>'end')::time),'[)'))
          from jsonb_array_elements(t->'availability') v
          where coalesce((v->>'repeat')::boolean,false)=(a.availability_date is null)
            and (case when a.availability_date is null then
              lower(trim(to_char((v->>'date')::date,'Day')))=lower(a.day_of_week)
              else (v->>'date')::date=a.availability_date end)
        ) @> numrange(extract(epoch from a.start_time),extract(epoch from a.end_time),'[)'),false)
    );
  end if;
  for entry in select value from jsonb_array_elements(p_topics) loop
    rate := (entry->>'rate')::numeric; mode := entry->>'type'; topic_name_value := trim(entry->>'name');
    if rate is null or rate not between 1 and 10000 or rate <> round(rate,2) or mode is null or mode not in ('online','in-person','both') or nullif(topic_name_value,'') is null or length(topic_name_value)>200 then raise exception 'Review each topic name, hourly rate and session type.'; end if;
    if mode in ('online','both') and (coalesce(entry->>'meetingLink','') !~ '^https://[^[:space:]]+$' or length(entry->>'meetingLink') > 2000) then raise exception 'Online topics require a valid HTTPS meeting link.'; end if;
    if mode in ('in-person','both') and (nullif(trim(entry->>'location'),'') is null or length(entry->>'location')>300) then raise exception 'In-person topics require a meeting place.'; end if;
    if entry->'availability' is null or jsonb_typeof(entry->'availability') <> 'array' or jsonb_array_length(entry->'availability') not between 1 and 20 then raise exception 'Add 1 to 20 dates and times for each topic.'; end if;
    topic_id_value := nullif(entry->>'id','')::bigint;
    if topic_id_value is null then
      insert into public.service_topics(service_id,topic_name,rate_per_hour,session_type,meeting_link,location)
      values(saved_id,topic_name_value,rate,mode,case when mode in ('online','both') then entry->>'meetingLink' end,case when mode in ('in-person','both') then trim(entry->>'location') end) returning topic_id into topic_id_value;
    else
      update public.service_topics set topic_name=topic_name_value,rate_per_hour=rate,session_type=mode,is_active=true,
      meeting_link=case when mode in ('online','both') then entry->>'meetingLink' end,location=case when mode in ('in-person','both') then trim(entry->>'location') end
      where topic_id=topic_id_value and service_id=saved_id;
      if not found then raise exception 'A topic does not belong to this service.'; end if;
    end if;
    if topic_id_value = any(retained) then raise exception 'A topic was submitted twice.'; end if;
    retained := array_append(retained,topic_id_value);
    for slot in select value from jsonb_array_elements(entry->'availability') loop
      if (slot->>'end')::time - (slot->>'start')::time not in (interval '1 hour',interval '2 hours') then raise exception 'Each selected time slot must be one or two hours.'; end if;
      -- An unchanged saved range must not conflict with its own bookings or
      -- become unsaveable just because its date has passed. New/changed ranges
      -- still go through the full availability validator below.
      if not exists (
        select 1 from public.availability_slots a where a.is_active
          and a.service_id=saved_id and a.topic_id=topic_id_value
          and coalesce((slot->>'repeat')::boolean,false)=(a.availability_date is null)
          and (case when a.availability_date is null then
            lower(trim(to_char((slot->>'date')::date,'Day')))=lower(a.day_of_week)
            else (slot->>'date')::date=a.availability_date end)
          and a.start_time <= (slot->>'start')::time and a.end_time >= (slot->>'end')::time
      ) then
        perform public.save_tutor_availability(slot || jsonb_build_object('serviceId',saved_id,'topicId',topic_id_value));
      end if;
    end loop;
  end loop;
  update public.service_topics set is_active=false where service_id=saved_id and not(topic_id=any(retained));
  return saved_id;
end; $function$;

commit;
