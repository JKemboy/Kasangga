import {
  AboutCaseDetails,
  ReportConditions as Conditions,
  ReportProgress as Progress,
} from "./MyReportCaseComponents.jsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flag,
  ShieldCheck,
  Info,
  Clock,
  CheckCircle,
  LockKeyhole,
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
  lcoOnlyReport,
  reportDate,
  caseClearanceText,
  caseConditions,
} from "../../../services/myReportPresentation.js";
import { button, Modal } from "./ui.jsx";
import "./my-reports.css";
import {
  REPEATED,
  incidentConfirmationLabel,
} from "../../../services/incidentTypes.js";

const rowKey = (row, about) =>
  `${about && row.case_id != null ? "case" : "report"}-${about && row.case_id != null ? row.case_id : row.report_id}`;
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
function EvidenceLink({ file, reviewLabel }) {
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
      <div>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {file.name || "Attachment"}
          </a>
        ) : (
          <span>
            {file.name || "Attachment"} · {error || "Loading secure link..."}
          </span>
        )}
        {reviewLabel && (
          <small className="mr-evidence-label">{reviewLabel}</small>
        )}
      </div>
    </li>
  );
}
export function ReportDetails({ row, about, student, go, onClose }) {
  if (about && row.case_id == null)
    return (
      <Modal title={`IR-${row.report_id} · Report about you`} onClose={onClose}>
        <div className="space-y-3 p-2 text-sm">
          <p>
            {row.incident_type} · {row.incident_category}
          </p>
          <p>Submitted: {reportDate(row.submitted_at)}</p>
          <p>Status: {reportStage(row, true)}</p>
          <p>
            <SessionSummary row={row} />
          </p>
          <p>{reportNotice(row, true)}</p>
          <p>
            The reporter's identity, statement, and evidence are handled
            privately by LCO and OSWE.
          </p>
        </div>
      </Modal>
    );
  if (about)
    return <AboutCaseDetails row={row} student={student} onClose={onClose} />;
  const activities = reportActivity(row, about);
  const stage = reportStage(row, about);
  const lcoOnly = !about && lcoOnlyReport(row);
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
          className={`mr-detail-status ${stage === "Resolved" ? "is-resolved" : stage === "OSWE Review" ? "is-osas" : ""}`}
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
              <dt>Category</dt>
              <dd>{row.incident_category}</dd>
              {row.incident_type === REPEATED && (
                <>
                  <dt>OSWE confirmation</dt>
                  <dd>
                    {incidentConfirmationLabel(row.oswe_confirmation_status)}
                  </dd>
                </>
              )}
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
              {!about && !lcoOnly && (
                <>
                  <dt>OSWE case</dt>
                  <dd>
                    {row.case?.case_id
                      ? `CASE-${row.case.case_id}`
                      : "Awaiting OSWE assessment"}
                  </dd>
                </>
              )}
              {about && (
                <>
                  <dt>Case officer</dt>
                  <dd>{row.officer || "OSWE"}</dd>
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
                  <EvidenceLink
                    key={file.id}
                    file={file}
                    reviewLabel={
                      !about
                        ? lcoOnly
                          ? "For LCO review"
                          : "For LCO and OSWE review"
                        : undefined
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="mr-box">
                No files attached.
                {lcoOnly && row.session
                  ? " LCO can still review the linked session records."
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
        {row.booking_id && about && (
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
    const key = `${args.tab}:${args.reportId}:${args.caseId}`;
    if ((!args.reportId && !args.caseId) || key === openedRoute.current) return;
    const tabs =
      args.tab === "received"
        ? ["received", "created"]
        : ["created", "received"];
    for (const targetTab of tabs) {
      const row = reports[targetTab].find((r) =>
        args.caseId
          ? r.case_id != null && String(r.case_id) === String(args.caseId)
          : String(r.report_id) === String(args.reportId),
      );
      if (row) {
        setTab(targetTab);
        setFilter("All");
        setQuery("");
        setSelectedKey(rowKey(row, targetTab === "received"));
        openedRoute.current = key;
        break;
      }
    }
  }, [args.tab, args.reportId, args.caseId, reports]);
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
          <p>Reports you filed, reports about you, and related OSWE cases.</p>
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
          ? "Reports about you appear during LCO review, followed by OSWE case updates when applicable. The reporter's identity, statement, and evidence remain private."
          : "LCO reviews every report first. Conduct matters are referred to OSWE. You can track review status and completion; actions against another student remain confidential."}
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
            ? "No reports or cases about you match this view."
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
                  className={`mr-card ${stage === "Clearance Blocked" ? "mr-blocked" : stage === "Resolved" ? "mr-about-resolved" : about ? "mr-about-review" : ""}`}
                  key={rowKey(row, about)}
                >
                  <header>
                    <span className="mr-icon">
                      {stage === "Clearance Blocked" ? (
                        <LockKeyhole size={15} />
                      ) : about && stage === "Resolved" ? (
                        <CheckCircle size={15} />
                      ) : about ? (
                        <Clock size={15} />
                      ) : (
                        <Flag size={15} />
                      )}
                    </span>
                    <div>
                      <h3>
                        {about && stage === "Clearance Blocked"
                          ? `Clearance Blocked - CASE-${row.case_id}`
                          : `${about ? (row.case_id != null ? `CASE-${row.case_id} - ` : `IR-${row.report_id} - `) : ""}${row.incident_type}`}
                      </h3>
                      <p>
                        {row.incident_category}
                        {" · "}
                        {about && stage === "Clearance Blocked"
                          ? `${row.incident_type}${row.decision?.at ? ` - decision recorded ${reportDate(row.decision.at)}` : ""} by OSWE${row.officer ? ` (${row.officer})` : ""}`
                          : about && row.case_id == null
                            ? `IR-${row.report_id} · submitted ${reportDate(row.submitted_at)}`
                            : about
                              ? `From report IR-${row.report_id} · case opened ${reportDate(row.opened_at)}`
                              : `IR-${row.report_id} · filed ${reportDate(row.submitted_at)} as ${row.filing_role}`}
                      </p>
                    </div>
                    <div className="mr-card-status">
                      <b>
                        {stage}
                        {about &&
                        stage === "Resolved" &&
                        (row.decision?.outcome || row.resolution)
                          ? ` - ${row.decision?.outcome || row.resolution}`
                          : ""}
                      </b>
                      {about && (
                        <small>
                          {row.case_id == null
                            ? "No OSWE case opened"
                            : stage === "Resolved"
                              ? caseClearanceText(row)
                              : row.decision
                                ? `Decision: ${row.decision.outcome}`
                                : row.resolution
                                  ? `Outcome: ${row.resolution}`
                                  : "No decision yet"}
                        </small>
                      )}
                    </div>
                  </header>
                  <div className="mr-card-body">
                    {(!about || stage !== "Clearance Blocked") && (
                      <>
                        <h4>{about ? "Related booking" : "Session"}</h4>
                        <p>
                          <SessionSummary row={row} />
                        </p>
                      </>
                    )}
                    {stage !== "Clearance Blocked" && (
                      <Progress
                        row={row}
                        about={about && row.case_id != null}
                      />
                    )}
                    {about &&
                      row.decision &&
                      (stage === "Clearance Blocked" ||
                        caseConditions(row).some((c) => !c.completed)) && (
                        <Conditions row={row} student={reports.student} />
                      )}
                  </div>
                  <footer>
                    <p>
                      <Info size={13} />
                      {about && stage === "Clearance Blocked"
                        ? `Questions? Visit the OSWE office${row.officer_email ? ` or email ${row.officer_email}` : ""}.`
                        : reportNotice(row, about)}
                    </p>
                    <button
                      className={button}
                      type="button"
                      onClick={() => setSelectedKey(rowKey(row, about))}
                    >
                      {about && row.case_id != null
                        ? "View Case Details"
                        : "View Details"}
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
