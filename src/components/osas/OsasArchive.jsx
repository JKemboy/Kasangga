// Case Archive: lists archived case records and opens them in read-only detail views.
import CaseShortcut from "./CaseShortcut.jsx";
import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import { useState } from "react";
import {
  Archive,
  CheckCircle,
  CalendarDays,
  ArrowRight,
  LockKeyhole,
  Info,
} from "lucide-react";
import { button, input } from "../tutor/workspace/ui.jsx";

import ArchivedCaseDetails from "./ArchivedCaseDetails.jsx";

// Resolved cases appear here; final archival still enforces conditions and holds.
export function matchesArchiveResolution(record, filter) {
  if (!filter) return true;
  const outcome = String(record.outcome || "")
    .trim()
    .toLowerCase();
  if (filter === "Resolved")
    return (
      outcome === "resolved" ||
      String(record.status || "").toLowerCase() === "resolved"
    );
  if (filter === "Counselling Completed")
    return [
      "counselling completed",
      "counseling completed",
      "counseled",
      "counselled",
    ].includes(outcome);
  return outcome === filter.toLowerCase();
}

export default function OsasArchive({
  settings,
  searchQuery = "",
  onSearchChange = () => {},
}) {
  const database = useOsasDatabase();
  const records = database.records?.archive || [];
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [year, setYear] = useState(""),
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
          matchesArchiveResolution(r, outcome) &&
          (!start || r.archived >= start) &&
          (!end || r.archived <= end) &&
          (!scope ||
            (scope === "month" && r.resolved.startsWith(currentMonth)) ||
            (scope === "resolved" && r.status === "Resolved")) &&
          [r.caseId, r.incident, r.student, r.type, r.outcome, r.officer]
            .join(" ")
            .toLowerCase()
            .includes(searchQuery.trim().toLowerCase()),
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
    setSelectedMetric(null);
    setPage(1);
  }
  function reset() {
    onSearchChange("");
    setSelectedMetric(null);
    setYear("");
    setType("");
    setOutcome("");
    setStart("");
    setEnd("");
    setScope("");
    setPage(1);
  }
  function card(value) {
    reset();
    setSelectedMetric(value);
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
            Resolved and closed institutional Kasangga cases retained for
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
          {[...new Set(records.map((r) => r.year))].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
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
            records.filter(
              (r) => r.year === (year || String(new Date().getFullYear())),
            ).length,
            "Archived This Academic Year",
            `Academic Year ${year || String(new Date().getFullYear())}`,
            "View this year",
            "year",
            "#076eff",
          ],
        ].map(([Icon, count, label, hint, action, value, color]) => (
          <button
            key={value}
            aria-pressed={selectedMetric === value}
            onClick={() => {
              const selectedYear = year || String(new Date().getFullYear());
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
          <option value="">All Resolutions</option>
          {[
            "Resolved",
            "No Violation",
            "Case Dismissed",
            "Counselling Completed",
          ].map((resolution) => (
            <option key={resolution}>{resolution}</option>
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
                <td>
                  {r.full?.archived
                    ? date(r.archived)
                    : "Awaiting final archival"}
                </td>
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
          Resolved cases appear here. Complete any remaining conditions and
          clearance holds before final archival. Archived cases are read-only.
        </p>
      </div>
      {selected && !selected.full?.archived ? (
        <CaseShortcut
          record={
            database.records.cases.find((c) => c.caseId === selected.caseId) ||
            selected.full
          }
          onClose={() => setSelected(null)}
          onSave={database.saveCase}
        />
      ) : (
        selected && (
          <ArchivedCaseDetails
            record={selected}
            date={date}
            onClose={() => setSelected(null)}
          />
        )
      )}
    </section>
  );
}
