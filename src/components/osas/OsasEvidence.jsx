import CaseShortcut from "./CaseShortcut.jsx";
import { loadOsasCases } from "./OsasCases.jsx";
import ServiceMenu from "../admin/ServiceMenu.jsx";
import { History } from "lucide-react";
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
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
import { incidents } from "./incidentMonitoringData.js";

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
export function loadOsasEvidence() {
  try {
    const rows = JSON.parse(localStorage.getItem(storageKey));
    if (
      Array.isArray(rows) &&
      new Set(rows.map((r) => r.id)).size ===
      rows.every(
        (r) =>
          typeof r.id === "string" &&
          statuses.includes(r.status) &&
          Array.isArray(r.history),
      )
    )
      return rows;
  } catch {}
  return structuredClone(initial);
}
export default function OsasEvidence({ settings }) {
  const [caseRows, setCaseRows] = useState(loadOsasCases);

  const [rows, setRows] = useState(loadOsasEvidence),
    [month, setMonth] = useState("2026-09"),
    [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [incident, setIncident] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [mode, setMode] = useState("review"),
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
  function open(r, nextMode = "evidence") {
    if (
      nextMode !== "history" &&
      !caseRows.some((c) => c.caseId === r.caseId)
    ) {
      setNotice("No matching case record is available.");
      return;
    }
    setSelected(r);
    setMode(nextMode);
  }
  function saveCase(record) {
    try {
      const next = caseRows.map((c) =>
        c.caseId === record.caseId ? record : c,
      );
      localStorage.setItem(
        "campustutor:osas-case-reviews:v1",
        JSON.stringify(next),
      );
      setCaseRows(next);
      return true;
    } catch {
      return false;
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
                    <ServiceMenu
                      service={{ title: r.id }}
                      options={[
                        [FileText, "View case", "case"],
                        [Info, "View incident report", "incident"],
                        [History, "Validation history", "history"],
                      ]}
                      onSelect={(view) => open(r, view)}
                    />
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
      {selected && mode !== "history" && (
        <CaseShortcut
          key={selected.id + mode}
          record={caseRows.find((c) => c.caseId === selected.caseId)}
          initialView={mode}
          initialEvidenceId={selected.id}
          onSave={saveCase}
          onEvidenceSave={setRows}
          onClose={() => {
            setSelected(null);
            setRows(loadOsasEvidence());
          }}
        />
      )}
      {selected && mode === "history" && (
        <Modal
          title="Validation History"
          subtitle={selected.id}
          onClose={() => setSelected(null)}
        >
          <ol className="ocx-timeline">
            <li>
              <b>Submitted</b>
              <small>
                {date(selected.date)} ? {time(selected)} ? {selected.reporter}
              </small>
            </li>
            {(rows.find((r) => r.id === selected.id)?.history || []).map(
              (h, i) => (
                <li key={i}>
                  <b>{h.status}</b>
                  <small>
                    {h.at} ? {h.reviewer}
                  </small>
                  <p>{h.notes}</p>
                  {Object.entries(h.criteria || {}).map(([label, value]) => (
                    <p key={label}>
                      {label}: {value}
                    </p>
                  ))}
                </li>
              ),
            )}
          </ol>
          <button className={primary} onClick={() => setSelected(null)}>
            Done
          </button>
        </Modal>
      )}
    </section>
  );
}
