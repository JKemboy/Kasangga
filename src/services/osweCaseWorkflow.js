import { getSupabaseClient } from "./supabaseClient.js";
async function request(name, args) {
  const { data, error } = await getSupabaseClient().rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
export const validateCaseEvidence = (id, result) =>
  request("oswe_validate_case_evidence", {
    p_evidence_id: id,
    p_result: result,
  });
export const startCaseReview = (reportId) =>
  request("oswe_start_case_review", { p_report_id: reportId });
export const recordDecisionAndHold = (id, decision) =>
  request("oswe_record_decision_and_hold", {
    p_report_id: id,
    p_decision: decision,
  });
export const reviewStudentClearance = (id, status, notes, verified) =>
  request("oswe_review_student_clearance", {
    p_clearance_id: id,
    p_status: status,
    p_notes: notes,
    p_form_verified: verified,
  });

export const recordNoViolation = (id, notes) =>
  request("oswe_record_no_violation", { p_report_id: id, p_notes: notes });
export const caseViolationHistory = (reportId) =>
  request("oswe_same_type_violation_history", { p_report_id: reportId });
export async function listEscalationRules() {
  const { data, error } = await getSupabaseClient()
    .from("oswe_escalation_rules")
    .select("*")
    .order("incident_type");
  if (error) throw new Error(error.message);
  return data || [];
}
export const saveEscalationRule = (type, action, excerpt) =>
  request("save_oswe_escalation_rule", {
    p_type: type,
    p_action: action || null,
    p_excerpt: excerpt,
  });
