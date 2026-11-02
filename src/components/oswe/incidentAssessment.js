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
  return `<!doctype html><html><head><meta charset="utf-8"><title>Incident Monitoring</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd;text-align:left}thead{display:table-header-group}@media print{button{display:none}}</style></head><body><h1>OSWE Incident Monitoring</h1><p>${rows.length} filtered database records. Reports are allegations, not findings.</p><button onclick="window.print()">Print / Save as PDF</button><table><thead><tr>${["Incident", "Booking", "Reporter", "Student", "Type", "Status"].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${[r.id, r.booking, r.reporter, r.student, r.type, r.status].map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}
