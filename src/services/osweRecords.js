import { academicYear } from "./academicYear.js";
// OSWE record mapper: converts database snapshot tables into the case, clearance, evidence, archive, and report view models.
const label = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const day = (value) =>
  value
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "";
const json = (value, fallback = {}) => {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
export function mapOsweRecords(db) {
  for (const key of [
    "users",
    "incident_reports",
    "incident_evidence",
    "evidence_validations",
    "cases",
    "case_actions",
    "case_decisions",
    "clearance_reviews",
    "clearance_holds",
    "policies",
    "financial_sessions",
    "notifications",
  ])
    if (!Array.isArray(db?.[key]))
      throw new Error(`OSWE snapshot is missing ${key}.`);
  const users = new Map(db.users.map((u) => [u.user_id, u]));
  const name = (id) => users.get(id)?.name || "Unavailable";
  const incidents = db.incident_reports
    .filter(
      (r) =>
        ["referred", "closed_no_case"].includes(r.osas_referral_status) ||
        db.cases.some((c) => c.report_id === r.report_id),
    )
    .map((r) => {
      const linked = db.cases.find((c) => c.report_id === r.report_id);
      return {
        id: `IR-${r.report_id}`,
        reportDatabaseId: r.report_id,
        booking: r.booking_id ? `BK-${r.booking_id}` : "No booking",
        reporterId: r.reported_by,
        studentUserId: r.reported_against,
        reporter: name(r.reported_by),
        student: name(r.reported_against),
        reporterStudentId: users.get(r.reported_by)?.student_id || "",
        studentId: users.get(r.reported_against)?.student_id || "",
        type: r.incident_type,
        description: r.description,
        priority: r.priority === "normal" ? "Medium" : label(r.priority),
        date: day(r.submitted_at),
        submittedAt: r.submitted_at,
        receivedAt: r.referred_at || r.submitted_at,
        referral:
          r.osas_referral_status === "not_referred"
            ? "Not Referred"
            : "Referred to OSWE",
        caseId: linked ? `CASE-${linked.case_id}` : "",
        status: linked
          ? label(linked.case_status)
          : r.osas_referral_status === "closed_no_case"
            ? "Closed / No Finding"
            : r.report_status === "resolved"
              ? "Resolved"
              : r.osas_referral_status === "referred"
                ? "Awaiting OSWE Assessment"
                : "Awaiting LCO Screening",
        assessment:
          r.osas_assessment ||
          (r.osas_referral_status === "closed_no_case"
            ? { action: "close" }
            : null),
      };
    });
  const cases = db.cases.map((c) => {
    const report = incidents.find((r) => r.reportDatabaseId === c.report_id);
    const decisions = db.case_decisions
      .filter((d) => d.case_id === c.case_id)
      .sort((a, b) => a.decision_id - b.decision_id);
    const latest = decisions.at(-1);
    const decision = latest
      ? {
          ...json(latest.decision_details, { notes: latest.decision_details }),
          outcome: latest.decision_type,
          at: latest.decision_date,
          by: name(latest.decided_by),
        }
      : null;
    const actions = db.case_actions
      .filter((a) => a.case_id === c.case_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return {
      ...report,
      type: c.case_type || report?.type,
      priority: c.priority === "normal" ? "Medium" : label(c.priority),
      caseId: `CASE-${c.case_id}`,
      caseDatabaseId: c.case_id,
      databaseStatus: c.case_status,
      status:
        decision?.workflow !== "clearance_handoff" &&
        decision?.condition &&
        !decision.conditionDone
          ? "Pending Completion"
          : label(c.case_status),
      date: day(c.opened_at),
      openedAt: c.opened_at,
      requested: day(c.opened_at),
      officer: name(c.assigned_osas_id),
      officerId: c.assigned_osas_id,
      archivedBy: c.archived_by ? name(c.archived_by) : "",
      archived: !!c.archived_at,
      archivedAt: c.archived_at,
      resolution: c.resolution,
      resolutionNotes: c.resolution_notes,
      resolvedAt: c.resolved_at,
      decision,
      evidenceRequest: actions
        .map((a) => json(a.action_details).evidenceRequest)
        .filter(Boolean)
        .at(-1),
      history: actions.map((a) => ({
        ...json(a.action_details, { notes: a.action_details }),
        action: label(a.action_type),
        actionLabel: json(a.action_details).actionLabel || label(a.action_type),
        officer: name(a.performed_by),
        at: a.created_at,
      })),
    };
  });
  const criteria = {
    Authenticity: "authenticity_checked",
    Readability: "readability_checked",
    "Context Completeness": "context_complete",
    "Relevance to Case": "relevant_to_case",
    "Source Verification": "source_verified",
    "Signs of Manipulation": "no_manipulation_signs",
  };
  const evidence = db.incident_evidence.map((e) => {
    const report = incidents.find((r) => r.reportDatabaseId === e.report_id);
    return {
      ...report,
      id: `EVD-${e.evidence_id}`,
      evidenceDatabaseId: e.evidence_id,
      reporter: name(e.submitted_by),
      reportId: report?.id,
      evidenceType: e.evidence_type,
      fileName: e.file_name,
      filePath: e.file_path,
      date: day(e.uploaded_at),
      time: e.uploaded_at,
      status:
        e.validation_status === "pending"
          ? "Pending Review"
          : label(e.validation_status),
      history: db.evidence_validations
        .filter((v) => v.evidence_id === e.evidence_id)
        .sort((a, b) => a.validation_id - b.validation_id)
        .map((v) => ({
          status: label(v.validation_result),
          notes: v.reviewer_notes,
          reviewer: name(v.reviewer_id),
          at: v.validated_at,
          criteria: Object.fromEntries(
            Object.entries(criteria).map(([key, column]) => [
              key,
              v[column] ? "Meets criterion" : "Not checked",
            ]),
          ),
        })),
    };
  });
  const clearance = db.clearance_reviews.map((r) => {
    const user = users.get(r.user_id),
      linked = cases.filter((c) => c.studentUserId === r.user_id);
    return {
      id: user?.student_id || r.user_id,
      userId: r.user_id,
      name: name(r.user_id),
      college: user?.college || "",
      program: user?.program || user?.college || "",
      clearanceId: `CLR-${r.clearance_review_id}`,
      clearanceDatabaseId: r.clearance_review_id,
      term: `${r.academic_year} · ${r.semester}`,
      academicYear: r.academic_year,
      semester: r.semester,
      requested: day(r.requested_at),
      requestedAt: r.requested_at,
      reviewedAt: r.reviewed_at,
      reviewed: day(r.reviewed_at),
      status:
        r.clearance_status === "pending"
          ? "Pending Review"
          : label(r.clearance_status),
      caseId: linked[0]?.caseId || "None",
      caseStatus: linked[0]?.status || "None",
      relatedCases: linked,
      holds: db.clearance_holds.filter(
        (h) => h.clearance_review_id === r.clearance_review_id,
      ),
      history: r.reviewed_at
        ? [
            {
              notes: r.decision_reason,
              note: r.decision_reason,
              status: label(r.clearance_status),
              officer: name(r.reviewed_by),
              reviewed: day(r.reviewed_at),
            },
          ]
        : [],
    };
  });
  const archive = cases
    .filter((c) => c.archived || c.databaseStatus === "resolved")
    .map((c) => ({
      ...c,
      full: c,
      status: "Resolved",
      recordDate: day(
        c.archivedAt || c.resolvedAt || c.decision?.at || c.openedAt,
      ),
      officer: c.archivedBy || c.officer,
      incident: c.id,
      opened: c.date,
      resolved: day(c.resolvedAt),
      archived: day(c.archivedAt),
      outcome: c.decision?.outcome || c.resolution || "",
      year: academicYear(
        c.archivedAt || c.resolvedAt || c.decision?.at || c.openedAt,
      ),
      evidence: evidence
        .filter((item) => item.reportDatabaseId === c.reportDatabaseId)
        .map((item) => ({
          ...item,
          filename: item.fileName,
        })),
    }));
  const policies = db.policies.map((p) => ({
    id: `POL-${p.policy_id}`,
    scope: p.policy_scope || "institutional",
    title: p.title,
    category: p.category,
    version: p.version,
    effective: p.effective_date || "",
    owner: p.document_owner,
    status: label(p.status),
    updated: day(p.updated_at),
    documentPath: p.document_path,
    content: p.content || "",
  }));
  const sessions = db.financial_sessions.map((s) => ({
    ...s,
    id: String(s.id),
    status: label(s.status),
    payment: label(s.payment),
    transferredAt: s.transferred_at,
    allocation: {
      gross: Number(s.amount),
      tutor: Number(s.tutor),
      admin: Number(s.oswe ?? s.osas ?? 0),
      maintenance: Number(s.platform || 0),
      platform: Number(s.platform || 0) + Number(s.oswe ?? s.osas ?? 0),
    },
  }));
  const time = (value) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const newest = (dateOf, idOf) => (a, b) =>
    time(dateOf(b)) - time(dateOf(a)) || Number(idOf(b)) - Number(idOf(a));
  incidents.sort(
    newest(
      (r) => r.receivedAt || r.submittedAt,
      (r) => r.reportDatabaseId,
    ),
  );
  cases.sort(
    newest(
      (r) => r.openedAt,
      (r) => r.caseDatabaseId,
    ),
  );
  clearance.sort(
    newest(
      (r) =>
        time(r.reviewedAt) > time(r.requestedAt) ? r.reviewedAt : r.requestedAt,
      (r) => r.clearanceDatabaseId,
    ),
  );
  archive.sort(
    newest(
      (r) => r.archivedAt || r.resolvedAt || r.recordDate,
      (r) => r.caseDatabaseId,
    ),
  );
  return {
    incidents,
    cases,
    evidence,
    clearance,
    archive,
    policies,
    sessions,
    users: db.users,
    notifications: db.notifications
      .filter((n) => n.notification_type !== "activity_read_receipt")
      .map((n) => ({
        id: String(n.notification_id),
        notificationType: n.notification_type,
        title: n.title,
        text: n.message,
        time: n.created_at,
        read: n.is_read,
        entityType: n.related_entity_type,
        entityId: n.related_entity_id,
      })),
    settings: json(db.settings, null),
  };
}
