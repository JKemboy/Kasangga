import { useEffect, useRef } from "react";
import { LockKeyhole, X } from "lucide-react";
import { primary } from "../tutor/workspace/ui.jsx";
import "./incident-details.css";
import "./audit-details.css";

export const auditTimestamp = (value) =>
  new Date(value).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const Badge = ({ result }) => (
  <span className={`au-status ${result === "Failed" ? "suspended" : "active"}`}>
    {result}
  </span>
);
export default function AuditDetails({ record: r, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const fields = [
    ["Log ID", r.id],
    ["User / Admin", `${r.actor} · ${r.email}`],
    ["Action", r.action],
    ["Module", r.module],
    ["Target", r.target],
    ["Previous Value", r.before ?? "—"],
    ["New Value", r.after ?? "—"],
    ["Date / Time", `${auditTimestamp(r.at)} (Asia/Manila)`],
    ["IP Address", r.ip || "Not collected"],
    ["Device", r.device || "Not collected"],
    ["Result", <Badge result={r.result} />],
    ...(r.notes ? [["Detail", r.notes]] : []),
  ];
  return (
    <dialog
      ref={ref}
      className="admin-incident-details audit-details"
      aria-label={`Audit record ${r.id}`}
      onCancel={onClose}
    >
      <header>
        <div>
          <h2>
            {r.id} <Badge result={r.result} />
          </h2>
          <p>
            {r.action} · {r.module}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close audit details"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="aid-body">
        <p className="audit-lock">
          <LockKeyhole size={18} />
          Read-only audit record. It can't be edited or deleted.
        </p>
        <dl>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="audit-source">
          {"Recorded in the CampusTutor database."}
        </p>
      </div>
      <footer>
        <button className={primary} onClick={onClose}>
          Close
        </button>
      </footer>
    </dialog>
  );
}
export function auditSummary(rows) {
  const escape = (value) =>
    String(value ?? "—").replace(
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
  const headings = [
    "Log ID",
    "User / Admin",
    "Action",
    "Module",
    "Target",
    "Date / Time (Asia/Manila)",
    "IP Address",
    "Result",
    "Source",
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>CampusTutor Audit Logs</title><style>@page{size:A4 landscape;margin:12mm}body{font:11px Arial;color:#17212b}h1{color:#00542f}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #ddd;padding:8px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}th{background:#edf6f0}@media print{button{display:none}}</style></head><body><h1>Audit Logs</h1><p>${rows.length} matching records. Read-only database workflow events.</p><button onclick="window.print()">Print / Save as PDF</button><table><thead><tr>${headings.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${[r.id, `${r.actor} · ${r.email}`, r.action, r.module, r.target, auditTimestamp(r.at), r.ip, r.result, r.source].map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`).join("") || '<tr><td colspan="9">No matching records.</td></tr>'}</tbody></table></body></html>`;
}
