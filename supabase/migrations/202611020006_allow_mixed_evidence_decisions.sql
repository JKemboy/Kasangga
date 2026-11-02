-- Mixed evidence continues to the regular decision flow; all-insufficient evidence retains its separate archive-only guard.
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

COMMIT;
