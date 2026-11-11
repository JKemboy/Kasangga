export const COMPLETION_INSTRUCTION =
  "Download the Completion Form and submit the completed document in person at the OSWE office.";
export const THIRD_VIOLATION_BASIS = "Student Handbook Section 7.3.b";
export const actionDefaultConditions = {
  Counseled: [
    "Evaluation session with the Guidance Counselor",
    "Recommended program",
  ],
  "Verbal Warning": ["Written apology to OSWE"],
  "Written Warning": ["Written apology", "Community service (Do Day Slip)"],
  "Referred for Further Action": ["Comply with the VPAA’s decision"],
};
export const caseActions = Object.keys(actionDefaultConditions);
// These are summaries already published in KASANGGA Terms A2/B7, not new
// per-incident escalation mappings or verification of the original handbook.
export const actionConditionTemplates = {
  Counseled: [
    "Attend an evaluation session with the Guidance Counselor",
    "Complete the recommended educational or counseling program",
  ],
  "Verbal Warning": ["Submit a written apology addressed to OSWE"],
  "Written Warning": [
    "Submit a written apology addressed to OSWE",
    "Render mandatory work or community service (Do Day Slip)",
  ],
  "Referred for Further Action": ["Comply with the decision of the VPAA"],
};
export const caseActionDescriptions = {
  Counseled:
    "Referral to the Guidance Counselor or an educational or counseling program (Handbook 7.12, p. 92).",
  "Verbal Warning":
    "Oral reprimand with a written apology, for a first violation (Handbook 7.3.b, p. 85).",
  "Written Warning":
    "Written reprimand with a written apology and community work, for a second violation (Handbook 7.3.b–7.3.c, pp. 86–87).",
  "Referred for Further Action":
    "Grave offense, or a third violation of the same offense, sent to the VPAA (Handbook 7.2.b and 7.3.b, pp. 84, 86).",
};
export const caseActionReferences = {
  Counseled:
    "KASANGGA Terms A2/B7: corrective mechanism; cites Handbook 7.12, p. 92.",
  "Verbal Warning":
    "KASANGGA Terms A2/B7: oral reprimand; cites Handbook 7.3.b, p. 85.",
  "Written Warning":
    "KASANGGA Terms A2/B7: written reprimand and community work; cites Handbook 7.3.b–7.3.c, pp. 86–87 and 7.11, p. 91.",
  "Referred for Further Action":
    "KASANGGA Terms A2/B7: referral to the VPAA; cites Handbook 7.2.b and 7.3.b, pp. 84, 86.",
};
export function evidenceReviewState(items) {
  const reviewed = items.filter((item) =>
    ["Validated", "Insufficient"].includes(item.status),
  ).length;
  return {
    reviewed,
    total: items.length,
    complete: items.length > 0 && reviewed === items.length,
    allInsufficient:
      items.length > 0 && items.every((item) => item.status === "Insufficient"),
  };
}
export function clearanceConditionError(conditions) {
  const seen = new Set();
  for (const item of conditions) {
    const text = item.text.trim();
    if (!text || text.length > 1000)
      return "Each clearance condition needs 1 to 1000 characters.";
    const key = text.toLowerCase();
    if (seen.has(key))
      return "Remove duplicate clearance conditions before recording the decision.";
    seen.add(key);
  }
  return "";
}
export function requiredDecisionConditions(action) {
  return actionDefaultConditions[action]
    ? [...actionDefaultConditions[action], COMPLETION_INSTRUCTION]
    : [];
}
export function decisionAppealStatus(decision) {
  return decision?.appealStatus || decision?.appeal_status || "Not recorded";
}
