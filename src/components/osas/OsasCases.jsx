import ArchivedCaseDetails from "./ArchivedCaseDetails.jsx";
import { loadAssessments } from "./incidentAssessment.js";
import CaseShortcut from "./CaseShortcut.jsx";
import CaseActions from "./CaseActions.jsx";
import { useInteractions } from "../shared/InteractionProvider.jsx";
import { useState } from "react";
import {
  FileText,
  SearchCheck,
  ShieldCheck,
  Scale,
  CheckCircle,
  ArrowRight,
  Search,
  Info,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import { incidents } from "./incidentMonitoringData.js";

const key = "campustutor:osas-case-reviews:v1";
const statuses = [
  "Open",
  "Under Review",
  "Awaiting Evidence",
  "Pending Decision",
  "Resolved",
];
const studentIds = {
  "John Michael Perez": "2020-00077",
  "Juan Dela Cruz": "2021-00123",
  "Karl Jhon Dimaano": "2021-00111",
  "Maria Angelica Reyes": "2022-00345",
  "Mark Joseph Paloma": "2020-00055",
  "Janine Claire Tampus": "2021-00222",
  "Allen Ezra Mandia": "2020-00044",
  "Lyla Shane Balais": "2021-00288",
};
const personnel = ["Maria Santos", "Ramon Villanueva", "Elena Cruz"];
const initial = incidents
  .filter((r) => r.caseId)
  .map((r, i) => ({
    ...r,
    status:
      r.status === "Under Institutional Review" ? "Under Review" : r.status,
    officer: [
      personnel[0],
      personnel[0],
      personnel[1],
      personnel[2],
      personnel[1],
    ][i],
    decision:
      r.caseId === "CASE-2026-014"
        ? {
            outcome: "Verbal Warning",
            notes:
              "Attendance records and the learner statement describe three missed sessions without notice.",
            basis: "Tutoring Conduct and Safety Standards v1.5 (sample)",
            condition:
              "Complete an OSAS attendance-commitment counseling session",
            due: "2026-09-30",
            conditionDone: false,
            at: "2026-09-12T10:30:00+08:00",
            notify: false,
          }
        : undefined,
    history: [],
  }));
export function loadOsasCases() {
  const merge = (records) => {
    const extra = Object.values(loadAssessments())
      .map((r) => r.formalCase)
      .filter(Boolean);
    return [
      ...records,
      ...extra.filter((r) => !records.some((c) => c.caseId === r.caseId)),
    ];
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (
      Array.isArray(saved) &&
      saved.every(
        (r) =>
          typeof r.caseId === "string" &&
          statuses.includes(r.status) &&
          Array.isArray(r.history),
      )
    )
      return merge(saved);
  } catch {}
  return merge(structuredClone(initial));
}
export default function OsasCases({ settings }) {
  const { confirm } = useInteractions();

  const [rows, setRows] = useState(loadOsasCases),
    [datesOpen, setDatesOpen] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [priority, setPriority] = useState(""),
    [type, setType] = useState(""),
    [start, setStart] = useState("2026-09-01"),
    [end, setEnd] = useState("2026-09-30"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [decision, setDecision] = useState(""),
    [officer, setOfficer] = useState(""),
    [notes, setNotes] = useState(""),
    [basis, setBasis] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const invalid = start && end && start > end;
  const period = invalid
    ? []
    : rows.filter(
        (r) =>
          (!r.archived || settings.showArchived) &&
          (!start || r.date >= start) &&
          (!end || r.date <= end),
      );
  const filtered = period.filter(
    (r) =>
      (!status || r.status === status) &&
      (!priority || r.priority === priority) &&
      (!type || r.type === type) &&
      [
        r.caseId,
        r.id,
        r.student,
        r.reporter,
        studentIds[r.student],
        studentIds[r.reporter],
        r.type,
        r.officer,
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
  function change(setter, value) {
    setter(value);
    setPage(1);
  }
  function persistCase(record) {
    try {
      const next = rows.map((r) => (r.caseId === record.caseId ? record : r));
      localStorage.setItem(key, JSON.stringify(next));
      setRows(next);
      setSelected(record);
      return true;
    } catch {
      setError("Could not save case.");
      return false;
    }
  }
  function archiveCase(record) {
    const archived = {
      caseId: record.caseId,
      incident: record.id,
      student: record.student,
      type: record.type,
      opened: record.date,
      resolved: record.decision.at.slice(0, 10),
      outcome: record.decision.outcome,
      archived: new Date().toISOString().slice(0, 10),
      officer: record.officer,
      year: "2026-2027",
      full: record,
    };
    if (persistCase({ ...record, archived: true, archiveRecord: archived }))
      setSelected(null);
  }
  function open(r) {
    setSelected(r);
    setDecision(r.status);
    setOfficer(r.officer);
    setNotes("");
    setBasis("");
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (!notes.trim() || (decision === "Resolved" && !basis.trim())) {
      setError(
        "Enter review notes and an institutional basis for a resolved decision.",
      );
      return;
    }
    if (
      decision === "Resolved" &&
      !(await confirm({
        title: "Record this decision?",
        message: `${selected.caseId}: ${basis}. The decision becomes part of the case record.`,
        accept: "Record Decision",
        acknowledgement:
          "I completed an impartial review and recorded the institutional basis.",
      }))
    )
      return;
    const entry = {
      status: decision,
      officer,
      notes: notes.trim(),
      basis: basis.trim(),
      at: new Date().toISOString(),
    };
    const next = rows.map((r) =>
      r.caseId === selected.caseId
        ? { ...r, status: decision, officer, history: [...r.history, entry] }
        : r,
    );
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setRows(next);
      setSelected(null);
      setNotice("Case review saved on this browser.");
    } catch {
      setError("Could not save. Browser storage is unavailable or full.");
    }
  }
  const badge = (value) => (
    <span
      className={`oc-badge ${["Resolved", "Pending Decision"].includes(value) ? "green" : value === "High" ? "red" : value === "Awaiting Evidence" || value === "Low" ? "blue" : "gold"}`}
    >
      {value}
    </span>
  );
  return (
    <section className="oc-cases">
      <div className="osas-heading">
        <div>
          <h1>
            Case Review <ShieldCheck size={23} className="text-green-800" />
          </h1>
          <p>
            Review institutional cases referred through CampusTutor while
            preserving due process and impartial assessment.
          </p>
        </div>
        <button
          type="button"
          className={button + " oc-range"}
          onClick={() => setDatesOpen(true)}
          aria-label="Choose case date range"
        >
          <CalendarDays size={15} />
          {start ? date(start) : "Any date"} - {end ? date(end) : "Any date"}
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="op-metrics oi-metrics">
        {statuses.map((s, i) => {
          const Icon = [FileText, SearchCheck, ShieldCheck, Scale, CheckCircle][
            i
          ];
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
                      "#0874ff",
                      "#7721dc",
                      "#006439",
                      "#00552c",
                    ][i],
                  }}
                >
                  <Icon size={24} />
                </span>
                <div>
                  <b>{period.filter((r) => r.status === s).length}</b>
                  <strong>{s}</strong>
                  <small>
                    {
                      [
                        "Newly reported cases",
                        "Currently being evaluated",
                        "Waiting for documents",
                        "Awaiting final decision",
                        "In selected period",
                      ][i]
                    }
                  </small>
                </div>
              </div>
              <span className="oi-metric-link">
                View {s.toLowerCase()} <ArrowRight size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="oc-toolbar">
        <label className="osas-search">
          <Search size={16} />
          <input
            aria-label="Search cases"
            placeholder="Search case ID, incident ID, student, reporter, or keyword..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
        <select
          className={input}
          aria-label="Case status filter"
          value={status}
          onChange={(e) => change(setStatus, e.target.value)}
        >
          <option value="">All Case Statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className={input}
          aria-label="Case priority filter"
          value={priority}
          onChange={(e) => change(setPriority, e.target.value)}
        >
          <option value="">All Priorities</option>
          {["High", "Medium", "Low"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className={input}
          aria-label="Case incident type filter"
          value={type}
          onChange={(e) => change(setType, e.target.value)}
        >
          <option value="">All Incident Types</option>
          {[...new Set(rows.map((r) => r.type))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          className={button}
          onClick={() => {
            setQuery("");
            setStatus("");
            setPriority("");
            setType("");
            setStart("2026-09-01");
            setEnd("2026-09-30");
            setPage(1);
            setNotice("");
          }}
        >
          Reset filters
        </button>
      </div>
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      {invalid && (
        <p role="alert" className="text-xs text-red-600">
          The end date must be on or after the start date.
        </p>
      )}
      <div className="oc-table">
        <table>
          <thead>
            <tr>
              {[
                "#",
                "Case ID",
                "Incident Report ID",
                "Reported Student",
                "Reporter",
                "Incident Type",
                "Priority",
                "Date Opened",
                "Assigned OSAS Personnel",
                "Case Status",
                "Action",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={r.caseId}>
                <td>{(current - 1) * size + i + 1}</td>
                <td>
                  <b>{r.caseId}</b>
                </td>
                <td>{r.id}</td>
                <td>
                  <div className="oc-person">
                    <Avatar name={r.student} />
                    <span>
                      {r.student}
                      <small>
                        ID: {studentIds[r.student] || "Not recorded"}
                      </small>
                    </span>
                  </div>
                </td>
                <td>
                  <div className="oc-person">
                    <Avatar name={r.reporter} />
                    <span>
                      {r.reporter}
                      <small>
                        ID: {studentIds[r.reporter] || "Not recorded"}
                      </small>
                    </span>
                  </div>
                </td>
                <td>{r.type}</td>
                <td>{badge(r.priority)}</td>
                <td>{date(r.date)}</td>
                <td>{r.officer}</td>
                <td>{badge(r.status)}</td>
                <td>
                  <button
                    className={
                      (r.status === "Resolved" ? button : primary) +
                      " oc-review"
                    }
                    aria-label={`Review ${r.caseId}`}
                    onClick={() => open(r)}
                  >
                    {r.status === "Resolved" ? "View Case" : "Review Case"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-slate-500">
            No matching cases. Try resetting your filters.
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
            aria-label="Previous case page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ArrowRight className="rotate-180" size={14} />
          </button>
          <span>{current}</span>
          <button
            className={button}
            aria-label="Next case page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="op-note">
        <Info size={18} />
        <p>
          Incident reports contain allegations requiring impartial review. A
          report does not establish misconduct. Demo case reviews do not issue
          official decisions or change student clearance.
        </p>
      </div>
      {datesOpen && (
        <Modal title="Case Date Range" onClose={() => setDatesOpen(false)}>
          <div className="space-y-3 text-xs">
            <p>Filter cases by date opened.</p>
            <label className="block">
              From
              <input
                className={input}
                aria-label="Case start date"
                type="date"
                value={start}
                onChange={(e) => change(setStart, e.target.value)}
              />
            </label>
            <label className="block">
              To
              <input
                className={input}
                aria-label="Case end date"
                type="date"
                value={end}
                onChange={(e) => change(setEnd, e.target.value)}
              />
            </label>
            {invalid && (
              <p role="alert" className="text-red-600">
                The end date must be on or after the start date.
              </p>
            )}
            <button
              className={primary}
              disabled={!!invalid}
              onClick={() => setDatesOpen(false)}
            >
              Apply date range
            </button>
          </div>
        </Modal>
      )}
      {selected?.archived ? (
        <ArchivedCaseDetails
          record={
            selected.archiveRecord || {
              caseId: selected.caseId,
              incident: selected.id,
              student: selected.student,
              type: selected.type,
              opened: selected.date,
              resolved: selected.decision?.at?.slice(0, 10),
              archived: selected.decision?.at?.slice(0, 10),
              officer: selected.officer,
              outcome: selected.decision?.outcome,
              full: selected,
            }
          }
          date={date}
          onClose={() => setSelected(null)}
        />
      ) : (
        selected && (
          <CaseShortcut
            record={rows.find((r) => r.caseId === selected.caseId) || selected}
            onClose={() => setSelected(null)}
            onSave={persistCase}
          />
        )
      )}
    </section>
  );
}
