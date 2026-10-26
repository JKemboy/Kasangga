-- Read incoming alerts through the same booking-participant boundary as chat.
-- Do not grant direct access to the private messages/conversations tables.
create or replace function public.list_my_message_notifications()
returns table(message_id bigint,message_content text,sent_at timestamptz,booking_id bigint)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.users where user_id=auth.uid() and lower(account_status)='active') then
  raise exception 'An active account is required to view message notifications.';
 end if;
 return query
 select m.message_id,m.message_content::text,m.sent_at::timestamptz,b.booking_id
 from public.messages m
 join public.conversations c on c.conversation_id=m.conversation_id
 join public.bookings b on b.booking_id=c.booking_id
 join public.services s on s.service_id=b.service_id
 join public.tutor_profiles tp on tp.tutor_profile_id=s.tutor_profile_id
 where auth.uid() in (b.learner_id,tp.user_id) and m.sender_id<>auth.uid()
 order by m.sent_at desc,m.message_id desc limit 50;
end $$;
revoke all on function public.list_my_message_notifications() from public,anon;
grant execute on function public.list_my_message_notifications() to authenticated;
