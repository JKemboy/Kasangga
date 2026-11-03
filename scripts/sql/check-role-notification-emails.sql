-- Run inside a transaction AFTER role-notification-emails.sql (without its COMMIT).
-- Caller must ROLLBACK: no test notification or email may be delivered.
do $$
declare v_role text; v_user uuid; v_notification bigint; v_count integer; v_before integer;
begin
  -- Isolate default preference tests without persisting any changes.
  delete from public.system_settings where setting_key like 'osas:%'
    or setting_key in ('tutorAlerts','paymentAlerts','incidentAlerts','maintenanceAlerts');
  foreach v_role in array array['learner','tutor','lco','oswe'] loop
    select r.user_id into v_user from public.user_roles r join public.users u using(user_id)
      where r.role=v_role and r.is_active and u.account_status='active'
      and not exists(select 1 from public.user_roles r2 where r2.user_id=r.user_id and r2.is_active
        and r2.role<>r.role and r2.role in ('lco','oswe','tutor')) limit 1;
    if v_user is null then raise exception 'Missing active test role: %',v_role; end if;
    insert into public.notifications(user_id,notification_type,title,message)
      values(v_user,'email_check','Notification integration check','Rollback only') returning notification_id into v_notification;
    select count(*) into v_count from public.transactional_email_outbox q join public.users u on u.user_id=q.recipient_id
      where q.event_key='notification:'||v_notification and q.recipient_role=v_role
      and q.recipient_email=u.csu_email and q.kind='system_notification' and q.booking_id is null;
    if v_count<>1 then raise exception 'Recipient routing failed for %',v_role; end if;
    perform public.enqueue_system_notification_email(v_user,'notification:'||v_notification,'email_check','Check');
    if (select count(*) from public.transactional_email_outbox where event_key='notification:'||v_notification)<>1 then
      raise exception 'Duplicate email queued'; end if;
    update public.notifications set is_read=true where notification_id=v_notification;
    select count(*) into v_before from public.transactional_email_outbox;
    insert into public.notifications(user_id,notification_type,title,message,is_read)
      values(v_user,'activity_read_receipt','Read receipt','check',true);
    if (select count(*) from public.transactional_email_outbox)<>v_before then raise exception 'Read receipt emailed'; end if;
  end loop;
  select user_id into v_user from public.user_roles where role='oswe' and is_active limit 1;
  insert into public.system_settings(setting_key,setting_value,setting_group)
    values('osas:'||v_user,'{"notifications":[{"email":false,"app":true}]}','oswe');
  perform public.enqueue_system_notification_email(v_user,'check:oswe-disabled','osas_queue_update','New case referral','incident_reports');
  if exists(select 1 from public.transactional_email_outbox where event_key='check:oswe-disabled') then
    raise exception 'OSWE disabled email preference ignored'; end if;
  select user_id into v_user from public.user_roles where role='lco' and is_active limit 1;
  insert into public.system_settings(setting_key,setting_value,setting_group) values('paymentAlerts','false','lco');
  perform public.enqueue_system_notification_email(v_user,'check:lco-disabled','payment_received','Payment received','payments');
  if exists(select 1 from public.transactional_email_outbox where event_key='check:lco-disabled') then
    raise exception 'LCO disabled alert preference ignored'; end if;
end;
$$;
select 'PASS: four roles, recipient emails, deduplication, read receipts and preferences' as result;
rollback;
