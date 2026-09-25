import {useInteractions} from "../shared/InteractionProvider.jsx";
import { useState } from "react";
import {
  FileText,
  Hourglass,
  CheckCircle,
  CircleHelp,
  X,
  ShieldCheck,
  Search,
  ArrowRight,
  MoreHorizontal,
  Info,
  ListChecks,
  Link,
  Shield,
  TriangleAlert,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
} from "../tutor/workspace/ui.jsx";
import { incidents } from "./OsasIncidents.jsx";

const storageKey = "campustutor:osas-evidence:v1";
const statuses = [
  "Pending Review",
  "Under Review",
  "Validated",
  "Requires Clarification",
  "Insufficient",
];
const criteria = [
  "Readability",
  "Context Completeness",
  "Relevance to Case",
  "Source Verification",
  "Signs of Manipulation",
];
const initial = incidents
  .filter((r) => r.caseId)
  .map((r, i) => ({
    ...r,
    id: `EVD-2026-${String(45 - i).padStart(3, "0")}`,
    reportId: r.id,
    evidenceType: [
      "Screenshot",
      "Conversation Log",
      "Session Record",
      "Signed Statement",
      "Image",
    ][i],
    time: ["10:24", "14:17", "11:08", "16:36", "13:52"][i],
    status: [
      "Pending Review",
      "Under Review",
      "Requires Clarification",
      "Validated",
      "Insufficient",
    ][i],
    history: [],
  }));
function load() {
  try {
    const rows = JSON.parse(localStorage.getItem(storageKey));
    if (
      Array.isArray(rows) &&
      rows.length === initial.length &&
      new Set(rows.map((r) => r.id)).size === initial.length &&
      rows.every(
        (r) =>
          initial.some((v) => v.id === r.id) &&
          statuses.includes(r.status) &&
          Array.isArray(r.history),
      )
    )
      return rows;
  } catch {}
  return structuredClone(initial);
}
export default function OsasEvidence({ settings }) {
  const {confirm}=useInteractions();

  const [rows, setRows] = useState(load),
    [month, setMonth] = useState("2026-09"),
    [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [incident, setIncident] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [mode, setMode] = useState("review"),
    [decision, setDecision] = useState(""),
    [notes, setNotes] = useState(""),
    [checks, setChecks] = useState({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const monthly = rows.filter((r) => !month || r.date.startsWith(month));
  const filtered = monthly.filter(
    (r) =>
      (!status || r.status === status) &&
      (!type || r.evidenceType === type) &&
      (!incident || r.type === incident) &&
      [
        r.id,
        r.reportId,
        r.caseId,
        r.student,
        r.reporter,
        r.type,
        r.evidenceType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const size = Number(settings.pageSize),
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * size, current * size);
  const date = (v) =>
    settings.dateFormat === "iso"
      ? v
      : new Date(v + "T12:00:00").toLocaleDateString("en-US", {
          month: settings.dateFormat === "short" ? "2-digit" : "short",
          day: "numeric",
          year: "numeric",
        });
  const time = (r) =>
    new Date(`${r.date}T${r.time}:00+08:00`).toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: settings.timeFormat === "12",
    });
  function change(setter, value) {
    setter(value);
    setPage(1);
  }
  function open(r, nextMode = "review") {
    setSelected(r);
    setMode(nextMode);
    setDecision(r.status);
    setNotes("");
    setChecks(Object.fromEntries(criteria.map((c) => [c, "Not assessed"])));
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Enter review notes before saving.");
      return;
    }
    if(decision === "Validated" && !criteria.every(c=>checks[c]==="Meets criterion"||(c.includes("Source")&&checks[c]==="Not applicable"))){setError("Assess every criterion before selecting Validated. Only source verification may be not applicable.");return;}
    if (
      ["Requires Clarification", "Insufficient"].includes(decision) &&
      !Object.values(checks).some((v) => v !== "Not assessed")
    ) {
      setError("Record at least one criterion assessment for this decision.");
      return;
    }
    if(!await confirm({title:`Save evidence as ${decision}?`,message:notes,accept:"Save Review"}))return;
    const entry = {
      status: decision,
      notes: notes.trim(),
      criteria: checks,
      reviewer: "Maria Santos",
      at: new Date().toISOString(),
    };
    const next = rows.map((r) =>
      r.id === selected.id
        ? { ...r, status: decision, history: [...r.history, entry] }
        : r,
    );
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRows(next);
      setSelected(null);
      setNotice("Evidence review saved on this browser.");
    } catch {
      setError("Could not save. Browser storage is unavailable or full.");
    }
  }
  const badge = (v) => (
    <span
      className={`oe-badge ${v === "Validated" ? "green" : v === "Insufficient" ? "red" : v === "Requires Clarification" ? "blue" : "gold"}`}
    >
      {v}
    </span>
  );
  return (
    <section className="oe-evidence">
      <div className="osas-heading">
        <div>
          <h1>
            Evidence Validation{" "}
            <ShieldCheck size={23} className="text-green-800" />
          </h1>
          <p>
            Review evidence associated with referred institutional cases using
            documented OSAS validation criteria.
          </p>
        </div>
        <label className="op-month">
          Submission month
          <input
            aria-label="Evidence month"
            type="month"
            className={input}
            min="2024-01"
            max="2099-12"
            value={month}
            onChange={(e) => change(setMonth, e.target.value)}
          />
        </label>
      </div>
      <div className="op-metrics oi-metrics">
        {statuses.map((s, i) => {
          const Icon = [FileText, Hourglass, CheckCircle, CircleHelp, X][i];
          return (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => change(setStatus, status === s ? "" : s)}
            >
              <div className="oi-metric-top">
                <span
                  style={{
                    background: [
                      "#ffb800",
                      "#d99709",
                      "#006234",
                      "#0878ff",
                      "#f0002c",
                    ][i],
                  }}
                >
                  <Icon size={24} />
                </span>
                <div>
                  <b>{monthly.filter((r) => r.status === s).length}</b>
                  <strong>{s}</strong>
                  <small>
                    {
                      [
                        "Awaiting validation",
                        "Currently being assessed",
                        "Recorded demo outcome",
                        "Need more information",
                        "Does not meet criteria",
                      ][i]
                    }
                  </small>
                </div>
              </div>
              <span className="oi-metric-link">
                {
                  [
                    "View queue",
                    "View in progress",
                    "View validated",
                    "View clarification",
                    "View insufficient",
                  ][i]
                }
                <ArrowRight size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="oe-filters">
        <select
          aria-label="Validation status filter"
          className={input}
          value={status}
          onChange={(e) => change(setStatus, e.target.value)}
        >
          <option value="">All Validation Statuses</option>
          {statuses.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label="Evidence type filter"
          className={input}
          value={type}
          onChange={(e) => change(setType, e.target.value)}
        >
          <option value="">All Evidence Types</option>
          {[...new Set(rows.map((r) => r.evidenceType))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label="Evidence incident type filter"
          className={input}
          value={incident}
          onChange={(e) => change(setIncident, e.target.value)}
        >
          <option value="">All Incident Types</option>
          {[...new Set(rows.map((r) => r.type))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <button
          className={button}
          onClick={() => {
            setStatus("");
            setType("");
            setIncident("");
            setQuery("");
            setMonth("2026-09");
            setPage(1);
            setNotice("");
          }}
        >
          Reset filters
        </button>
        <label className="osas-search">
          <Search size={15} />
          <input
            aria-label="Search evidence"
            placeholder="Search evidence ID, case ID, report ID, student, or keywords..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
      </div>
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      <div className="oe-table">
        <table>
          <thead>
            <tr>
              {[
                "#",
                "Evidence ID",
                "Case ID",
                "Incident Report ID",
                "Evidence Type",
                "Submitted By",
                "Submission Date",
                "Related Student / Case",
                "Validation Status",
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
                <td>{r.caseId}</td>
                <td>{r.reportId}</td>
                <td>
                  <span
                    className={`oe-type type-${initial.findIndex((v) => v.id === r.id)}`}
                  >
                    {r.evidenceType}
                  </span>
                </td>
                <td>{r.reporter}</td>
                <td>
                  {date(r.date)}
                  <small>{time(r)}</small>
                </td>
                <td>
                  <b>{r.student}</b>
                  <small>{r.type}</small>
                </td>
                <td>{badge(r.status)}</td>
                <td>
                  <div className="oe-actions">
                    <button
                      className={button}
                      aria-label={`Review evidence ${r.id}`}
                      onClick={() => open(r)}
                    >
                      {r.status === "Validated"
                        ? "View Evidence"
                        : "Review Evidence"}
                    </button>
                    <button
                      className={button}
                      aria-label={`More details for ${r.id}`}
                      onClick={() => open(r, "details")}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-slate-500">
            No matching evidence. Try resetting your filters.
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
            aria-label="Previous evidence page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ArrowRight className="rotate-180" size={14} />
          </button>
          <span>{current}</span>
          <button
            className={button}
            aria-label="Next evidence page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <section className="oe-criteria">
        <h2>
          <ShieldCheck size={20} />
          OSAS Validation Criteria
        </h2>
        <div>
          {criteria.map((c, i) => {
            const Icon = [FileText, ListChecks, Link, Shield, TriangleAlert][i];
            return (
              <span key={c}>
                <i>
                  <Icon size={20} />
                </i>
                {c}
                {i === 3
                  ? ", where applicable"
                  : i === 4
                    ? ", where review procedures support it"
                    : ""}
              </span>
            );
          })}
        </div>
        <p>
          <Info size={16} />
          Evidence validation is performed by an OSAS reviewer. Automated
          processing does not prove authenticity or establish misconduct. Demo
          references do not include source attachments.
        </p>
      </section>
      {selected && (
        <Modal
          title={`${mode === "details" ? "Evidence Details" : selected.status === "Validated" ? "View Evidence" : "Review Evidence"} · ${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <form className="space-y-3 text-xs" onSubmit={save}>
            <p>
              <b>{selected.student}</b> · {selected.caseId} ·{" "}
              {selected.reportId}
            </p>
            <p>
              {selected.evidenceType} · Submitted by {selected.reporter} ·{" "}
              {date(selected.date)} {time(selected)}
            </p>
            {badge(selected.status)}
            <p className="rounded bg-amber-50 p-3 text-amber-900">
              Demo reference only. The original evidence file, provenance, and
              official validation record are not attached. No file preview or
              authenticity determination is available.
            </p>
            {selected.history.length > 0 && (
              <details>
                <summary className="cursor-pointer font-semibold">
                  Review history ({selected.history.length})
                </summary>
                {selected.history.map((h, i) => (
                  <div className="mt-2 rounded border p-2" key={i}>
                    <b>{h.status}</b> · {h.reviewer}
                    <p>
                      {new Date(h.at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                        hour12: settings.timeFormat === "12",
                      })}
                    </p>
                    <p>{h.notes}</p>
                    {Object.entries(h.criteria).map(([c, v]) => (
                      <p key={c}>
                        {c}: {v}
                      </p>
                    ))}
                  </div>
                ))}
              </details>
            )}
            {selected.status === "Validated" ? (
              <p className="text-slate-500">
                Read-only sample outcome. Supporting validation documentation is
                unavailable.
              </p>
            ) : mode === "details" ? (
              <button
                type="button"
                className={button}
                onClick={() => setMode("review")}
              >
                Review Evidence
              </button>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {criteria.map((c) => (
                    <label key={c}>
                      {c}
                      <select
                        aria-label={c}
                        className={input}
                        value={checks[c]}
                        onChange={(e) =>
                          setChecks({ ...checks, [c]: e.target.value })
                        }
                      >
                        <option>Not assessed</option><option>Meets criterion</option><option>Does not meet criterion</option>
                        <option>Unable to assess — source missing</option>
                        <option>Clarification required</option>
                        <option>Not applicable</option>
                      </select>
                    </label>
                  ))}
                </div>
                <label className="block">
                  Validation status
                  <select
                    aria-label="Review validation status"
                    className={input}
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s} disabled={s === "Validated" && !criteria.every(c=>checks[c]==="Meets criterion"||(c.includes("Source")&&checks[c]==="Not applicable"))}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-slate-500">
                  Validation requires every criterion to be assessed. Local prototype decisions do not verify document authenticity.
                </p>
                <label className="block">
                  Review notes / clarification request
                  <textarea
                    aria-label="Evidence review notes"
                    className={input}
                    rows={3}
                    required
                    maxLength={2000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                {error && (
                  <p role="alert" className="text-red-600">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={button}
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </button>
                  <button className={primary}>Save Review</button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
    </section>
  );
}
