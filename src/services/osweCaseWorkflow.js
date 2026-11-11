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
export const caseReviewContext = (reportId) =>
  request("oswe_case_review_context", { p_report_id: reportId });
export const listRecommendationSources = () =>
  request("oswe_policy_source_catalog");
export const verifyRecommendationSource = (kind, id, contentHash, notes) =>
  request("oswe_verify_policy_source", {
    p_kind: kind,
    p_id: id,
    p_expected_hash: contentHash,
    p_notes: notes,
  });
export const verifyCaseCondition = (caseId, index, completed, notes) =>
  request("oswe_verify_case_condition", {
    p_case_id: caseId,
    p_index: index,
    p_completed: completed,
    p_notes: notes,
  });
export const recordReferralResponse = (caseId, notes) =>
  request("oswe_record_referral_response", {
    p_case_id: caseId,
    p_notes: notes,
  });
export const addReferralCondition = (caseId, text, notes) =>
  request("oswe_add_referral_condition", {
    p_case_id: caseId,
    p_text: text,
    p_notes: notes,
  });
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
export const saveOccurrenceMapping = (
  type,
  occurrence,
  action,
  basis,
  excerpt,
) =>
  request("save_oswe_occurrence_mapping", {
    p_type: type,
    p_occurrence: occurrence,
    p_action: action || null,
    p_basis: basis,
    p_excerpt: excerpt,
  });
