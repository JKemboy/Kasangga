-- Requires the existing transactional_email_outbox and SMTP worker.
-- Future events only: intentionally does not email historical notifications.
begin;

alter table public.transactional_email_outbox alter column booking_id drop not null;
alter table public.transactional_email_outbox drop constraint transactional_email_outbox_kind_check;
alter table public.transactional_email_outbox add constraint transactional_email_outbox_kind_check
  check (kind in ('payment_received','booking_confirmed','tutor_booked','session_reminder','payment_transferred','system_notification'));
alter table public.transactional_email_outbox drop constraint transactional_email_outbox_recipient_role_check;
alter table public.transactional_email_outbox add constraint transactional_email_outbox_recipient_role_check
  check (recipient_role in ('learner','tutor','lco','oswe'));

create or replace function public.enqueue_system_notification_email(
  p_recipient uuid, p_key text, p_type text, p_title text, p_entity text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_email text; v_role text; v_index integer; v_setting text; v_text text; v_preference text;
begin
  select u.csu_email into v_email from public.users u
    where u.user_id=p_recipient and u.account_status='active';
  if nullif(btrim(v_email),'') is null then return; end if;
  select r.role into v_role from public.user_roles r where r.user_id=p_recipient and r.is_active
    and r.role in ('lco','oswe','tutor','learner')
    order by case r.role when 'lco' then 0 when 'oswe' then 1 when 'tutor' then 2 else 3 end limit 1;
  if v_role is null then return; end if;
  v_text:=lower(concat_ws(' ',p_type,p_title,p_entity));
  if v_role='oswe' then
    v_index:=case when v_text like '%referral%' then 0
      when v_text like '%priority%' then 1 when v_text like '%evidence%' then 2
      when v_text like '%clearance%' then 3
      when v_text like '%case%' and v_text like '%status%' then 4
      when v_text like '%policy%' then 5 else -1 end;
    select setting_value into v_setting from public.system_settings where setting_key='osas:'||p_recipient::text;
    if v_index>=0 and v_setting is not null and
      (v_setting::jsonb #>> array['notifications',v_index::text,'email'])='false' then return; end if;
  elsif v_role='lco' then
    v_preference:=case when v_text like '%tutor%' or v_text like '%application%' then 'tutorAlerts'
      when v_text like '%payment%' or v_text like '%refund%' then 'paymentAlerts'
      when v_text like '%incident%' or v_text like '%report%' then 'incidentAlerts'
      when v_text like '%maintenance%' or v_text like '%system%' then 'maintenanceAlerts' end;
    if exists(select 1 from public.system_settings where setting_key=v_preference and setting_value='false') then return; end if;
  end if;
  insert into public.transactional_email_outbox(event_key,kind,recipient_id,recipient_role,recipient_email,payload)
    values(p_key,'system_notification',p_recipient,v_role,v_email,'{}'::jsonb)
    on conflict(event_key) do nothing;
end;
$$;
revoke all on function public.enqueue_system_notification_email(uuid,text,text,text,text) from public,anon,authenticated;

create or replace function public.queue_in_app_notification_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.notification_type is distinct from 'activity_read_receipt' then
    perform public.enqueue_system_notification_email(new.user_id,'notification:'||new.notification_id,
      new.notification_type,new.title,new.related_entity_type);
  end if;
  return new;
end;
$$;
revoke all on function public.queue_in_app_notification_email() from public,anon,authenticated;
drop trigger if exists queue_in_app_notification_email on public.notifications;
create trigger queue_in_app_notification_email after insert on public.notifications
  for each row execute function public.queue_in_app_notification_email();

-- An OSWE email preference must work even when its in-app switch is off.
create or replace function public.notify_osas_queue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_kind text; v_title text; v_event integer; v_id bigint; v_user record;
begin
  if tg_table_name='incident_reports' then
    if new.osas_referral_status is distinct from 'referred' or old.osas_referral_status is not distinct from new.osas_referral_status then return new; end if;
    v_kind:='incident_reports'; v_title:='New case referral'; v_event:=0; v_id:=new.report_id;
  else
    v_kind:='clearance_reviews'; v_title:='Clearance review requested'; v_event:=3; v_id:=new.clearance_review_id;
  end if;
  for v_user in select u.user_id from public.users u where u.account_status='active' and exists(
    select 1 from public.user_roles r where r.user_id=u.user_id and r.role='oswe' and r.is_active)
  loop
    if public.osas_in_app_enabled(v_user.user_id,v_event) then
      insert into public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id)
        values(v_user.user_id,'osas_queue_update',v_title,'A database record is awaiting OSWE review.',v_kind,v_id);
    else
      perform public.enqueue_system_notification_email(v_user.user_id,
        'oswe-queue:'||v_kind||':'||v_id||':'||v_user.user_id||':'||txid_current(),
        'osas_queue_update',v_title,v_kind);
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.notify_osas_queue() from public,anon,authenticated;

-- These inbox items are derived in the frontend, rather than stored as notifications.
create or replace function public.queue_derived_inbox_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_learner uuid; v_tutor uuid; v_recipient uuid;
begin
  if tg_table_name='messages' then
    select b.learner_id,tp.user_id into v_learner,v_tutor from public.conversations c
      join public.bookings b using(booking_id) join public.services s using(service_id)
      join public.tutor_profiles tp using(tutor_profile_id) where c.conversation_id=new.conversation_id;
    v_recipient:=case when new.sender_id=v_learner then v_tutor when new.sender_id=v_tutor then v_learner end;
    if v_recipient is not null then
      perform public.enqueue_system_notification_email(v_recipient,'message:'||new.message_id,'new_message','New message','messages');
    end if;
  elsif tg_table_name='incident_reports' then
    perform public.enqueue_system_notification_email(new.reported_against,'report-received:'||new.report_id,
      'incident_received','Report received','incident_reports');
  elsif tg_table_name='bookings' and new.booking_status='completed' and old.booking_status is distinct from new.booking_status then
    select tp.user_id into v_tutor from public.services s join public.tutor_profiles tp using(tutor_profile_id) where s.service_id=new.service_id;
    perform public.enqueue_system_notification_email(new.learner_id,'session-completed:learner:'||new.booking_id,'session_completed','Session completed','bookings');
    perform public.enqueue_system_notification_email(v_tutor,'session-completed:tutor:'||new.booking_id,'session_completed','Session completed','bookings');
  end if;
  return new;
end;
$$;
revoke all on function public.queue_derived_inbox_email() from public,anon,authenticated;
drop trigger if exists queue_message_inbox_email on public.messages;
create trigger queue_message_inbox_email after insert on public.messages for each row execute function public.queue_derived_inbox_email();
drop trigger if exists queue_report_inbox_email on public.incident_reports;
create trigger queue_report_inbox_email after insert on public.incident_reports for each row execute function public.queue_derived_inbox_email();
drop trigger if exists queue_completed_inbox_email on public.bookings;
create trigger queue_completed_inbox_email after update of booking_status on public.bookings for each row execute function public.queue_derived_inbox_email();

-- Staff should receive the operational notification in both their app and email.
create or replace function public.notify_lco_operational_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_type text; v_title text; v_id bigint;
begin
  if tg_table_name='bookings' then
    v_type:='booking_created'; v_title:='New booking'; v_id:=new.booking_id;
  elsif tg_table_name='payments' then
    if new.payment_status<>'paid' then return new; end if;
    if tg_op='UPDATE' and old.payment_status is not distinct from new.payment_status then return new; end if;
    v_type:='payment_received'; v_title:='Payment received'; v_id:=new.payment_id;
  elsif tg_table_name='tutor_applications' then
    v_type:='tutor_application'; v_title:='Tutor application submitted'; v_id:=new.application_id;
  else return new;
  end if;
  insert into public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id)
    select u.user_id,v_type,v_title,'A new update is available for LCO review.',tg_table_name,v_id
    from public.users u where u.account_status='active' and exists(
      select 1 from public.user_roles r where r.user_id=u.user_id and r.role='lco' and r.is_active);
  return new;
end;
$$;
revoke all on function public.notify_lco_operational_event() from public,anon,authenticated;
drop trigger if exists notify_lco_booking on public.bookings;
create trigger notify_lco_booking after insert on public.bookings for each row execute function public.notify_lco_operational_event();
drop trigger if exists notify_lco_payment on public.payments;
create trigger notify_lco_payment after insert or update of payment_status on public.payments for each row execute function public.notify_lco_operational_event();
drop trigger if exists notify_lco_application on public.tutor_applications;
create trigger notify_lco_application after insert on public.tutor_applications for each row execute function public.notify_lco_operational_event();

commit;
