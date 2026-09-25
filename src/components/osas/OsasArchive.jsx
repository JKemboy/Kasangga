import { useState } from "react";
import {
  Archive,
  CheckCircle,
  CalendarDays,
  ArrowRight,
  Search,
  LockKeyhole,
  Info,
} from "lucide-react";
import { Modal, button, input } from "../tutor/workspace/ui.jsx";

// Fictional archive references matching the design; no official case documents.
const initialRecords = [
  [
    "014",
    "034",
    "Mark Joseph Paloma",
    "Repeated No-Show",
    "2026-08-20",
    "2026-09-09",
    "Resolved — Conditions Completed",
    "2026-09-10",
    "Elena Cruz",
  ],
  [
    "012",
    "028",
    "Faye Anne Villanueva",
    "Inappropriate Behavior",
    "2026-08-12",
    "2026-09-02",
    "Counseling Completed",
    "2026-09-03",
    "Maria Santos",
  ],
  [
    "011",
    "026",
    "Janine Claire Tampus",
    "Harassment / Bullying",
    "2026-08-06",
    "2026-08-29",
    "Written Warning Issued",
    "2026-08-30",
    "Ramon Villanueva",
  ],
  [
    "010",
    "024",
    "Marvin P. Esteban",
    "Academic Misrepresentation",
    "2026-08-03",
    "2026-08-25",
    "Case Dismissed — Insufficient Basis",
    "2026-08-26",
    "Maria Santos",
  ],
  [
    "009",
    "022",
    "Lyla Shane Balais",
    "Tutoring Conduct / Safety",
    "2026-07-28",
    "2026-08-18",
    "Restorative Conference Completed",
    "2026-08-19",
    "Elena Cruz",
  ],
  [
    "008",
    "019",
    "Karl Jhon Dimaano",
    "Inappropriate Behavior",
    "2026-07-20",
    "2026-08-12",
    "No Violation Found",
    "2026-08-13",
    "Ramon Villanueva",
  ],
  [
    "007",
    "016",
    "Juan Dela Cruz",
    "Repeated No-Show",
    "2026-07-14",
    "2026-08-05",
    "Formal Reminder Issued",
    "2026-08-06",
    "Maria Santos",
  ],
].map(
  ([
    caseId,
    incident,
    student,
    type,
    opened,
    resolved,
    outcome,
    archived,
    officer,
  ]) => ({
    caseId: `CASE-2026-${caseId}`,
    incident: `INC-2026-${incident}`,
    student,
    type,
    opened,
    resolved,
    outcome,
    archived,
    officer,
    year: "2026–2027",
    status: "Resolved",
  }),
);
export default function OsasArchive({ settings }) {
  const [records]=useState(()=>{try{const cases=JSON.parse(localStorage.getItem("campustutor:osas-case-reviews:v1"))||[];const added=cases.filter(c=>c.archived&&c.archiveRecord).map(c=>c.archiveRecord);return [...added,...initialRecords.filter(r=>!added.some(a=>a.caseId===r.caseId))];}catch{return initialRecords;}});
  const [query, setQuery] = useState(""),
    [year, setYear] = useState("2026–2027"),
    [type, setType] = useState(""),
    [outcome, setOutcome] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [scope, setScope] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null);
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const invalid = start && end && start > end;
  const filtered = invalid
    ? []
    : records.filter(
        (r) =>
          (!year || r.year === year) &&
          (!type || r.type === type) &&
          (!outcome || r.outcome === outcome) &&
          (!start || r.archived >= start) &&
          (!end || r.archived <= end) &&
          (!scope ||
            (scope === "month" && r.resolved.startsWith(currentMonth)) ||
            (scope === "resolved" && r.status === "Resolved")) &&
          [r.caseId, r.incident, r.student, r.type, r.outcome, r.officer]
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
  function reset() {
    setQuery("");
    setYear("2026–2027");
    setType("");
    setOutcome("");
    setStart("");
    setEnd("");
    setScope("");
    setPage(1);
  }
  function card(value) {
    reset();
    if (value === "all" || value === "resolved" || value === "month")
      setYear("");
    setScope(value === "resolved" || value === "month" ? value : "");
  }
  const badge = (r) => (
    <span
      className={`oa-outcome ${r.outcome.includes("Dismissed") ? "neutral" : r.outcome.includes("Issued") ? "blue" : ""}`}
    >
      {r.outcome.includes("Dismissed") ? (
        <Info size={12} />
      ) : (
        <CheckCircle size={12} />
      )}
      <span>{r.outcome}</span>
    </span>
  );
  return (
    <section className="oa-archive">
      <div className="osas-heading">
        <div>
          <h1>
            Case Archive <Archive size={23} className="text-green-800" />
          </h1>
          <p>
            Resolved and closed institutional CampusTutor cases retained for
            authorized reference and accountability.
          </p>
        </div>
        <select
          className={input + " oa-year"}
          aria-label="Archive academic year"
          value={year}
          onChange={(e) => change(setYear, e.target.value)}
        >
          <option value="">All academic years</option>
          <option value="2026–2027">Academic Year 2026–2027</option>
          <option value="2025–2026">Academic Year 2025–2026</option>
        </select>
      </div>
      <div className="op-metrics oi-metrics oa-metrics">
        {[
          [
            Archive,
            records.length,
            "Total Archived Cases",
            "All time",
            "View all archives",
            "all",
            "#005c32",
          ],
          [
            CheckCircle,
            records.filter((r) => r.status === "Resolved").length,
            "Resolved Cases",
            "Completed case reviews",
            "View resolved",
            "resolved",
            "#005c32",
          ],
          [
            CalendarDays,
            records.filter((r) => r.resolved.startsWith(currentMonth)).length,
            "Closed This Month",
            new Date(currentMonth + "-01T12:00:00").toLocaleDateString(
              "en-US",
              { month: "long", year: "numeric" },
            ),
            "View this month",
            "month",
            "#ffb800",
          ],
          [
            Archive,
            records.filter((r) => r.year === (year || "2026–2027")).length,
            "Archived This Academic Year",
            `Academic Year ${year || "2026–2027"}`,
            "View this year",
            "year",
            "#076eff",
          ],
        ].map(([Icon, count, label, hint, action, value, color]) => (
          <button
            key={value}
            onClick={() => {
              const selectedYear = year || "2026–2027";
              card(value);
              if (value === "year") setYear(selectedYear);
            }}
          >
            <div className="oi-metric-top">
              <span style={{ background: color }}>
                <Icon size={24} />
              </span>
              <div>
                <b>{count}</b>
                <strong>{label}</strong>
                <small>{hint}</small>
              </div>
            </div>
            <span className="oi-metric-link" style={{ color }}>
              {action}
              <ArrowRight size={14} />
            </span>
          </button>
        ))}
      </div>
      <div className="oa-filters">
        <label className="osas-search">
          <Search size={16} />
          <input
            aria-label="Search archives"
            placeholder="Search case ID, incident ID, student, or outcome..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
        <select
          className={input}
          aria-label="Archive incident type"
          value={type}
          onChange={(e) => change(setType, e.target.value)}
        >
          <option value="">All Incident Types</option>
          {[...new Set(records.map((r) => r.type))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          className={input}
          aria-label="Resolution or outcome"
          value={outcome}
          onChange={(e) => change(setOutcome, e.target.value)}
        >
          <option value="">All Resolutions / Outcomes</option>
          {records.map((r) => (
            <option key={r.caseId}>{r.outcome}</option>
          ))}
        </select>
        <button className={button} onClick={reset}>
          Reset filters
        </button>
      </div>
      <div className="oc-dates">
        <label>
          Archived from
          <input
            className={input}
            type="date"
            aria-label="Archive start date"
            value={start}
            onChange={(e) => change(setStart, e.target.value)}
          />
        </label>
        <label>
          To
          <input
            className={input}
            type="date"
            aria-label="Archive end date"
            value={end}
            onChange={(e) => change(setEnd, e.target.value)}
          />
        </label>
        <span>
          Demo records · Read-only
          {scope === "month"
            ? " · Closed this month"
            : scope === "resolved"
              ? " · Resolved cases"
              : ""}
        </span>
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-red-600">
          The end date must be on or after the start date.
        </p>
      )}
      <div className="oa-table">
        <table>
          <thead>
            <tr>
              {[
                "#",
                "Case ID",
                "Incident Report ID",
                "Student",
                "Incident Type",
                "Date Opened",
                "Resolution Date",
                "Case Outcome / Resolution",
                "Archived Date",
                "Archived By",
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
                <td>{r.caseId}</td>
                <td>{r.incident}</td>
                <td>{r.student}</td>
                <td>{r.type}</td>
                <td>{date(r.opened)}</td>
                <td>{date(r.resolved)}</td>
                <td>{badge(r)}</td>
                <td>{date(r.archived)}</td>
                <td>{r.officer}</td>
                <td>
                  <button
                    className={button + " oa-view"}
                    aria-label={`View archived ${r.caseId}`}
                    onClick={() => setSelected(r)}
                  >
                    <LockKeyhole size={12} />
                    View Archived Case
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-slate-500">
            No matching archived cases. Try resetting your filters.
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
            aria-label="Previous archive page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ArrowRight className="rotate-180" size={14} />
          </button>
          <span>{current}</span>
          <button
            className={button}
            aria-label="Next archive page"
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
          Archived cases are read-only reference records. This demo catalog
          contains fictional samples; official records, authorization, and
          retention controls require institutional integration.
        </p>
      </div>
      {selected && (
        <Modal
          title={`Archived Case · ${selected.caseId}`}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-3 text-xs">
            <p className="flex items-center gap-2 rounded bg-green-50 p-3 text-green-800">
              <LockKeyhole size={15} />
              Read-only archived reference · Demo record
            </p>
            <dl className="grid grid-cols-[125px_1fr] gap-2">
              {[
                ["Case ID", selected.caseId],
                ["Incident Report ID", selected.incident],
                ["Student", selected.student],
                ["Incident Type", selected.type],
                ["Date Opened", date(selected.opened)],
                ["Resolution Date", date(selected.resolved)],
                ["Outcome", selected.outcome],
                ["Archived Date", date(selected.archived)],
                ["Archived By", selected.officer],
                ["Academic Year", selected.year],
              ].map(([label, value]) => (
                <div className="contents" key={label}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="rounded bg-slate-50 p-3 text-slate-600">
              Official decision documents, supporting evidence, and audit
              records are not attached. This sample is separate from active
              case-review and clearance records.
            </p>
            <div className="flex justify-end">
              <button className={button} onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
