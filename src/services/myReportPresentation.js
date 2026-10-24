export const filedStages = ["Admin Review", "OSLD Review", "Resolved"];
export const aboutStages = [
  "Clearance Blocked",
  "Under Review",
  "Awaiting Completion",
  "Resolved",
];
export function reportStage(report, about = false) {
  if (about) {
    if (report.holds?.some((hold) => hold.status === "active"))
      return "Clearance Blocked";
    if (report.decision?.condition && !report.decision.condition_done)
      return "Awaiting Completion";
    return report.case_status === "resolved" || report.archived_at
      ? "Resolved"
      : "Under Review";
  }
  if (
    report.report_status === "resolved" ||
    report.resolved_at ||
    report.case?.resolved
  )
    return "Resolved";
  return report.case ||
    ["referred", "case_opened"].includes(report.osas_referral_status)
    ? "OSLD Review"
    : "Admin Review";
}
export function reportNotice(report, about = false) {
  const stage = reportStage(report, about);
  if (about) {
    if (stage === "Clearance Blocked")
      return "An active clearance hold is recorded for this case. Follow the recorded conditions and contact OSLD for verification and release.";
    if (stage === "Awaiting Completion")
      return "A decision is recorded. Complete the conditions below; OSLD updates their completion status.";
    if (stage === "Resolved")
      return "The case review is completed. Your recorded outcome is shown below.";
    return "OSLD is reviewing this case. A report is an allegation; no decision has been recorded unless shown here.";
  }
  if (stage === "Resolved")
    return report.osas_referral_status === "closed_no_case"
      ? "Review completed. No formal case was opened."
      : "Your report review is completed. Actions taken against another student remain confidential.";
  if (stage === "OSLD Review")
    return "Admin referred this report to OSLD for institutional review.";
  return report.report_status === "submitted"
    ? "Your report is awaiting Admin review."
    : "Kasangga Admin is reviewing your report.";
}
export function reportActivity(report, about = false) {
  const events = about
    ? [
        { title: "Formal case opened by OSLD", at: report.opened_at },
        ...(report.activity || [])
          .filter((a) => a.type !== "opened")
          .map((a) => ({
            title:
              {
                status: "Case review status updated",
                decision: "Decision recorded",
                condition: "Conditions marked completed",
                archive: "Case archived",
                archive_insufficient: "Case closed without a finding",
                request: "Follow-up evidence requested",
              }[a.type] || "Case updated",
            at: a.at,
          })),
      ]
    : [
        { title: "Report submitted", at: report.submitted_at },
        { title: "Admin referred report to OSLD", at: report.referred_at },
        { title: "Formal case opened by OSLD", at: report.case?.opened_at },
        {
          title: "Review completed",
          at: report.resolved_at || report.case?.resolved_at,
        },
      ];
  return events
    .filter((e) => e.at)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function completionFormHtml(record, student = {}) {
  if (!record.case_id || !record.decision)
    throw new Error("No recorded decision is available for this form.");
  return `<!doctype html><html><head><meta charset="utf-8"><title>CASE-${escape(record.case_id)} Completion Form</title><style>body{font:14px Arial,sans-serif;line-height:1.6;max-width:800px;margin:40px auto;padding:20px}h1{font-size:22px;color:#075b35}section{border:1px solid #ccc;padding:16px;margin:16px 0}label{display:block;margin-top:36px}@media print{body{margin:0}}</style></head><body><h1>OSLD Case Completion Form</h1><p>Generated from the Kasangga case record. OSLD verifies completion in person.</p><section><p>Case: CASE-${escape(record.case_id)}</p><p>Student: ${escape(student.name)}</p><p>Student ID: ${escape(student.student_id || "Not recorded")}</p><p>Issue: ${escape(record.incident_type)}</p><p>Decision: ${escape(record.decision.outcome)}</p></section><section><h2>Recorded condition</h2><p>${escape(record.decision.condition || "No condition recorded")}</p><p>Due: ${escape(record.decision.due || "Not recorded")}</p><p>Recorded status: ${record.decision.condition_done ? "Completed" : "Pending OSLD verification"}</p></section><label>Student signature: __________________________ Date: ______________</label><label>Verified by OSLD: __________________________ Date: ______________</label><p>Complete and sign this form, then submit it in person to the OSLD office. Downloading this form does not mark any condition completed or release a clearance hold.</p></body></html>`;
}
