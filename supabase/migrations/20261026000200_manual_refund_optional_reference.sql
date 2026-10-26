-- Record a manually completed refund transfer; never calls PayMongo.
create or replace function public.admin_mark_refund_transferred(p_refund_id bigint, p_reference text, p_confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare r public.refunds%rowtype; p public.payments%rowtype; total numeric;
begin
 if not public.is_portal_admin() then raise exception 'An active Admin account is required.'; end if;
 if p_confirmed is distinct from true then raise exception 'Confirm the completed manual refund.'; end if;
 if length(btrim(coalesce(p_reference,'')))>150 then raise exception 'Reference must be at most 150 characters.'; end if;
 select * into r from public.refunds where refund_id=p_refund_id for update;
 if not found then raise exception 'Refund not found.'; end if;
 if r.refund_status='processed' then return; end if;
 if r.refund_status<>'approved' then raise exception 'Approve the refund before marking it as transferred.'; end if;
 select * into p from public.payments where payment_id=r.payment_id for update;
 select coalesce(sum(refund_amount),0)+r.refund_amount into total from public.refunds where payment_id=r.payment_id and refund_status='processed';
 if r.refund_amount<=0 or total>p.gross_amount then raise exception 'The refund exceeds the paid amount.'; end if;
 update public.refunds set refund_status='processed',provider_refund_id='manual:'||coalesce(nullif(btrim(p_reference),''),'record-'||p_refund_id::text),processed_by=auth.uid(),processed_at=now() where refund_id=p_refund_id;
 update public.payments set payment_status=case when total=p.gross_amount then 'refunded' else 'partially_refunded' end where payment_id=p.payment_id;
 update public.bookings set payment_status=case when total=p.gross_amount then 'refunded' else 'partially_refunded' end where booking_id=p.booking_id;
 insert into public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id)
 select learner_id,'refund_transferred','Refund marked as transferred','Admin recorded a refund transfer for booking #'||p.booking_id||'.','bookings',p.booking_id from public.bookings where booking_id=p.booking_id;
end $$;
revoke all on function public.admin_mark_refund_transferred(bigint,text,boolean) from public,anon;
grant execute on function public.admin_mark_refund_transferred(bigint,text,boolean) to authenticated;
