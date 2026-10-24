export function caseReviewLabel(record) {
  if (record.archived || record.status === "Resolved") return "View Case";
  return record.status !== "Open" ||
    record.history?.some((entry) => entry.action === "Begin Review")
    ? "Continue Review"
    : "Open Case";
}
export const caseStages = [
  "Incident Report",
  "OSAS Referral",
  "Formal Case",
  "Evidence Validation",
  "Case Actions",
  "Case Decision",
  "Clearance Effect",
  "Resolution",
  "Archive",
];
export function caseProgress(record, evidence = [], clearance = []) {
  const insufficient = evidence.some((e) => e.status === "Insufficient");
  const holds = clearance
    .flatMap((r) => r.holds || [])
    .filter((h) => String(h.case_id) === String(record.caseDatabaseId));
  let step = "Evidence Validation";
  if (insufficient) step = "Archive";
  else if (record.decision) {
    if (record.decision.condition && !record.decision.conditionDone)
      step = "Resolution";
    else if (
      record.decision.outcome === "Clearance Hold Recommended" &&
      (!holds.length || holds.some((h) => h.hold_status === "active"))
    )
      step = "Clearance Effect";
    else step = "Archive";
  } else if (evidence.length && evidence.every((e) => e.status === "Validated"))
    step =
      record.status === "Pending Decision" ? "Case Decision" : "Case Actions";
  const current = record.archived
    ? caseStages.length
    : caseStages.indexOf(step);
  return caseStages.map((label, index) => ({
    label,
    state:
      index === current
        ? "current"
        : index < current && (!insufficient || record.archived || index < 4)
          ? "completed"
          : "upcoming",
  }));
}
export function casePermissions(record, evidence = [], clearance = []) {
  const step = caseProgress(record, evidence, clearance).find(
    (s) => s.state === "current",
  )?.label;
  const active = !record.archived;
  return {
    step,
    note: active && step === "Case Actions",
    request: active && step === "Case Actions",
    pending:
      active &&
      step === "Case Actions" &&
      ["Open", "Under Review"].includes(record.status),
    decision: active && step === "Case Decision",
    condition: active && step === "Resolution",
    archive: active && step === "Archive",
  };
}
