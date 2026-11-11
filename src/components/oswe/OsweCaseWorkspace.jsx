import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { button, primary, input, Modal } from "../shared/staffUi.jsx";
import PortalAvatar from "../shared/PortalAvatar.jsx";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import CaseReviewFlow, { caseReviewDate } from "./CaseReviewFlow.jsx";
import CaseShortcut from "./CaseShortcut.jsx";
import { matchesCaseStatus } from "./OsweIncidents.jsx";
import { evidenceReviewState } from "../../services/osweDecisionRules.js";
import "./case-review-flow.css";
export default function OsweCaseWorkspace({
  settings,
  searchQuery = "",
  onSearchChange,
  initialFilter = {},
}) {
  const database = useOsweDatabase();
  const [tab, setTab] = useState("review"),
    [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  const [query, setQuery] = useState(searchQuery),
    [status, setStatus] = useState(initialFilter.status || ""),
    [type, setType] = useState(""),
    [priority, setPriority] = useState(""),
    [month, setMonth] = useState(""),
    [date, setDate] = useState(""),
    [scope, setScope] = useState(""),
    [pending, setPending] = useState(!!initialFilter.pendingEvidence),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1);
  const rows = (database.records?.incidents || []).map((r) => {
    const linked = (database.records?.cases || []).find(
      (c) => c.reportDatabaseId === r.reportDatabaseId,
    );
    const row = { ...r, ...linked };
    return {
      ...row,
      recorded:
        !!row.decision ||
        !!row.archived ||
        row.status === "Closed / No Finding",
      progress: evidenceReviewState(
        (database.records?.evidence || []).filter(
          (e) => e.reportDatabaseId === row.reportDatabaseId,
        ),
      ),
    };
  });
  const search = (onSearchChange ? searchQuery : query).trim().toLowerCase();
  const filtered = rows
    .filter(
      (r) =>
        r.recorded === (tab === "recorded") &&
        matchesCaseStatus(r.status, status) &&
        (!type || r.type === type) &&
        (!priority || r.priority === priority) &&
        (!month || r.date.startsWith(month)) &&
        (!date || r.date === date) &&
        (!scope ||
          (scope === "referred" && r.referral !== "Not Referred") ||
          (scope === "assessment" && !r.caseId && !r.recorded) ||
          (scope === "active" && !!r.caseId && !r.recorded) ||
          (scope === "closed" && r.recorded)) &&
        (!pending || !r.progress.complete) &&
        [
          r.id,
          r.caseId,
          r.student,
          r.studentId,
          r.reporter,
          r.type,
          r.officer,
          r.booking,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
    )
    .sort((a, b) =>
      sort === "type"
        ? a.type.localeCompare(b.type)
        : ((Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0)) *
          (sort === "oldest" ? -1 : 1),
    );
  const size = Math.max(1, Number(settings?.pageSize) || 10),
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages);
  function change(setter, value) {
    setter(value);
    setPage(1);
  }
  if (selected && !selected.recorded)
    return (
      <CaseReviewFlow
        key={selected.reportDatabaseId}
        record={selected}
        inline
        onClose={() => setSelected(null)}
        onRecorded={() => {
          setSelected(null);
          setTab("recorded");
          setNotice(
            "Decision recorded. The case and clearance requirements have been updated.",
          );
        }}
      />
    );
  return (
    <section className="oswe-case-workspace">
      <h1>Case Review</h1>
      <p className="case-workspace-subtitle">
        Cases referred by LCO Admin that need OSWE validation and a decision.
      </p>
      <div className="case-list-toolbar">
        <div className="case-list-tabs" role="tablist" aria-label="Case status">
          {[
            ["review", "To Review"],
            ["recorded", "Decision Recorded"],
          ].map(([key, label]) => (
            <button
              role="tab"
              aria-selected={tab === key}
              key={key}
              onClick={() => change(setTab, key)}
            >
              {label}
              <span>
                {rows.filter((r) => r.recorded === (key === "recorded")).length}
              </span>
            </button>
          ))}
        </div>
        <label className="case-list-search">
          <Search size={18} />
          <input
            aria-label="Search cases"
            placeholder="Search case, student, or incident..."
            value={onSearchChange ? searchQuery : query}
            onChange={(e) => {
              (onSearchChange || setQuery)(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <details className="case-list-filters">
        <summary>Filters and sorting</summary>
        <div>
          <select
            className={input}
            aria-label="Filter referral scope"
            value={scope}
            onChange={(e) => change(setScope, e.target.value)}
          >
            <option value="">All referral scopes</option>
            <option value="referred">Referred incidents</option>
            <option value="assessment">Awaiting OSWE assessment</option>
            <option value="active">Institutional review active</option>
            <option value="closed">Closed reviews</option>
          </select>
          <select
            className={input}
            aria-label="Filter case status"
            value={status}
            onChange={(e) => change(setStatus, e.target.value)}
          >
            <option value="">All statuses</option>
            {["New", "Under Review", "Pending Decision", "Resolved"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
          <select
            className={input}
            aria-label="Filter incident type"
            value={type}
            onChange={(e) => change(setType, e.target.value)}
          >
            <option value="">All incident types</option>
            {[...new Set(rows.map((r) => r.type))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className={input}
            aria-label="Filter priority"
            value={priority}
            onChange={(e) => change(setPriority, e.target.value)}
          >
            <option value="">All priorities</option>
            {[...new Set(rows.map((r) => r.priority).filter(Boolean))].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
          <input
            className={input}
            aria-label="Filter month"
            type="month"
            value={month}
            onChange={(e) => change(setMonth, e.target.value)}
          />
          <input
            className={input}
            aria-label="Filter date"
            type="date"
            value={date}
            onChange={(e) => change(setDate, e.target.value)}
          />
          <select
            className={input}
            aria-label="Sort cases"
            value={sort}
            onChange={(e) => change(setSort, e.target.value)}
          >
            <option value="newest">Newest referrals</option>
            <option value="oldest">Oldest referrals</option>
            <option value="type">Incident type</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={pending}
              onChange={(e) => change(setPending, e.target.checked)}
            />{" "}
            Unreviewed evidence
          </label>
        </div>
      </details>
      <p className="case-muted">
        {rows.filter((r) => !r.recorded && !r.caseId).length} new referrals ·{" "}
        {rows.filter((r) => !r.recorded && r.caseId).length} under review. Open
        a case to see its details, validate the evidence and record a decision.
      </p>
      {notice && (
        <p role="status" className="case-alert info">
          {notice}
        </p>
      )}
      {database.error && (
        <p role="alert" className="case-alert error">
          {database.error}
        </p>
      )}
      {!filtered.length && (
        <p className="case-panel">
          {database.loading
            ? "Loading cases…"
            : "No cases match the selected filters."}
        </p>
      )}
      {filtered.slice((current - 1) * size, current * size).map((r) => (
        <article className="case-list-card" key={r.reportDatabaseId}>
          <header>
            <span className="case-document-icon">
              <FileText size={25} />
            </span>
            <div>
              <h2>{r.type}</h2>
              <p>
                {r.caseId || r.id} · referred by LCO Admin{" "}
                {caseReviewDate(r.receivedAt)}
              </p>
            </div>
            <div className="case-card-badges">
              <div>
                <span
                  className={`case-badge ${r.recorded ? "neutral" : r.caseId ? "warning" : "danger"}`}
                >
                  {r.recorded
                    ? "Decision Recorded"
                    : r.caseId
                      ? "Under Review"
                      : "New Referral"}
                </span>
                <span
                  className={`case-badge ${r.priority === "High" ? "danger" : "neutral"}`}
                >
                  {r.priority}
                </span>
              </div>
              <small>Incident {r.id}</small>
            </div>
          </header>
          <div className="case-card-facts">
            {[
              ["Reported student", r.studentDetails],
              ["Reporter", r.reporterDetails],
            ].map(([label, person]) => (
              <div key={label}>
                <small>{label}</small>
                <div className="case-card-person">
                  <PortalAvatar
                    name={person?.name || "Unavailable"}
                    userId={person?.userId}
                  />
                  <div>
                    <strong>{person?.name || "Not recorded"}</strong>
                    <p>ID: {person?.studentId || "Not recorded"}</p>
                  </div>
                </div>
              </div>
            ))}
            <div>
              <small>Evidence</small>
              <strong>
                {r.progress.reviewed} of {r.progress.total} reviewed
              </strong>
            </div>
            <div>
              <small>Assigned</small>
              <strong>{r.officerId ? r.officer : "Unassigned"}</strong>
            </div>
          </div>
          <footer>
            <button className={primary} onClick={() => setSelected(r)}>
              {r.recorded ? "View Decision" : "Open Case"}
            </button>
          </footer>
        </article>
      ))}
      <div className="case-list-pagination">
        <span>
          {filtered.length} case(s) · Page {current} of {pages}
        </span>
        <button
          className={button}
          disabled={current <= 1}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </button>
        <button
          className={button}
          disabled={current >= pages}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
      {selected?.recorded && !selected.caseId && (
        <Modal
          title={`${selected.id} · Closed / No Finding`}
          onClose={() => setSelected(null)}
        >
          <p>{selected.description}</p>
          <p className="case-muted">
            This report was closed without an OSWE case decision.
          </p>
        </Modal>
      )}
      {selected?.recorded && selected.caseId && (
        <CaseShortcut record={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
