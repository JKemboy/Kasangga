const same = (left, right) =>
  left != null && right != null && String(left) === String(right);

export function lcoNotificationDestination(notification, records = {}) {
  let target = notification;
  if (["cases", "incident_evidence"].includes(notification.entityType)) {
    const report = (records.incidents || []).find((row) =>
      notification.entityType === "cases"
        ? row.osweCaseId === `CASE-${notification.entityId}`
        : row.evidence?.some((item) => same(item.id, notification.entityId)),
    );
    if (report)
      target = {
        ...notification,
        entityType: "incident_reports",
        entityId: report.id,
      };
  }
  const view = {
    tutor_applications: "Tutor Verification",
    payments: "Payments & Transactions",
    refunds: "Payments & Transactions",
    bookings: "Bookings Monitoring",
    services: "Service Management",
    incident_reports: "Incident Reports",
    cases: "Incident Reports",
    incident_evidence: "Incident Reports",
    policies: "Policies & Procedures",
    users: "User Management",
    support_conversations: "Messages",
  }[target.entityType];
  return view ? { view, target } : null;
}

export function osweNotificationDestination(notification, records = {}) {
  const { entityType, entityId } = notification;
  const cases = records.cases || [];
  const incidents = records.incidents || [];
  if (["cases", "incident_reports", "incident_evidence"].includes(entityType)) {
    const evidence =
      entityType === "incident_evidence"
        ? (records.evidence || []).find((row) =>
            same(row.evidenceDatabaseId, entityId),
          )
        : null;
    const reportId =
      evidence?.reportDatabaseId ||
      (entityType === "incident_reports" ? entityId : null);
    const record =
      cases.find((row) =>
        entityType === "cases"
          ? same(row.caseDatabaseId, entityId)
          : same(row.reportDatabaseId, reportId),
      ) || incidents.find((row) => same(row.reportDatabaseId, reportId));
    return { view: "Case Review", kind: "case", record };
  }
  if (entityType === "clearance_reviews")
    return {
      view: "Student Clearance Review",
      kind: "clearance",
      record: (records.clearance || []).find((row) =>
        same(row.clearanceDatabaseId, entityId),
      ),
    };
  if (entityType === "policies")
    return {
      view: "Policies & Procedures",
      kind: "policy",
      query: `POL-${entityId}`,
    };
  return null;
}
