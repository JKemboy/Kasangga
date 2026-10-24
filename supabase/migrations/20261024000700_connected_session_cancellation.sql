-- Shared learner/tutor cancellation. Payment-provider processing stays separate.
create or replace function public.cancel_chat_session(
  p_booking_id bigint, p_reason text, p_acknowledged boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); b public.bookings%rowtype; tutor uuid;
  payment public.payments%rowtype;
begin
  if actor is null or not exists(select 1 from public.users where user_id=actor and account_status='active') then
    raise exception 'Sign in with an active account to cancel a session.';
  end if;
  if p_acknowledged is distinct from true then raise exception 'Acknowledge the cancellation policy.'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 2200 then raise exception 'Enter a cancellation reason of up to 2200 characters.'; end if;
  select * into b from public.bookings where booking_id=p_booking_id for update;
  if not found then raise exception 'Booking not found.'; end if;
  select tp.user_id into tutor from public.services s join public.tutor_profiles tp using(tutor_profile_id) where s.service_id=b.service_id;
  if actor is distinct from b.learner_id and actor is distinct from tutor then raise exception 'You can only cancel your own sessions.'; end if;
  if b.booking_status='cancelled' then return; end if;
  if b.booking_status not in ('pending','confirmed') or (b.session_date+b.end_time) at time zone 'Asia/Manila' <= now() then
    raise exception 'Only an active session that has not ended can be cancelled.';
  end if;
  update public.bookings set booking_status='cancelled',cancelled_at=now(),cancellation_reason=btrim(p_reason) where booking_id=p_booking_id;
  -- Keep the original paid status. Refund review is represented by refunds.
  for payment in select * from public.payments where booking_id=p_booking_id and payment_status='paid' for update loop
    if not exists(select 1 from public.refunds where payment_id=payment.payment_id) then
      insert into public.refunds(payment_id,requested_by,refund_amount,refund_reason,refund_status)
      values(payment.payment_id,actor,payment.gross_amount,btrim(p_reason),'pending');
    end if;
  end loop;
  insert into public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id)
  select distinct recipient,'session_cancelled','Session cancelled',
    'Booking #'||p_booking_id||' was cancelled. Any paid amount is subject to separate refund review.', 'bookings',p_booking_id
  from unnest(array[b.learner_id,tutor]) recipient where recipient is not null;
  insert into public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id)
  select distinct ur.user_id,'session_cancelled','Session cancellation to review',
    'Booking #'||p_booking_id||' was cancelled. Check its payment and refund review status.', 'bookings',p_booking_id
  from public.user_roles ur join public.users u using(user_id)
  where lower(ur.role)='admin' and ur.is_active and u.account_status='active';
end $$;
revoke all on function public.cancel_chat_session(bigint,text,boolean) from public, anon;
grant execute on function public.cancel_chat_session(bigint,text,boolean) to authenticated;
