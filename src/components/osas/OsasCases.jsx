import { caseReviewLabel } from "./caseProgress.js";
// Case Review: searches active cases and optionally archived records, then opens the case workflow for authorized decisions.
import { statusClass } from "../shared/statusColors.js";
import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import ArchivedCaseDetails from "./ArchivedCaseDetails.jsx";
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

const statuses = [
  "Open",
  "Under Review",
  "Awaiting Evidence",
  "Pending Decision",
  "Pending Completion",
  "Resolved",
];

export default function OsasCases({ settings }) {
  const database = useOsasDatabase();
  const rows = database.records?.cases || [];
  const personnel = (database.records?.users || [])
    .filter((u) =>
      database.records?.cases.some((c) => c.officerId === u.user_id),
    )
    .map((u) => u.name);
  const { confirm } = useInteractions();

  const [datesOpen, setDatesOpen] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [priority, setPriority] = useState(""),
    [type, setType] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
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
        r.studentId,
        r.reporterStudentId,
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
  }
  async function persistCase(record) {
    return database.saveCase(record);
  }
  async function archiveCase(record) {
    try {
      await database.saveCase({ ...record, archived: true });
      setSelected(null);
    } catch (cause) {
      setError(cause.message);
    }
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
    try {
      const updated = {
        ...selected,
        status: decision,
        history: [
          ...selected.history,
          { notes: notes.trim(), basis: basis.trim(), status: decision },
        ],
      };
      await database.saveCase(updated);
      setSelected(null);
    } catch (cause) {
      setError(cause.message);
    }
  }
  const badge = (value) => (
    <span className={statusClass(value, "oc-badge")}>{value}</span>
  );
  return (
    <section className="oc-cases">
      <div className="osas-heading">
        <div>
          <h1>
            Case Review <ShieldCheck size={23} className="text-green-800" />
          </h1>
          <p>
            Review institutional cases referred through Kasangga while
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
            setStart("");
            setEnd("");
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
                      <small>ID: {r.studentId || "Not recorded"}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <div className="oc-person">
                    <Avatar name={r.reporter} />
                    <span>
                      {r.reporter}
                      <small>ID: {r.reporterStudentId || "Not recorded"}</small>
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
                      (["Resolved", "Pending Completion"].includes(r.status)
                        ? button
                        : primary) + " oc-review"
                    }
                    aria-label={`Review ${r.caseId}`}
                    onClick={() => open(r)}
                  >
                    {["Resolved", "Pending Completion"].includes(r.status)
                      ? "View Case"
                      : caseReviewLabel(r)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-slate-500">
            No formal cases match these filters. Referred reports awaiting
            assessment appear above.
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
          report does not establish misconduct. OSAS case actions and decisions
          are saved to the database.
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
