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
export function requiredDecisionConditions(action) {
  return actionDefaultConditions[action]
    ? [...actionDefaultConditions[action], COMPLETION_INSTRUCTION]
    : [];
}
export function decisionAppealStatus(decision) {
  return decision?.appealStatus || decision?.appeal_status || "Not recorded";
}
