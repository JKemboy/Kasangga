import { caseReviewLabel } from "./caseProgress.js";
// Incident Monitoring: reviews incoming reports and routes referral/assessment changes through the OSAS database workflow.
import { statusClass } from "../shared/statusColors.js";
import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import IncidentAssessment from "./IncidentAssessment.jsx";
import CaseShortcut from "./CaseShortcut.jsx";
import UserExport from "../admin/UserExport.jsx";
import { incidentSummary } from "./incidentAssessment.js";
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
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";

function Badge({ value }) {
  return <span className={statusClass(value, "oi-badge")}>{value}</span>;
}
export function matchesCaseStatus(value, filter) {
  if (!filter) return true;
  return (
    {
      New: ["New", "Open", "Awaiting OSAS Assessment"],
      "Under Review": [
        "Under Review",
        "Under Institutional Review",
        "Awaiting Evidence",
        "Pending Completion",
      ],
      "Pending Decision": ["Pending Decision"],
      Resolved: ["Resolved", "Closed / No Formal Case"],
    }[filter]?.includes(value) || false
  );
}
const scopeMatches = (r, scope) =>
  !scope ||
  (scope === "referred" && r.referral !== "Not Referred") ||
  (scope === "assessment" &&
    ["Open", "Awaiting OSAS Assessment"].includes(r.status) &&
    r.referral !== "Not Referred") ||
  (scope === "formal" && !!r.caseId) ||
  (scope === "active" &&
    [
      "Under Institutional Review",
      "Under Review",
      "Awaiting Evidence",
      "Pending Decision",
      "Pending Completion",
      "Resolved",
    ].includes(r.status)) ||
  (scope === "closed" &&
    ["Resolved", "Closed / No Formal Case"].includes(r.status));
export default function OsasIncidents({
  settings,
  initialQuery = "",
  embedded = false,
  searchQuery,
  onSearchChange,
  initialFilter = {},
}) {
  const database = useOsasDatabase();
  const cases = database.records?.cases || [];
  const incidents = (database.records?.incidents || []).filter((r) => {
    const linkedCase = cases.find((c) => c.caseId === r.caseId);
    return linkedCase ? !linkedCase.archived : true;
  });
  const [month, setMonth] = useState(""),
    [query, setQuery] = useState(initialQuery),
    [type, setType] = useState(""),
    [date, setDate] = useState(""),
    [status, setStatus] = useState(initialFilter.status || ""),
    [pendingEvidence, setPendingEvidence] = useState(
      !!initialFilter.pendingEvidence,
    ),
    [scope, setScope] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [selectedCase, setSelectedCase] = useState(null),
    [notice, setNotice] = useState("");
  const assessments = {};
  const monitoring = incidents.map((r) => {
    const record = assessments[r.id] || r;
    const linked = cases.find((c) => c.caseId === record.caseId);
    return linked ? { ...record, status: linked.status } : record;
  });
  async function saveAssessment(updated) {
    await database.save(
      "incident",
      updated.reportDatabaseId,
      updated.assessment.action,
      updated,
    );
    setSelected(null);
    return true;
  }
  const monthly = monitoring.filter((r) => !month || r.date.startsWith(month));
  const filtered = monthly.filter(
    (r) =>
      (!pendingEvidence ||
        (database.records?.evidence || []).some(
          (e) => e.caseId === r.caseId && e.status !== "Validated",
        )) &&
      scopeMatches(r, scope) &&
      (!type || r.type === type) &&
      (!date || r.date === date) &&
      matchesCaseStatus(r.status, status) &&
      Object.values(r)
        .join(" ")
        .toLowerCase()
        .includes((searchQuery ?? query).trim().toLowerCase()),
  );
  const size = Number(settings.pageSize),
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * size, current * size);
  const formatDate = (v) =>
    settings.dateFormat === "iso"
      ? v
      : new Date(v + "T12:00:00").toLocaleDateString(
          settings.language || "en-PH",
          {
            timeZone: settings.timezone || "Asia/Manila",
            month: settings.dateFormat === "short" ? "2-digit" : "short",
            day: "numeric",
            year: "numeric",
          },
        );
  function change(setter, value) {
    setter(value);
    setPage(1);
    setNotice("");
  }
  function reset() {
    setQuery("");
    onSearchChange?.("");

    setType("");

    setDate("");
    setStatus("");
    setScope("");
    setPendingEvidence(false);
    setPage(1);
    setMonth("");
    setNotice("");
  }
  function view(r) {
    setSelected(r);
  }
  function openCase(r) {
    const record = cases.find((c) => c.caseId === r.caseId);
    if (record) setSelectedCase(record);
    else view(r);
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
    a.download = "incident-monitoring.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching database records.`);
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
        {[...new Set(monitoring.map((r) => r[field]))].map((v) => (
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
            {embedded ? "Case Review" : "Incident Monitoring"}{" "}
            <ShieldAlert size={22} className="text-green-800" />
          </h1>
          <p>
            Open an incident to assess the referral, create its formal case,
            validate evidence and complete the case workflow.
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
              setType("");

              setDate("");
              setStatus("");
              setQuery("");
              onSearchChange?.("");
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
        {!embedded && (
          <label className="osas-search">
            <Search size={15} />
            <input
              aria-label="Search incidents"
              placeholder="Search incident ID, booking ID, reporter, student, or keyword..."
              value={query}
              onChange={(e) => {
                change(setQuery, e.target.value);
                onSearchChange?.(e.target.value);
              }}
            />
          </label>
        )}
        {selectFilter("Incident Type", type, setType, "type")}
        <input
          aria-label="Submitted date"
          title="Submitted date"
          className={input}
          type="date"
          value={date}
          onChange={(e) => change(setDate, e.target.value)}
        />
        <select
          className={input}
          aria-label="All Case Status"
          value={status}
          onChange={(e) => change(setStatus, e.target.value)}
        >
          <option value="">All Case Status</option>
          {["New", "Under Review", "Pending Decision", "Resolved"].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <button className={button} onClick={reset}>
          Reset
        </button>
        <UserExport
          rows={filtered}
          onCsv={exportCsv}
          renderSummary={incidentSummary}
          onNotice={setNotice}
        />
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
                      onClick={() => openCase(r)}
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
                  <button
                    className={button + " oi-view"}
                    aria-label={
                      r.caseId
                        ? `Open case ${r.caseId}`
                        : `View incident ${r.id}`
                    }
                    onClick={() => (r.caseId ? openCase(r) : view(r))}
                  >
                    {r.caseId
                      ? caseReviewLabel(
                          cases.find((c) => c.caseId === r.caseId) || r,
                        )
                      : "View Incident"}
                  </button>
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
        <IncidentAssessment
          record={assessments[selected.id] || selected}
          onSave={saveAssessment}
          onClose={() => {
            setSelected(null);
          }}
        />
      )}
      {selectedCase && (
        <CaseShortcut
          record={selectedCase}
          onSave={database.saveCase}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </section>
  );
}
