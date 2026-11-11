import { notificationHighlight } from "../shared/notificationHighlight.js";
import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { button, primary } from "../shared/staffUi.jsx";
import PortalAvatar from "../shared/PortalAvatar.jsx";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import CaseReviewFlow, { caseReviewDate } from "./CaseReviewFlow.jsx";
import { matchesCaseStatus } from "./OsweIncidents.jsx";
import { evidenceReviewState } from "../../services/osweDecisionRules.js";
import "./case-review-flow.css";
export default function OsweCaseWorkspace({
  notificationTarget,
  settings,
  searchQuery = "",
  onSearchChange,
  initialFilter = {},
}) {
  const database = useOsweDatabase();
  const [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  const [query, setQuery] = useState(searchQuery),
    [page, setPage] = useState(1);
  const status = initialFilter.status || "";
  const pending = !!initialFilter.pendingEvidence;
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
        !r.recorded &&
        matchesCaseStatus(r.status, status) &&
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
    .sort(
      (a, b) =>
        (Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0),
    );
  const size = Math.max(1, Number(settings?.pageSize) || 10),
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages);
  if (selected)
    return (
      <CaseReviewFlow
        key={selected.reportDatabaseId}
        record={selected}
        inline
        onClose={() => setSelected(null)}
        onRecorded={() => {
          setSelected(null);
          setNotice(
            "Decision saved. View the decision in Case Archive; manage any clearance requirements in Student Clearance Review.",
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
        <div className="case-list-tabs">
          <span>To Review ({rows.filter((r) => !r.recorded).length})</span>
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
            : "No cases to review match your search."}
        </p>
      )}
      {filtered.slice((current - 1) * size, current * size).map((r) => (
        <article
          className="case-list-card"
          key={r.reportDatabaseId}
          {...notificationHighlight(
            !!notificationTarget &&
              String(r.reportDatabaseId) ===
                String(notificationTarget.reportDatabaseId),
          )}
        >
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
          </div>
          <footer>
            <button className={primary} onClick={() => setSelected(r)}>
              Open Case
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
    </section>
  );
}
