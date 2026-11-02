export function reportRows({
  filters,
  accounts,
  offerings,
  bookings,
  financial,
  distribution,
  popular,
  months,
  counts,
}) {
  return [
    ["Section", "Metric", "Value"],
    ...Object.entries(filters).map(([k, v]) => ["Filters", k, v || "All"]),
    ["Summary", "Users (cumulative through end date)", accounts.length],
    ["Summary", "Services", offerings.length],
    ["Summary", "Bookings", bookings.length],
    ...Object.entries(financial)
      .filter(([k]) =>
        [
          "count",
          "gross",
          "tutor",
          "admin",
          "maintenance",
          "platform",
        ].includes(k),
      )
      .map(([k, v]) => [
        "Financial",
        k,
        k === "count" ? v : Number(v).toFixed(2),
      ]),
    ...distribution.map((r) => ["Booking status", r.label, r.count]),
    ...popular.map((r) => ["Bookings by service", r.label, r.count]),
    ...months.map((m, i) => ["Monthly bookings", m.prefix, counts[i]]),
  ];
}
export function reportCsv(rows) {
  return rows
    .map((r) =>
      r
        .map(
          (v) =>
            '"' +
            String(v)
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}
export function reportHtml(rows) {
  const escape = (v) =>
    String(v).replace(
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
  return `<!doctype html><html><head><meta charset="utf-8"><title>Kasangga Reports and Analytics</title><style>@page{size:A4;margin:15mm}body{font:12px Arial;color:#17212b}h1{color:#00542f;font-size:22px}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border:1px solid #dce3df}th{background:#edf6f0}thead{display:table-header-group}tr{break-inside:avoid}@media print{button{display:none}}</style></head><body><h1>Reports &amp; Analytics</h1><p>Database records. Financial amounts are in PHP. Filters apply as displayed in the dashboard: college to linked accounts, service to its bookings and transactions, booking status to bookings and transactions.</p><button onclick="window.print()">Print / Save as PDF</button><table><thead><tr>${rows[0].map((v) => `<th>${escape(v)}</th>`).join("")}</tr></thead><tbody>${rows
    .slice(1)
    .map((r) => `<tr>${r.map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
}
