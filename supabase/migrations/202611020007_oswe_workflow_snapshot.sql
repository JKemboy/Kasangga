-- Current OSWE workflow functions, including all-insufficient/no-hold handling.
BEGIN;
CREATE OR REPLACE FUNCTION public.oswe_record_decision_and_hold(p_report_id bigint, p_decision jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE report public.incident_reports%rowtype; case_row public.cases%rowtype; clearance_id bigint; details jsonb; notes text;
BEGIN
 IF NOT public.is_portal_osas() THEN RAISE EXCEPTION 'Active OSWE access is required.'; END IF;
 SELECT * INTO report FROM public.incident_reports WHERE report_id=p_report_id FOR UPDATE;
 IF NOT FOUND OR coalesce(report.osas_referral_status,'') NOT IN ('referred','case_opened') THEN RAISE EXCEPTION 'Referred report not found.'; END IF;
 SELECT * INTO case_row FROM public.cases WHERE report_id=p_report_id ORDER BY case_id DESC LIMIT 1 FOR UPDATE;
 IF case_row.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.case_decisions WHERE case_id=case_row.case_id) THEN RAISE EXCEPTION 'This case already has a decision.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.incident_evidence WHERE report_id=p_report_id) OR EXISTS(SELECT 1 FROM public.incident_evidence WHERE report_id=p_report_id AND coalesce(validation_status,'') NOT IN ('validated','insufficient')) THEN RAISE EXCEPTION 'Review every evidence item first.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.incident_evidence WHERE report_id=p_report_id AND coalesce(validation_status,'')<>'insufficient') THEN RAISE EXCEPTION 'All evidence is insufficient. Use Record No Violation & Archive; clearance must remain unchanged.'; END IF;
 notes:=btrim(coalesce(p_decision->>'notes',''));
 IF length(notes)<30 OR length(btrim(coalesce(p_decision->>'basis','')))=0 OR length(btrim(coalesce(p_decision->>'condition','')))=0 OR p_decision->>'outcome' IS NULL OR p_decision->>'outcome' NOT IN ('No Violation','Case Dismissed','Counseled','Verbal Warning','Written Warning','Referred for Further Action','Clearance Hold Recommended') THEN RAISE EXCEPTION 'Complete the outcome, decision basis, policy reference and clearance instructions.'; END IF;

 IF case_row.case_id IS NULL THEN
 INSERT INTO public.cases(report_id,case_type,priority,case_status,assigned_osas_id) VALUES(p_report_id,report.incident_type,report.priority,'open',auth.uid()) RETURNING * INTO case_row;
 END IF;
 details:=p_decision||jsonb_build_object('conditionDone',false,'workflow','clearance_handoff','at',now(),'notify',true);
 INSERT INTO public.case_decisions(case_id,decided_by,decision_type,decision_details,clearance_effect) VALUES(case_row.case_id,auth.uid(),p_decision->>'outcome',details::text,'hold_recommended');
 UPDATE public.cases SET case_status='resolved',resolved_at=now(),resolution=p_decision->>'outcome',resolution_notes=notes WHERE case_id=case_row.case_id;
 UPDATE public.incident_reports SET report_status='resolved',osas_referral_status='case_opened' WHERE report_id=p_report_id;
 PERFORM 1 FROM public.users WHERE user_id=report.reported_against FOR UPDATE;
 SELECT clearance_review_id INTO clearance_id FROM public.clearance_reviews WHERE user_id=report.reported_against ORDER BY clearance_review_id DESC LIMIT 1 FOR UPDATE;
 IF clearance_id IS NULL THEN
 INSERT INTO public.clearance_reviews(user_id,academic_year,semester,clearance_status) VALUES(report.reported_against,'Case follow-up','Case follow-up','on_hold') RETURNING clearance_review_id INTO clearance_id;
 END IF;
 INSERT INTO public.clearance_holds(clearance_review_id,case_id,reason,placed_by) VALUES(clearance_id,case_row.case_id,p_decision->>'condition',auth.uid());
 UPDATE public.clearance_reviews SET clearance_status='on_hold',decision_reason=p_decision->>'condition',reviewed_by=auth.uid(),reviewed_at=now() WHERE clearance_review_id=clearance_id;
 INSERT INTO public.case_actions(case_id,performed_by,action_type,action_details) VALUES(case_row.case_id,auth.uid(),'decision',jsonb_build_object('notes','Decision recorded; case resolved and transferred to Student Clearance.','clearance_review_id',clearance_id)::text);
 INSERT INTO public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id) VALUES(report.reported_against,'case_update','Decision recorded — clearance on hold','OSWE recorded a decision. Download your completion form in My Reports and submit it in person to OSWE for clearance.','cases',case_row.case_id);
 INSERT INTO public.audit_logs(user_id,action,module,target_type,target_id,new_value,result) VALUES(auth.uid(),'Decision recorded and clearance blocked','oswe','cases',case_row.case_id,details::text,'success');
 RETURN clearance_id;
END $function$;

CREATE OR REPLACE FUNCTION public.oswe_record_no_violation(p_report_id bigint, p_notes text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE report public.incident_reports%rowtype; case_row public.cases%rowtype; details jsonb;
BEGIN
 IF NOT public.is_portal_osas() THEN RAISE EXCEPTION 'Active OSWE access is required.'; END IF;
 IF length(btrim(coalesce(p_notes,'')))<30 THEN RAISE EXCEPTION 'Explain why the evidence is insufficient (at least 30 characters).'; END IF;
 SELECT * INTO report FROM public.incident_reports WHERE report_id=p_report_id FOR UPDATE;
 IF NOT FOUND OR coalesce(report.osas_referral_status,'') NOT IN ('referred','case_opened') THEN RAISE EXCEPTION 'Referred report not found.'; END IF;
 SELECT * INTO case_row FROM public.cases WHERE report_id=p_report_id ORDER BY case_id DESC LIMIT 1 FOR UPDATE;
 IF case_row.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.case_decisions WHERE case_id=case_row.case_id) THEN RAISE EXCEPTION 'This case already has a decision.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.incident_evidence WHERE report_id=p_report_id) OR EXISTS(SELECT 1 FROM public.incident_evidence WHERE report_id=p_report_id AND coalesce(validation_status,'')<>'insufficient') THEN RAISE EXCEPTION 'Every evidence item must be reviewed and marked Insufficient before recording this decision.'; END IF;
 IF case_row.case_id IS NULL THEN
  INSERT INTO public.cases(report_id,case_type,priority,case_status,assigned_osas_id) VALUES(p_report_id,report.incident_type,report.priority,'open',auth.uid()) RETURNING * INTO case_row;
 END IF;
 details:=jsonb_build_object('outcome','No Violation','notes',btrim(p_notes),'basis','Insufficient evidence after OSWE review.','condition','','conditionDone',true,'workflow','no_violation_archive','at',now(),'notify',true);
 INSERT INTO public.case_decisions(case_id,decided_by,decision_type,decision_details,clearance_effect) VALUES(case_row.case_id,auth.uid(),'No Violation',details::text,'none');
 UPDATE public.cases SET case_status='resolved',resolved_at=now(),resolution='No Violation',resolution_notes=btrim(p_notes),archived_at=now(),archived_by=auth.uid() WHERE case_id=case_row.case_id;
 UPDATE public.incident_reports SET report_status='resolved',osas_referral_status='case_opened' WHERE report_id=p_report_id;
 INSERT INTO public.case_actions(case_id,performed_by,action_type,action_details) VALUES(case_row.case_id,auth.uid(),'decision',details::text),(case_row.case_id,auth.uid(),'archive',jsonb_build_object('notes','No Violation recorded due to insufficient evidence. Clearance is unchanged.')::text);
 INSERT INTO public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id) VALUES(report.reported_against,'case_update','No Violation — case archived','OSWE recorded No Violation after reviewing the evidence. This decision does not place your clearance on hold.','cases',case_row.case_id);
 INSERT INTO public.audit_logs(user_id,action,module,target_type,target_id,new_value,result) VALUES(auth.uid(),'No Violation recorded and archived','oswe','cases',case_row.case_id,details::text,'success');
 RETURN case_row.case_id;
END $function$;

CREATE OR REPLACE FUNCTION public.oswe_review_student_clearance(p_clearance_id bigint, p_status text, p_notes text, p_form_verified boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE review public.clearance_reviews%rowtype; hold record;
BEGIN
 IF NOT public.is_portal_osas() THEN RAISE EXCEPTION 'Active OSWE access is required.'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('cleared','on_hold') THEN RAISE EXCEPTION 'Choose Cleared or Place Clearance On Hold.'; END IF;
 IF length(btrim(coalesce(p_notes,'')))<15 THEN RAISE EXCEPTION 'Record at least 15 characters of review notes.'; END IF;
 SELECT * INTO review FROM public.clearance_reviews WHERE clearance_review_id=p_clearance_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Clearance review not found.'; END IF;
 IF p_status='cleared' THEN
  IF p_form_verified IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirm the signed form was received and verified in person.'; END IF;
  FOR hold IN SELECT DISTINCT h.case_id FROM public.clearance_holds h JOIN public.clearance_reviews cr USING(clearance_review_id) WHERE cr.user_id=review.user_id AND h.hold_status='active' LOOP
   UPDATE public.case_decisions SET decision_details=(coalesce(decision_details::jsonb,'{}')||jsonb_build_object('conditionDone',true,'completedAt',now(),'completionForm',jsonb_build_object('submittedAt',now(),'verifiedAt',now(),'verifiedBy',auth.uid(),'notes',p_notes)))::text WHERE case_id=hold.case_id;
   UPDATE public.cases SET case_status='resolved',resolved_at=coalesce(resolved_at,now()) WHERE case_id=hold.case_id;
  END LOOP;
  UPDATE public.clearance_holds h SET hold_status='released',resolved_at=now() FROM public.clearance_reviews cr WHERE h.clearance_review_id=cr.clearance_review_id AND cr.user_id=review.user_id AND h.hold_status='active';
  UPDATE public.clearance_reviews SET clearance_status='cleared',decision_reason=p_notes,reviewed_by=auth.uid(),reviewed_at=now() WHERE user_id=review.user_id AND clearance_status IN ('on_hold','requires_resolution');
 ELSE
  UPDATE public.case_decisions d SET decision_details=((d.decision_details::jsonb - 'completionForm')||jsonb_build_object('conditionDone',false))::text
  FROM public.cases c JOIN public.incident_reports r USING(report_id) WHERE d.case_id=c.case_id AND r.reported_against=review.user_id AND d.decision_details::jsonb->>'workflow'='clearance_handoff';
  INSERT INTO public.clearance_holds(clearance_review_id,case_id,reason,placed_by)
  SELECT p_clearance_id,c.case_id,p_notes,auth.uid() FROM public.cases c JOIN public.incident_reports r USING(report_id) WHERE r.reported_against=review.user_id AND EXISTS(SELECT 1 FROM public.case_decisions d WHERE d.case_id=c.case_id) AND NOT EXISTS(SELECT 1 FROM public.clearance_holds h WHERE h.case_id=c.case_id AND h.clearance_review_id=p_clearance_id AND h.hold_status='active');
 END IF;
 UPDATE public.clearance_reviews SET clearance_status=p_status,decision_reason=p_notes,reviewed_by=auth.uid(),reviewed_at=now() WHERE clearance_review_id=p_clearance_id;
 INSERT INTO public.notifications(user_id,notification_type,title,message,related_entity_type,related_entity_id) VALUES(review.user_id,'clearance_update','Clearance status updated',CASE WHEN p_status='cleared' THEN 'OSWE verified your submitted form. Your clearance is cleared.' ELSE 'OSWE placed your clearance on hold. Contact OSWE for instructions.' END,'clearance_reviews',p_clearance_id);
 INSERT INTO public.audit_logs(user_id,action,module,target_type,target_id,previous_value,new_value,result) VALUES(auth.uid(),'Clearance reviewed','oswe','clearance_reviews',p_clearance_id,to_jsonb(review)::text,jsonb_build_object('status',p_status,'notes',p_notes,'form_verified',p_form_verified)::text,'success');
END $function$;

CREATE OR REPLACE FUNCTION public.oswe_validate_case_evidence(p_evidence_id bigint, p_result text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE evidence public.incident_evidence%rowtype; report public.incident_reports%rowtype;
BEGIN
 IF NOT public.is_portal_osas() THEN RAISE EXCEPTION 'Active OSWE access is required.'; END IF;
 IF p_result IS NULL OR p_result NOT IN ('validated','insufficient') THEN RAISE EXCEPTION 'Choose Valid or Insufficient.'; END IF;
 SELECT * INTO evidence FROM public.incident_evidence WHERE evidence_id=p_evidence_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evidence not found.'; END IF;
 SELECT * INTO report FROM public.incident_reports WHERE report_id=evidence.report_id FOR UPDATE;
 IF coalesce(report.osas_referral_status,'') NOT IN ('referred','case_opened') THEN RAISE EXCEPTION 'Only referred reports can be reviewed.'; END IF;
 IF EXISTS(SELECT 1 FROM public.cases c WHERE c.report_id=report.report_id AND (c.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.case_decisions d WHERE d.case_id=c.case_id))) THEN RAISE EXCEPTION 'Decided case evidence is read-only.'; END IF;
 PERFORM 1 FROM public.incident_evidence WHERE evidence_id=p_evidence_id FOR UPDATE;
 INSERT INTO public.evidence_validations(evidence_id,reviewer_id,validation_result,reviewer_notes)
 VALUES(p_evidence_id,auth.uid(),p_result,CASE WHEN p_result='validated' THEN 'Evidence reviewed individually and marked valid by OSWE.' ELSE 'Evidence reviewed individually and marked insufficient by OSWE.' END);
 UPDATE public.incident_evidence SET validation_status=p_result WHERE evidence_id=p_evidence_id;
 INSERT INTO public.audit_logs(user_id,action,module,target_type,target_id,new_value,result)
 VALUES(auth.uid(),'Evidence reviewed','oswe','incident_evidence',p_evidence_id,jsonb_build_object('result',p_result)::text,'success');
END $function$;

REVOKE ALL ON FUNCTION public.oswe_validate_case_evidence(bigint,text), public.oswe_record_decision_and_hold(bigint,jsonb), public.oswe_review_student_clearance(bigint,text,text,boolean), public.oswe_record_no_violation(bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.oswe_validate_case_evidence(bigint,text), public.oswe_record_decision_and_hold(bigint,jsonb), public.oswe_review_student_clearance(bigint,text,text,boolean), public.oswe_record_no_violation(bigint,text) TO authenticated;
COMMIT;
