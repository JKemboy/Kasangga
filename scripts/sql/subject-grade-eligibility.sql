BEGIN;
CREATE OR REPLACE FUNCTION public.enforce_tutor_subject_grades()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE subject text; grade_text text; verification jsonb;
BEGIN
 IF lower(NEW.application_status)='approved' AND lower(coalesce(OLD.application_status,''))<>'approved' THEN
  verification := NEW.application_details->'grade_verification';
  IF verification->>'reviewer' IS DISTINCT FROM auth.uid()::text OR jsonb_typeof(NEW.application_details->'subjects') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.application_details->'subjects')=0 THEN
   RAISE EXCEPTION 'Verify the grade for every applied subject before approval.';
  END IF;
  FOR subject IN SELECT jsonb_array_elements_text(NEW.application_details->'subjects') LOOP
   grade_text := verification->'grades'->>subject;
   IF grade_text IS NULL OR grade_text !~ '^[0-9]+([.][0-9]+)?$' THEN RAISE EXCEPTION 'Enter the verified subject grade for %.',subject; END IF;
   IF grade_text::numeric < 1 OR grade_text::numeric > 1.75 THEN RAISE EXCEPTION 'Subject % requires a grade of 1.00–1.75.',subject; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.review_tutor_application_with_grades(p_application_id bigint, p_status text, p_notes text, p_reason text, p_requested_changes jsonb, p_subject_grades jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='lco' AND is_active) THEN RAISE EXCEPTION 'Active LCO access is required.'; END IF;
 IF p_status IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'This action is for subject grade approval.'; END IF;
 PERFORM 1 FROM public.tutor_applications WHERE application_id=p_application_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Tutor application not found.'; END IF;
 UPDATE public.tutor_applications SET application_details=jsonb_set(coalesce(application_details,'{}'::jsonb),'{grade_verification}',jsonb_build_object('grades',p_subject_grades,'reviewer',auth.uid(),'reviewed_at',now())) WHERE application_id=p_application_id;
 PERFORM public.review_tutor_application(p_application_id,p_status,p_notes,p_reason,p_requested_changes);
END $function$
;
DROP TRIGGER IF EXISTS enforce_tutor_subject_grades ON public.tutor_applications;
CREATE TRIGGER enforce_tutor_subject_grades BEFORE UPDATE OF application_status ON public.tutor_applications FOR EACH ROW EXECUTE FUNCTION public.enforce_tutor_subject_grades();
REVOKE ALL ON FUNCTION public.review_tutor_application_with_grades(bigint,text,text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_tutor_application_with_grades(bigint,text,text,text,jsonb,jsonb) TO authenticated;
COMMIT;
