export const assessmentKey = "campustutor:osas-incident-assessments:v1";
export function loadAssessments() {
  return {};
}
export function assessIncident(record, action, notes, cases) {
  if (
    record.caseId ||
    record.assessment ||
    record.referral === "Not Referred" ||
    record.status === "Admin Handling"
  )
    throw Error("This incident is not awaiting OSAS assessment.");
  if (!["open", "close"].includes(action)) throw Error("Invalid assessment.");
  if (action === "close" && notes.trim().length < 10)
    throw Error("Enter at least 10 characters.");
  const at = new Date().toISOString();
  if (action === "close")
    return {
      ...record,
      status: "Closed / No Formal Case",
      assessment: { action, notes: notes.trim(), at, by: "Maria Santos" },
    };
  const year = new Date().getFullYear(),
    numbers = cases.map(
      (c) =>
        Number(c.caseId?.match(new RegExp(`^CASE-${year}-(\\d+)$`))?.[1]) || 0,
    );
  const caseId = `CASE-${year}-${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
  const formalCase = {
    ...record,
    caseId,
    status: "Open",
    officer: "Maria Santos",
    date: at.slice(0, 10),
    history: [
      {
        action: "Formal case opened",
        status: "Open",
        notes:
          "Opened after referral and OSAS assessment. No finding of responsibility.",
        at,
        officer: "Maria Santos",
      },
    ],
  };
  return {
    ...record,
    caseId,
    status: "Open",
    formalCase,
    assessment: { action, at, by: "Maria Santos" },
  };
}
export function incidentSummary(rows) {
  const escape = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  return `<!doctype html><html><head><meta charset="utf-8"><title>Incident Monitoring</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd;text-align:left}thead{display:table-header-group}@media print{button{display:none}}</style></head><body><h1>OSAS Incident Monitoring</h1><p>${rows.length} filtered local records. Reports are allegations, not findings.</p><button onclick="window.print()">Print / Save as PDF</button><table><thead><tr>${["Incident", "Booking", "Reporter", "Student", "Type", "Priority", "Referral", "Case", "Status"].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${[r.id, r.booking, r.reporter, r.student, r.type, r.priority, r.referral, r.caseId, r.status].map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}
