import {
  COMPLETION_INSTRUCTION,
  decisionHandbookBasis,
} from "./osweDecisionRules.js";
export const filedStages = ["LCO Review", "OSWE Review", "Resolved"];
export const reportDate = (value) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00+08:00" : value,
      ).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        ...(value.length > 10 ? { timeStyle: "short" } : {}),
      })
    : "Not recorded";
export const aboutStages = [
  "LCO Review",
  "OSWE Review",
  "Clearance Blocked",
  "Under Review",
  "Resolved",
];
export function reportSteps(report, about = false) {
  if (about)
    return ["Referred to OSWE", "OSWE Review", "Decision Recorded", "Resolved"];
  const referred =
    report.case ||
    report.referred_at ||
    ["referred", "case_opened", "closed_no_case"].includes(
      report.osas_referral_status,
    );
  return [
    "Submitted",
    "LCO Review",
    ...(referred ? ["Referred to OSWE", "OSWE Review"] : []),
    "Resolved",
  ];
}
export function lcoOnlyReport(report) {
  return reportSteps(report).length === 3;
}
export function refundSummary(report) {
  const refund = report.refund;
  if (!refund) return "";
  if (refund.confirmed)
    return `${refund.full ? "Full refund" : "Refund"} sent${String(refund.method).toLowerCase().includes("gcash") ? " to your GCash" : " through your recorded payment method"}.`;
  if (refund.status === "pending")
    return "Your related refund request is pending review.";
  if (refund.status === "approved")
    return "Your refund is approved; payment-provider processing is not yet confirmed.";
  if (refund.status === "declined")
    return "Your related refund request was declined.";
  return "Your refund status is recorded; contact LCO for confirmation of delivery.";
}
export function reportStage(report, about = false) {
  if (about) {
    if (report.case_id == null) return reportStage(report, false);
    if (report.holds?.some((hold) => hold.status === "active"))
      return "Clearance Blocked";
    if (caseConditions(report).some((c) => !c.completed)) return "Under Review";
    return report.case_status === "resolved" || report.archived_at
      ? "Resolved"
      : "OSWE Review";
  }
  if (
    report.report_status === "resolved" ||
    report.resolved_at ||
    report.case?.resolved
  )
    return "Resolved";
  return report.case ||
    ["referred", "case_opened"].includes(report.osas_referral_status)
    ? "OSWE Review"
    : "LCO Review";
}
export function reportNotice(report, about = false) {
  const stage = reportStage(report, about);
  if (about && report.case_status === "pending_referral")
    return "OSWE recorded a referral for further action and is awaiting the authority's decision. The clearance hold remains active; follow OSWE's recorded instructions.";
  if (about) {
    if (report.case_id == null)
      return stage === "Resolved"
        ? "The report review is completed. Contact LCO for clarification."
        : stage === "OSWE Review"
          ? "A report about you has been referred to OSWE and is awaiting assessment. No case decision has been recorded."
          : "A report about you is awaiting LCO review. No finding or case decision has been recorded.";
    if (stage === "Clearance Blocked")
      return "An active clearance hold is recorded for this case. Follow the recorded conditions and contact OSWE for verification and release.";
    if (caseConditions(report).some((c) => !c.completed))
      return "A decision is recorded. Complete the conditions below; OSWE updates their completion status.";
    if (stage === "Resolved")
      return `${report.decision?.outcome === "No Violation" ? "Resolved with no violation." : "The case review is completed."} ${caseClearanceText(report)}.`;
    return `OSWE is reviewing this case. ${caseClearanceText(report)}.${report.response_request?.due ? ` Your requested response is due ${reportDate(report.response_request.due)}.` : ""}`;
  }
  if (stage === "Resolved")
    return lcoOnlyReport(report)
      ? `Resolved by Kasangga LCO.${refundSummary(report) ? ` ${refundSummary(report)}` : ""}`
      : report.osas_referral_status === "closed_no_case"
        ? "Review completed. No finding was recorded."
        : "Your report review is completed. Actions taken against another student remain confidential.";
  if (stage === "OSWE Review")
    return report.case
      ? "OSWE is reviewing this case. Check My Reports for status updates. Outcomes for the other student are kept private."
      : "LCO referred this report to OSWE. It is awaiting OSWE assessment; evidence review is pending.";
  const message =
    report.report_status === "submitted"
      ? "Your report is awaiting LCO review."
      : "Kasangga LCO is reviewing your report.";
  return `${message}${refundSummary(report) ? ` ${refundSummary(report)}` : ""}`;
}
export function reportActivity(report, about = false) {
  const events = about
    ? [
        { title: "Referred to OSWE by Kasangga LCO", at: report.referred_at },
        { title: "Case review started by OSWE", at: report.opened_at },
        ...(report.activity || [])
          .filter((a) => a.type !== "opened")
          .map((a) => ({
            title:
              {
                status: "Case review status updated",
                decision: report.decision?.outcome
                  ? `Decision recorded: ${report.decision.outcome}`
                  : "Decision recorded",
                condition: "Clearance condition verification updated",
                archive: "Case archived",
                archive_insufficient: "Case closed without a finding",
                request: "Follow-up evidence requested",
              }[a.type] || "Case updated",
            at: a.at,
          })),
      ]
    : [
        { title: "Report submitted", at: report.submitted_at },
        ...(report.admin_activity || []),
        { title: "Referred to OSWE by Kasangga LCO", at: report.referred_at },
        {
          title: `OSWE opened CASE-${report.case?.case_id} for review`,
          at: report.case?.opened_at,
        },
        {
          title: "Review completed",
          at: report.resolved_at || report.case?.resolved_at,
        },
        ...(report.refund?.confirmed && report.refund.processed_at
          ? [
              {
                title: refundSummary(report).replace(/\.$/, ""),
                at: report.refund.processed_at,
              },
            ]
          : []),
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
export function caseConditions(record) {
  const decision = record.decision;
  if (Array.isArray(decision?.conditions) && decision.conditions.length)
    return decision.conditions
      .filter((c) => c.text)
      .map((c) => ({
        text: c.text,
        completed: decision.condition_done === true || c.completed === true,
        completed_at:
          c.completed_at ||
          (decision.condition_done ? decision.completed_at : null),
      }));
  return decision?.condition
    ? [
        {
          text: decision.condition,
          completed: decision.condition_done === true,
          completed_at: decision.completed_at,
        },
      ]
    : [];
}
export function caseClearanceText(record) {
  if (record.holds?.some((h) => h.status === "active"))
    return "An active clearance hold is recorded for this case";
  if (record.holds?.some((h) => h.status === "released"))
    return "The recorded clearance hold has been released";
  if (record.decision?.clearance_effect === "hold_recommended")
    return "A hold is recommended; no active clearance hold is recorded";
  return "No clearance hold is recorded for this case";
}
export function completionFormStatus(record) {
  const form = record.decision?.completion_form;
  return form?.verified_at
    ? "Verified by OSWE"
    : form?.submitted_at
      ? "Submission recorded"
      : "Submission not recorded";
}
export function completionFormHtml(record, student = {}) {
  if (!record.case_id || !record.decision)
    throw new Error("No recorded decision is available for this form.");
  if (record.decision.outcome === "No Violation")
    throw new Error("No Completion Form is required for No Violation.");
  const table = (rows) =>
    `<table>${rows.map(([label, value]) => `<tr><th>${escape(label)}</th><td>${escape(value || "Not recorded")}</td></tr>`).join("")}</table>`;
  const conditions = caseConditions(record);
  return `<!doctype html><html><head><meta charset="utf-8"><title>CASE-${escape(record.case_id)} Completion Form</title><style>body{font:12px Arial,sans-serif;line-height:1.6;max-width:800px;margin:24px auto;padding:16px;color:#111}h1{font-size:20px;margin-top:0}h2{font-size:14px;margin-top:22px;border-bottom:1px solid #777}table{border-collapse:collapse;width:100%}th,td{border:1px solid #aaa;padding:7px;text-align:left;vertical-align:top}th{width:30%;background:#f3f5f4;font-weight:normal}.signatures{display:flex;gap:30px;margin-top:65px}.signatures>div{flex:1;text-align:center;border-top:1px solid #111;padding-top:8px}small{color:#555}@media print{body{margin:0}}</style></head><body><small>Caraga State University - OSWE</small><h1>OSWE Completion Form</h1><h2>Case</h2>${table(
    [
      ["Case ID", `CASE-${record.case_id}`],
      ["Incident Report ID", `IR-${record.report_id}`],
      ["Case action", record.decision.outcome],
      ["Student Handbook basis", decisionHandbookBasis(record.decision)],
      ["Recorded", record.decision.at],
      ["Concern", record.incident_type],
    ],
  )}<h2>Student</h2>${table([
    ["Full Name", student.name],
    ["Student ID", student.student_id],
    [
      "College / Program",
      [student.college, student.program].filter(Boolean).join(" - "),
    ],
    ["CarSU Email", student.email],
  ])}<h2>Conditions Completed</h2>${conditions.length ? conditions.map((c) => `<p>${c.completed ? "[x]" : "[ ]"} ${escape(c.text)} &nbsp; Date completed: ${escape(c.completed_at || "________________")}</p>`).join("") : "<p>No completion condition is recorded.</p>"}<p>Recorded status: ${conditions.every((c) => c.completed) && conditions.length ? "Completed" : "Pending OSWE verification"}</p><h2>Student Statement</h2><p>I confirm that I have completed the conditions above.</p><p>________________________________________________________________________</p><p>________________________________________________________________________</p><div class="signatures"><div>Student Signature over Printed Name / Date</div><div>OSWE Case Officer Signature / Date</div></div><p>${escape(COMPLETION_INSTRUCTION)} Downloading this form does not mark any condition completed or release a clearance hold.</p><small>Generated from the recorded case details. Submission status: ${escape(completionFormStatus(record))}.</small></body></html>`;
}
