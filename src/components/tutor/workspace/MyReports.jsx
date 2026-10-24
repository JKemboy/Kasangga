import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flag,
  ShieldCheck,
  CheckCircle,
  Info,
  Clock,
  LockKeyhole,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import { listMyReports } from "../../../services/myReports.js";
import { incidentEvidenceUrl } from "../../../services/incidentReports.js";
import {
  aboutStages,
  filedStages,
  reportStage,
  reportNotice,
  reportActivity,
  completionFormHtml,
  reportSteps,
  adminOnlyReport,
} from "../../../services/myReportPresentation.js";
import { button, Modal } from "./ui.jsx";
import "./my-reports.css";

export const reportDate = (value) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00+08:00" : value,
      ).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        ...(value.length > 10 ? { timeStyle: "short" } : {}),
      })
    : "Not recorded";
const rowKey = (row, about) =>
  `${about ? "case" : "report"}-${about ? row.case_id : row.report_id}`;
const sessionTime = (value) => {
  if (!value) return "Not recorded";
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
};
function SessionSummary({ row }) {
  if (!row.session) return <span>No linked session</span>;
  return (
    <span>
      {row.session.title || "Tutoring session"} · BK-{row.booking_id}
      {row.other_party ? ` · session with ${row.other_party}` : ""}
    </span>
  );
}
function Progress({ row, about }) {
  const stage = reportStage(row, about);
  const steps = reportSteps(row, about);
  const active = about
    ? stage === "Resolved"
      ? 3
      : row.decision
        ? 2
        : 1
    : Math.max(1, steps.indexOf(stage));
  return (
    <ol className="mr-progress" aria-label="Review progress">
      {steps.map((step, i) => (
        <li
          key={step}
          className={i <= active ? "is-current" : ""}
          aria-current={i === active ? "step" : undefined}
        >
          <span>{i < active ? <CheckCircle size={15} /> : i + 1}</span>
          <b>{step}</b>
        </li>
      ))}
    </ol>
  );
}
function EvidenceLink({ file }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    incidentEvidenceUrl(file.path)
      .then((value) => {
        if (alive) setUrl(value);
      })
      .catch(() => {
        if (alive) setError("Could not open this attachment.");
      });
    return () => {
      alive = false;
    };
  }, [file.path]);
  return (
    <li>
      <FileText size={13} />
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {file.name || "Attachment"}
        </a>
      ) : (
        <span>
          {file.name || "Attachment"} · {error || "Loading secure link..."}
        </span>
      )}
    </li>
  );
}
function Conditions({ row, student }) {
  if (!row.decision) return null;
  const hasCondition = !!row.decision.condition;
  const hasHolds = row.holds?.some((h) => h.status === "active");
  function download() {
    const url = URL.createObjectURL(
      new Blob([completionFormHtml(row, student)], {
        type: "text/html;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `CASE-${row.case_id}-completion-form.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="mr-conditions">
      <div className="mr-columns">
        <div>
          <h3>What happens next</h3>
          <p>{reportNotice(row, true)}</p>
          <h3>Decision basis</h3>
          <p>
            {row.decision.basis ||
              "Contact OSLD for the recorded policy basis."}
          </p>
        </div>
        <div>
          <h3>Conditions for completion</h3>
          {hasCondition ? (
            <div className="mr-condition">
              <span>
                {row.decision.condition_done ? (
                  <CheckCircle size={15} />
                ) : (
                  <Clock size={15} />
                )}
                {row.decision.condition}
              </span>
              <b>{row.decision.condition_done ? "Completed" : "Pending"}</b>
            </div>
          ) : (
            <p>No completion condition is recorded.</p>
          )}
          {row.decision.due && (
            <p className="mr-muted">Due: {reportDate(row.decision.due)}</p>
          )}
          <p className="mr-muted">OSLD verifies and updates completion.</p>
          {hasHolds && (
            <p className="mr-muted">
              Only OSLD can release a recorded clearance hold.
            </p>
          )}
        </div>
      </div>
      {(hasCondition || hasHolds) && (
        <section className="mr-form">
          <h3>
            <FileText size={15} /> OSLD Completion Form
          </h3>
          <ol>
            <li>
              Download the printable form with your recorded case details.
            </li>
            <li>Complete and sign it after meeting the recorded conditions.</li>
            <li>Submit in person to OSLD for verification.</li>
          </ol>
          <button type="button" className={button} onClick={download}>
            <Download size={13} className="mr-1 inline" />
            Download Completion Form
          </button>
          <small>
            Printable HTML form. Downloading does not submit it or update your
            case.
          </small>
        </section>
      )}
    </div>
  );
}
export function ReportDetails({ row, about, student, go, onClose }) {
  const activities = reportActivity(row, about);
  const stage = reportStage(row, about);
  const adminOnly = !about && adminOnlyReport(row);
  return (
    <Modal
      title={`${about ? "CASE" : "IR"}-${about ? row.case_id : row.report_id} · ${row.incident_type}`}
      onClose={onClose}
      className="mr-report-modal"
      headerLabel={
        about ? "Case about you" : `Report filed by you - ${row.filing_role}`
      }
      headerAside={
        <span
          className={`mr-detail-status ${stage === "Resolved" ? "is-resolved" : ""}`}
        >
          {stage}
        </span>
      }
    >
      <div className="mr-details">
        <Progress row={row} about={about} />
        <div className="mr-columns">
          <div>
            <h3>{about ? "Case information" : "Report"}</h3>
            <dl className="mr-facts">
              <dt>Issue type</dt>
              <dd>{row.incident_type}</dd>
              <dt>{about ? "Case opened" : "Filed"}</dt>
              <dd>
                {reportDate(about ? row.opened_at : row.submitted_at)}
                {!about && ` as ${row.filing_role}`}
              </dd>
              <dt>Booking</dt>
              <dd>
                <SessionSummary row={row} />
              </dd>
              {!about && row.other_party && (
                <>
                  <dt>Other party</dt>
                  <dd>
                    {row.other_party}
                    {row.other_party_role ? ` (${row.other_party_role})` : ""}
                  </dd>
                </>
              )}
              {row.session && (
                <>
                  <dt>Session</dt>
                  <dd>
                    {reportDate(row.session.date)} ·{" "}
                    {sessionTime(row.session.start)} -{" "}
                    {sessionTime(row.session.end)} ·{" "}
                    {row.session.type?.replaceAll("_", " ")}
                    {row.session.location
                      ? ` (${row.session.location})`
                      : row.session.platform
                        ? ` (${row.session.platform})`
                        : ""}
                  </dd>
                </>
              )}
              {about && (
                <>
                  <dt>Case officer</dt>
                  <dd>{row.officer || "OSLD"}</dd>
                  <dt>Decision</dt>
                  <dd>
                    {row.decision?.outcome ||
                      row.resolution ||
                      "No decision recorded"}
                  </dd>
                </>
              )}
            </dl>
          </div>
          <div>
            {!about && (
              <>
                <h3>What you reported</h3>
                <p className="mr-box">{row.description}</p>
              </>
            )}
            {about && row.decision?.notes && (
              <>
                <h3>Recorded decision</h3>
                <p className="mr-box">{row.decision.notes}</p>
              </>
            )}
            <h3>Evidence you attached</h3>
            {row.evidence?.length ? (
              <ul className="mr-files">
                {row.evidence.map((file) => (
                  <EvidenceLink key={file.id} file={file} />
                ))}
              </ul>
            ) : (
              <p className="mr-box">
                No files attached.
                {adminOnly && row.session
                  ? " Admin can still review the linked session records."
                  : ""}
              </p>
            )}
          </div>
        </div>
        {about && <Conditions row={row} student={student} />}
        {about && row.holds?.length > 0 && (
          <section>
            <h3>Recorded clearance holds</h3>
            {row.holds.map((hold) => (
              <p key={hold.id} className="mr-box">
                {hold.reason} · {hold.status}
                {hold.resolved_at
                  ? ` · Released ${reportDate(hold.resolved_at)}`
                  : ""}
              </p>
            ))}
          </section>
        )}
        <h3>Activity</h3>
        {activities.length ? (
          <ol className="mr-activity">
            {activities.map((a, i) => (
              <li key={i}>
                <b>{a.title}</b>
                <time>{reportDate(a.at)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mr-muted">No dated activity is recorded.</p>
        )}
        <p className="mr-info">
          <Info size={14} />
          {reportNotice(row, about)}
        </p>
        {!about && !row.refund && row.refund_status && (
          <p className="mr-muted">
            Your related refund: {row.refund_status.replaceAll("_", " ")}
          </p>
        )}
        {row.booking_id && !adminOnly && (
          <button
            className={button}
            type="button"
            onClick={() => {
              onClose();
              go("sessions", { sessionId: String(row.booking_id) });
            }}
          >
            View Session
          </button>
        )}
      </div>
    </Modal>
  );
}
export default function MyReports({ go, args = {} }) {
  const [reports, setReports] = useState({
    created: [],
    received: [],
    student: {},
  });
  const [tab, setTab] = useState(
    args.tab === "received" ? "received" : "created",
  );
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const openedRoute = useRef("");
  const refresh = useCallback(async () => {
    const current = ++request.current;
    try {
      const next = await listMyReports();
      if (current === request.current) {
        setReports(next);
        setError("");
      }
    } catch (cause) {
      if (current === request.current) setError(cause.message);
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("campustutor:sessions-changed", refresh);
    return () => {
      request.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("campustutor:sessions-changed", refresh);
    };
  }, [refresh]);
  useEffect(() => {
    setTab(args.tab === "received" ? "received" : "created");
    setFilter("All");
  }, [args.tab]);
  useEffect(() => {
    const key = `${args.tab}:${args.reportId}`;
    if (!args.reportId || key === openedRoute.current) return;
    const about = args.tab === "received";
    const row = reports[about ? "received" : "created"].find(
      (r) => String(r.report_id) === String(args.reportId),
    );
    if (row) {
      setSelectedKey(rowKey(row, about));
      openedRoute.current = key;
    }
  }, [args.tab, args.reportId, reports]);
  const about = tab === "received";
  const stages = about ? aboutStages : filedStages;
  const all = reports[tab];
  const rows = all.filter((r) =>
    `${r.report_id} ${r.case_id || ""} ${r.incident_type} ${r.session?.title || ""} ${reportStage(r, about)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const visible = rows.filter(
    (r) => filter === "All" || reportStage(r, about) === filter,
  );
  const selected = all.find((r) => rowKey(r, about) === selectedKey);
  return (
    <section className="mr-reports">
      <header className="mr-heading">
        <div>
          <h1>My Reports</h1>
          <p>
            Reports you filed, and OSLD cases where you are the reported
            student.
          </p>
        </div>
        <button
          className={button}
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh reports"
        >
          <RefreshCw size={13} />
        </button>
      </header>
      <nav className="mr-tabs" aria-label="Report type">
        {[
          ["created", "Filed by Me"],
          ["received", "About Me"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              setFilter("All");
              setSelectedKey(null);
            }}
          >
            {label} ({reports[key].length})
          </button>
        ))}
      </nav>
      <p className="mr-info">
        <ShieldCheck size={14} />
        {about
          ? "Cases about you appear here once a formal case is opened by OSLD. The reporter's identity and statement are handled by OSLD."
          : "Admin reviews every report first. Conduct matters are referred to OSLD. You can track review status and completion; actions against another student remain confidential."}
      </p>
      <div className="mr-toolbar">
        <nav className="mr-tabs" aria-label="Report status">
          {["All", ...stages].map((stage) => (
            <button
              type="button"
              key={stage}
              aria-pressed={filter === stage}
              onClick={() => setFilter(stage)}
            >
              {stage} (
              {stage === "All"
                ? all.length
                : all.filter((r) => reportStage(r, about) === stage).length}
              )
            </button>
          ))}
        </nav>
        <input
          type="search"
          aria-label="Search reports"
          placeholder="Search reports or cases..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="mr-error">
          {error}{" "}
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      {loading && <p role="status">Loading your reports...</p>}
      {!loading && !error && !visible.length && (
        <p className="mr-empty" role="status">
          {about
            ? "No formal cases about you match this view."
            : "No reports filed by you match this view."}
        </p>
      )}
      {!error &&
        stages.map((stage) => {
          const group = visible.filter((r) => reportStage(r, about) === stage);
          return group.length ? (
            <section className="mr-group" key={stage}>
              <h2>
                {stage} <span>{group.length}</span>
              </h2>
              {group.map((row) => (
                <article
                  className={`mr-card ${stage === "Clearance Blocked" ? "mr-blocked" : ""}`}
                  key={rowKey(row, about)}
                >
                  <header>
                    <span className="mr-icon">
                      {stage === "Clearance Blocked" ? (
                        <LockKeyhole size={15} />
                      ) : (
                        <Flag size={15} />
                      )}
                    </span>
                    <div>
                      <h3>
                        {about ? `CASE-${row.case_id} · ` : ""}
                        {row.incident_type}
                      </h3>
                      <p>
                        {about
                          ? `From report IR-${row.report_id} · case opened ${reportDate(row.opened_at)}`
                          : `IR-${row.report_id} · filed ${reportDate(row.submitted_at)} as ${row.filing_role}`}
                      </p>
                    </div>
                    <div className="mr-card-status">
                      <b>{stage}</b>
                      {about && (
                        <small>
                          {row.decision
                            ? `Decision: ${row.decision.outcome}`
                            : row.resolution
                              ? `Outcome: ${row.resolution}`
                              : "No decision yet"}
                        </small>
                      )}
                    </div>
                  </header>
                  <div className="mr-card-body">
                    {!about && (
                      <>
                        <h4>Session</h4>
                        <p>
                          <SessionSummary row={row} />
                        </p>
                      </>
                    )}
                    <Progress row={row} about={about} />
                    {about && row.decision && (
                      <Conditions row={row} student={reports.student} />
                    )}
                  </div>
                  <footer>
                    <p>
                      <Info size={13} />
                      {reportNotice(row, about)}
                    </p>
                    <button
                      className={button}
                      type="button"
                      onClick={() => setSelectedKey(rowKey(row, about))}
                    >
                      {about ? "View Case Details" : "View Details"}
                    </button>
                  </footer>
                </article>
              ))}
            </section>
          ) : null;
        })}
      {selected && (
        <ReportDetails
          row={selected}
          about={about}
          student={reports.student}
          go={go}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </section>
  );
}
