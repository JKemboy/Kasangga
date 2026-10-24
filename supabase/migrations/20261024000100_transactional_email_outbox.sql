-- Additive email delivery queue. Does not change PayMongo handlers or payment state.
begin;
create table public.transactional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  kind text not null check (kind in ('payment_received','booking_confirmed','tutor_booked','session_reminder','payment_transferred')),
  booking_id bigint not null references public.bookings(booking_id),
  recipient_id uuid not null references public.users(user_id),
  recipient_role text not null check (recipient_role in ('learner','tutor')),
  recipient_email text not null,
  payload jsonb not null,
  due_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  lease_token uuid,
  locked_at timestamptz,
  first_attempt_at timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index transactional_email_due on public.transactional_email_outbox(due_at) where status in ('pending','processing');
alter table public.transactional_email_outbox enable row level security;
revoke all on public.transactional_email_outbox from public, anon, authenticated;
grant select, update on public.transactional_email_outbox to service_role;

create function public.enqueue_transactional_email(p_booking bigint, p_kind text, p_role text, p_key text, p_due timestamptz default now(), p_payment bigint default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v record; v_amount numeric;
begin
  select b.*, s.title as current_title, s.subject as current_subject,
    case when p_role='learner' then learner.user_id else tutor.user_id end as recipient,
    case when p_role='learner' then learner.csu_email else tutor.csu_email end as email,
    case when p_role='learner' then learner.first_name else tutor.first_name end as recipient_name,
    case when p_role='learner' then concat_ws(' ',tutor.first_name,tutor.last_name) else concat_ws(' ',learner.first_name,learner.last_name) end as peer
    into v from public.bookings b
    join public.services s on s.service_id=b.service_id
    join public.tutor_profiles tp on tp.tutor_profile_id=s.tutor_profile_id
    join public.users learner on learner.user_id=b.learner_id
    join public.users tutor on tutor.user_id=tp.user_id where b.booking_id=p_booking;
  if not found or nullif(trim(v.email),'') is null then return; end if;
  if p_kind='payment_transferred' then
    select sum(tutor_amount) into v_amount from public.payment_allocations where payment_id=p_payment;
  elsif p_kind='payment_received' then
    select gross_amount into v_amount from public.payments where payment_id=p_payment;
  else v_amount:=v.amount;
  end if;
  insert into public.transactional_email_outbox(event_key,kind,booking_id,recipient_id,recipient_role,recipient_email,payload,due_at)
  values(p_key,p_kind,p_booking,v.recipient,p_role,v.email,jsonb_build_object(
    'name',v.recipient_name,'peer',v.peer,'service',coalesce(v.service_title_snapshot,v.current_title),
    'subject',coalesce(v.service_subject_snapshot,v.current_subject),'topic',v.specific_topic,
    'date',v.session_date,'start',v.start_time,'end',v.end_time,'session_type',v.session_type,
    'amount',v_amount,'booking_id',p_booking),p_due)
  on conflict(event_key) do nothing;
end $$;

create function public.queue_booking_emails() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_start timestamptz;
begin
  if new.booking_status='confirmed' and new.payment_status='paid' then
    perform public.enqueue_transactional_email(new.booking_id,'booking_confirmed','learner','booking-confirmed:'||new.booking_id);
    perform public.enqueue_transactional_email(new.booking_id,'tutor_booked','tutor','tutor-booked:'||new.booking_id);
    v_start:=(new.session_date+new.start_time) at time zone 'Asia/Manila';
    -- A booking made within 24 hours gets its confirmation, not a late reminder.
    if v_start-interval '1 day'>now() then
      perform public.enqueue_transactional_email(new.booking_id,'session_reminder','learner','reminder:learner:'||new.booking_id||':'||v_start::text,v_start-interval '1 day');
      perform public.enqueue_transactional_email(new.booking_id,'session_reminder','tutor','reminder:tutor:'||new.booking_id||':'||v_start::text,v_start-interval '1 day');
    end if;
  end if;
  return new;
end $$;
create trigger queue_booking_transactional_emails after insert or update of booking_status,payment_status,session_date,start_time on public.bookings
for each row execute function public.queue_booking_emails();

create function public.queue_payment_emails() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.payment_status='paid' then
    if tg_op='INSERT' then
      perform public.enqueue_transactional_email(new.booking_id,'payment_received','learner','payment-received:'||new.payment_id,now(),new.payment_id);
    elsif old.payment_status is distinct from 'paid' then
      perform public.enqueue_transactional_email(new.booking_id,'payment_received','learner','payment-received:'||new.payment_id,now(),new.payment_id);
    end if;
    if new.transferred_at is not null then
      perform public.enqueue_transactional_email(new.booking_id,'payment_transferred','tutor','payment-transferred:'||new.payment_id,now(),new.payment_id);
    end if;
  end if;
  return new;
end $$;
create trigger queue_payment_transactional_emails after insert or update of payment_status,transferred_at on public.payments
for each row execute function public.queue_payment_emails();

create function public.claim_transactional_emails(p_limit integer default 10)
returns setof public.transactional_email_outbox
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Never send reminders after cancellation, completion, refund, or a changed schedule.
  update public.transactional_email_outbox q set status='cancelled',last_error='Session no longer eligible for this reminder'
    from public.bookings b where b.booking_id=q.booking_id and q.kind='session_reminder'
    and q.status in ('pending','processing') and (
      b.booking_status<>'confirmed' or b.payment_status<>'paid'
      or b.session_date::text<>q.payload->>'date' or b.start_time::text<>q.payload->>'start'
      or (b.session_date+b.start_time) at time zone 'Asia/Manila' <= now());
  -- Resend idempotency lasts 24 hours. Do not automatically retry beyond that window.
  update public.transactional_email_outbox set status='failed',last_error='Retry window exhausted; inspect provider logs before any manual retry'
    where status in ('pending','processing') and (attempts>=8 or first_attempt_at<now()-interval '23 hours');
  return query
    with due as (
      select id from public.transactional_email_outbox
      where due_at<=now() and (status='pending' or (status='processing' and locked_at<now()-interval '10 minutes'))
      order by due_at for update skip locked limit greatest(1,least(p_limit,20))
    ) update public.transactional_email_outbox q set status='processing',attempts=q.attempts+1,
      lease_token=gen_random_uuid(),locked_at=now(),first_attempt_at=coalesce(q.first_attempt_at,now())
      from due where q.id=due.id returning q.*;
end $$;

revoke all on function public.enqueue_transactional_email(bigint,text,text,text,timestamptz,bigint) from public,anon,authenticated;
revoke all on function public.queue_booking_emails() from public,anon,authenticated;
revoke all on function public.queue_payment_emails() from public,anon,authenticated;
revoke all on function public.claim_transactional_emails(integer) from public,anon,authenticated;
grant execute on function public.claim_transactional_emails(integer) to service_role;
commit;
