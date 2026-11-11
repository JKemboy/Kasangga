export function overviewCaseStatus(record) {
  if (
    record.decision ||
    record.archived ||
    record.databaseStatus === "resolved" ||
    ["Resolved", "Closed / No Finding"].includes(record.status)
  )
    return "Resolved";
  // Legacy evidence-waiting cases remain part of the active review count.
  if (record.status === "Awaiting Evidence") return "Under Review";
  if (record.status === "Pending Decision") return "Pending Decision";
  if (
    [
      "Under Review",
      "Under Institutional Review",
      "Pending Completion",
      "Pending Referral",
    ].includes(record.status)
  )
    return "Under Review";
  return "Open";
}

export function pendingOverviewActions(cases, clearances, evidence) {
  const active = cases.filter(
    (record) => overviewCaseStatus(record) !== "Resolved",
  );
  return {
    evidence: evidence.filter(
      (item) =>
        active.some(
          (record) => record.reportDatabaseId === item.reportDatabaseId,
        ) && !["Validated", "Insufficient"].includes(item.status),
    ),
    review: active.filter((record) =>
      ["Open", "Under Review", "Pending Decision"].includes(
        overviewCaseStatus(record),
      ),
    ),
    clearance: clearances.filter((record) =>
      ["Pending Review", "Pending", "Blocked", "On Hold"].includes(
        record.status,
      ),
    ),
  };
}
