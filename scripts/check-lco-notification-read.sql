-- Rollback-only check: read state persists correctly and stays scoped to owner.
BEGIN;
DO $$
DECLARE
  officer uuid;
  other_user uuid;
  own_notice bigint;
  other_notice bigint;
  changed integer;
BEGIN
  SELECT u.user_id INTO officer FROM public.users u
  JOIN public.user_roles r ON r.user_id = u.user_id
  WHERE u.account_status = 'active' AND r.role = 'lco' AND r.is_active LIMIT 1;
  SELECT user_id INTO other_user FROM public.users
    WHERE user_id <> officer AND account_status = 'active' LIMIT 1;
  IF officer IS NULL OR other_user IS NULL THEN
    RAISE EXCEPTION 'Active LCO and another active account are required for this check';
  END IF;
  INSERT INTO public.notifications(user_id, notification_type, title, message, is_read)
    VALUES (officer, 'activity_read_receipt', 'Rollback-only check', 'Read-state test', false)
    RETURNING notification_id INTO own_notice;
  INSERT INTO public.notifications(user_id, notification_type, title, message, is_read)
    VALUES (other_user, 'activity_read_receipt', 'Rollback-only check', 'Read-state test', false)
    RETURNING notification_id INTO other_notice;
  PERFORM set_config('request.jwt.claim.sub', officer::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.notifications SET is_read = true
    WHERE notification_id IN (own_notice, other_notice);
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Notification updates are not correctly scoped to their owner'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE notification_id = own_notice AND is_read) THEN
    RAISE EXCEPTION 'Own notification read state did not persist';
  END IF;
  EXECUTE 'RESET ROLE';
  IF EXISTS (SELECT 1 FROM public.notifications WHERE notification_id = other_notice AND is_read) THEN
    RAISE EXCEPTION 'Another user notification was incorrectly marked read';
  END IF;
END $$;
ROLLBACK;
