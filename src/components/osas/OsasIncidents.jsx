import { useState } from "react";
import {
  TriangleAlert,
  FileText,
  ShieldPlus,
  Flag,
  CheckCircle,
  ArrowRight,
  Search,
  Download,
  Info,
  ShieldAlert,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
} from "../tutor/workspace/ui.jsx";

// Fictional monitoring fixtures, independent of the clearance demonstration.
export const incidents = [
  [
    "041",
    "BK-2026-0914-001",
    "Juan Dela Cruz",
    "John Michael Perez",
    "Inappropriate Behavior",
    "High",
    "2026-09-14",
    "Referred to OSAS",
    "CASE-2026-017",
    "Under Institutional Review",
  ],
  [
    "039",
    "BK-2026-0913-004",
    "Maria Angelica Reyes",
    "Karl Jhon Dimaano",
    "Harassment / Bullying",
    "High",
    "2026-09-13",
    "Referred to OSAS",
    "CASE-2026-016",
    "Awaiting Evidence",
  ],
  [
    "036",
    "BK-2026-0911-002",
    "Karl Jhon Dimaano",
    "John Michael Perez",
    "Academic Dishonesty",
    "Medium",
    "2026-09-11",
    "Case Created",
    "CASE-2026-015",
    "Pending Decision",
  ],
  [
    "034",
    "BK-2026-0909-006",
    "Janine Claire Tampus",
    "Mark Joseph Paloma",
    "Repeated No-Show",
    "Low",
    "2026-09-09",
    "Assessed by OSAS",
    "CASE-2026-014",
    "Resolved",
  ],
  [
    "033",
    "",
    "Marvin P. Esteban",
    "Faye Ann Villanueva",
    "Technical Platform Issue",
    "Low",
    "2026-09-08",
    "Not Referred",
    "",
    "Admin Handling",
  ],
  [
    "031",
    "BK-2026-0907-003",
    "Lyla Shane Balais",
    "Allen Ezra Mandia",
    "Threatening Conduct",
    "High",
    "2026-09-07",
    "Referred to OSAS",
    "CASE-2026-013",
    "Open",
  ],
].map(
  ([
    id,
    booking,
    reporter,
    student,
    type,
    priority,
    date,
    referral,
    caseId,
    status,
  ]) => ({
    id: `INC-2026-${id}`,
    booking,
    reporter,
    student,
    type,
    priority,
    date,
    referral,
    caseId,
    status,
  }),
);
function Badge({ value }) {
  return (
    <span
      className={`oi-badge ${["High", "Open"].includes(value) ? "red" : ["Resolved", "Case Created"].includes(value) ? "green" : ["Medium", "Under Institutional Review", "Pending Decision"].includes(value) ? "gold" : value === "Assessed by OSAS" ? "purple" : ["Not Referred", "Admin Handling"].includes(value) ? "gray" : "blue"}`}
    >
      {value}
    </span>
  );
}
const scopeMatches = (r, scope) =>
  !scope ||
  (scope === "referred" && r.referral !== "Not Referred") ||
  (scope === "assessment" &&
    r.status === "Open" &&
    r.referral !== "Not Referred") ||
  (scope === "formal" && !!r.caseId) ||
  (scope === "active" &&
    [
      "Under Institutional Review",
      "Awaiting Evidence",
      "Pending Decision",
    ].includes(r.status)) ||
  (scope === "closed" && r.status === "Resolved");
export default function OsasIncidents({ settings }) {
  const [month, setMonth] = useState("2026-09"),
    [query, setQuery] = useState(""),
    [referral, setReferral] = useState(""),
    [type, setType] = useState(""),
    [priority, setPriority] = useState(""),
    [date, setDate] = useState(""),
    [status, setStatus] = useState(""),
    [scope, setScope] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [caseView, setCaseView] = useState(false),
    [notice, setNotice] = useState("");
  const monthly = incidents.filter((r) => !month || r.date.startsWith(month));
  const filtered = monthly.filter(
    (r) =>
      scopeMatches(r, scope) &&
      (!referral || r.referral === referral) &&
      (!type || r.type === type) &&
      (!priority || r.priority === priority) &&
      (!date || r.date === date) &&
      (!status || r.status === status) &&
      Object.values(r)
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const size = Number(settings.pageSize),
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * size, current * size);
  const formatDate = (v) =>
    settings.dateFormat === "iso"
      ? v
      : new Date(v + "T12:00:00").toLocaleDateString("en-US", {
          month: settings.dateFormat === "short" ? "2-digit" : "short",
          day: "numeric",
          year: "numeric",
        });
  function change(setter, value) {
    setter(value);
    setPage(1);
    setNotice("");
  }
  function reset() {
    setQuery("");
    setReferral("");
    setType("");
    setPriority("");
    setDate("");
    setStatus("");
    setScope("");
    setPage(1);
    setMonth("2026-09");
    setNotice("");
  }
  function view(r) {
    setSelected(r);
    setCaseView(false);
  }
  function exportCsv() {
    const fields = [
      "id",
      "booking",
      "reporter",
      "student",
      "type",
      "priority",
      "date",
      "referral",
      "caseId",
      "status",
    ];
    const quote = (v) => '"' + String(v).replaceAll('"', '""') + '"';
    const csv = [
      [
        "Incident Report ID",
        "Related Booking ID",
        "Reporter",
        "Reported Student",
        "Incident Type",
        "Priority",
        "Submitted Date",
        "Referral Status",
        "Related Case ID",
        "Current Status",
      ],
      ...filtered.map((r) => fields.map((f) => r[f])),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident-monitoring-demo.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching demo records.`);
  }
  function selectFilter(label, value, setter, field) {
    return (
      <select
        className={input}
        aria-label={label}
        value={value}
        onChange={(e) => change(setter, e.target.value)}
      >
        <option value="">{label}</option>
        {[...new Set(incidents.map((r) => r[field]))].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    );
  }
  return (
    <section className="oi-incidents">
      <div className="osas-heading">
        <div>
          <h1>
            Incident Monitoring{" "}
            <ShieldAlert size={22} className="text-green-800" />
          </h1>
          <p>
            Monitor incident reports referred or escalated for institutional
            review and track whether a formal OSAS case is required.
          </p>
        </div>
        <label className="op-month">
          Submitted month
          <input
            className={input}
            aria-label="Incident month"
            type="month"
            min="2024-01"
            max="2099-12"
            value={month}
            onChange={(e) => change(setMonth, e.target.value)}
          />
        </label>
      </div>
      <div className="op-metrics oi-metrics">
        {[
          [
            TriangleAlert,
            "referred",
            "Referred Incidents",
            "Reported to OSAS",
            "View referred incidents",
            "#f5002c",
          ],
          [
            FileText,
            "assessment",
            "Awaiting OSAS Assessment",
            "Open referrals awaiting assessment",
            "View pending assessment",
            "#ffb500",
          ],
          [
            ShieldPlus,
            "formal",
            "Formal Cases Created",
            "With a related case reference",
            "View formal cases",
            "#0876ff",
          ],
          [
            Flag,
            "active",
            "Institutional Review Active",
            "Ongoing review",
            "View active reviews",
            "#ff6500",
          ],
          [
            CheckCircle,
            "closed",
            "Closed / No Formal Case",
            "Resolved institutional incidents",
            "View closed incidents",
            "#006237",
          ],
        ].map(([Icon, key, title, hint, action, color]) => (
          <button
            key={key}
            aria-pressed={scope === key}
            onClick={() => {
              setReferral("");
              setType("");
              setPriority("");
              setDate("");
              setStatus("");
              setQuery("");
              change(setScope, scope === key ? "" : key);
            }}
          >
            <div className="oi-metric-top">
              <span style={{ background: color }}>
                <Icon size={23} />
              </span>
              <div>
                <b>{monthly.filter((r) => scopeMatches(r, key)).length}</b>
                <strong>{title}</strong>
                <small>{hint}</small>
              </div>
            </div>
            <span className="oi-metric-link" style={{ color }}>
              {action}
              <ArrowRight size={13} />
            </span>
          </button>
        ))}
      </div>
      <div className="oi-toolbar">
        <label className="osas-search">
          <Search size={15} />
          <input
            aria-label="Search incidents"
            placeholder="Search incident ID, booking ID, reporter, student, or keyword..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
        {selectFilter("Referral Status", referral, setReferral, "referral")}
        {selectFilter("Incident Type", type, setType, "type")}
        {selectFilter("Priority", priority, setPriority, "priority")}
        <input
          aria-label="Submitted date"
          title="Submitted date"
          className={input}
          type="date"
          value={date}
          onChange={(e) => change(setDate, e.target.value)}
        />
        {selectFilter("Current Status", status, setStatus, "status")}
        <button className={button} onClick={reset}>
          Reset
        </button>
        <button
          className={primary + " flex items-center gap-2"}
          onClick={exportCsv}
        >
          <Download size={14} />
          Export
        </button>
      </div>
      {scope && (
        <p className="text-[10px] text-green-800">
          Summary filter active.{" "}
          <button className="underline" onClick={() => change(setScope, "")}>
            Show all incidents
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      <div className="oi-table">
        <table>
          <thead>
            <tr>
              {[
                "#",
                "Incident Report ID",
                "Related Booking ID",
                "Reporter",
                "Reported Student",
                "Incident Type",
                "Priority",
                "Submitted Date",
                "Referral Status",
                "Related Case ID",
                "Current Status",
                "Action",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={r.id}>
                <td>{(current - 1) * size + i + 1}</td>
                <td>
                  <b>{r.id}</b>
                </td>
                <td>{r.booking || "—"}</td>
                <td>{r.reporter}</td>
                <td>{r.student}</td>
                <td>{r.type}</td>
                <td>
                  <Badge value={r.priority} />
                </td>
                <td>{formatDate(r.date)}</td>
                <td>
                  <Badge value={r.referral} />
                </td>
                <td>
                  {r.caseId ? (
                    <button
                      className="hover:underline"
                      onClick={() => {
                        setSelected(r);
                        setCaseView(true);
                      }}
                    >
                      {r.caseId}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <Badge value={r.status} />
                </td>
                <td>
                  {r.referral === "Not Referred" ? (
                    <span title="Technical matters remain under Admin handling">
                      —
                    </span>
                  ) : (
                    <button
                      className={button + " oi-view"}
                      aria-label={`View incident ${r.id}`}
                      onClick={() => view(r)}
                    >
                      View Incident
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-slate-500">
            No matching incident reports. Try resetting your filters.
          </p>
        )}
      </div>
      <div className="op-pagination">
        <span>
          Showing {filtered.length ? (current - 1) * size + 1 : 0} to{" "}
          {Math.min(current * size, filtered.length)} of {filtered.length}{" "}
          entries
        </span>
        <div>
          <button
            className={button}
            aria-label="Previous incident page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ArrowRight className="rotate-180" size={14} />
          </button>
          <span>{current}</span>
          <button
            className={button}
            aria-label="Next incident page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <footer className="oi-note">
        <div>
          <FileText />
          <span>
            <b>Incident Report</b>
            <small>
              A submitted allegation or concern that may require assessment.
            </small>
          </span>
        </div>
        <div>
          <ShieldPlus />
          <span>
            <b>Formal OSAS Case</b>
            <small>
              An institutional case created only after referral and OSAS
              assessment.
            </small>
          </span>
        </div>
        <div>
          <Info />
          <span>
            Not every platform incident becomes a formal OSAS case. Technical
            matters remain under Admin handling.
          </span>
        </div>
        <p>
          Demo monitoring records. Incident reports do not establish misconduct.{" "}
          {settings.tips &&
            "OSAS may monitor only referred or escalated institutional matters; no Admin controls are provided here."}
        </p>
      </footer>
      {selected && (
        <Modal
          title={caseView ? "Related Case Reference" : "Incident Report"}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-3 text-xs">
            <p className="rounded bg-blue-50 p-3 text-blue-900">
              Fictional monitoring sample. Allegations have not been established
              as findings. Official evidence and assessment workflows are not
              connected.
            </p>
            <dl className="grid grid-cols-[130px_1fr] gap-2">
              {(caseView
                ? [
                    ["Case ID", selected.caseId],
                    ["Incident Report", selected.id],
                    ["Reported Student", selected.student],
                    ["Current Status", selected.status],
                    ["Referral Status", selected.referral],
                  ]
                : [
                    ["Incident Report", selected.id],
                    ["Related Booking", selected.booking || "—"],
                    ["Reporter", selected.reporter],
                    ["Reported Student", selected.student],
                    ["Incident Type", selected.type],
                    ["Priority", selected.priority],
                    ["Submitted Date", formatDate(selected.date)],
                    ["Referral Status", selected.referral],
                    ["Current Status", selected.status],
                    ["Related Case", selected.caseId || "No formal case"],
                  ]
              ).map(([label, value]) => (
                <div className="contents" key={label}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-slate-500">
              {caseView
                ? "This reference belongs to the monitoring sample; it is not linked to a different student’s clearance record."
                : "Detailed narratives and attachments are not available in this demo."}
            </p>
            {selected.caseId && (
              <button className={button} onClick={() => setCaseView(!caseView)}>
                {caseView ? "Back to Incident" : "View Related Case"}
              </button>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
