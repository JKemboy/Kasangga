import { useState } from "react";
import { CheckCircle, Clock, Download, FileText, Info } from "lucide-react";
import { Modal, button, primary } from "./ui.jsx";
import {
  caseClearanceText,
  caseConditions,
  completionFormHtml,
  completionFormStatus,
  reportActivity,
  reportDate,
  reportNotice,
  reportStage,
  reportSteps,
} from "../../../services/myReportPresentation.js";

export function ReportProgress({ row, about = false }) {
  const stage = reportStage(row, about);
  const steps = reportSteps(row, about);
  const active = about
    ? stage === "Resolved"
      ? 3
      : row.decision
        ? 2
        : 1
    : stage === "OSWE Review" && !row.case
      ? steps.indexOf("Referred to OSWE")
      : Math.max(1, steps.indexOf(stage));
  return (
    <ol className="mr-progress" aria-label="Review progress">
      {steps.map((step, i) => (
        <li
          key={step}
          className={i <= active ? "is-current" : ""}
          aria-current={i === active ? "step" : undefined}
        >
          <span>
            {i < active || (about && stage === "Resolved") ? (
              <CheckCircle size={15} />
            ) : (
              i + 1
            )}
          </span>
          <b>{step}</b>
        </li>
      ))}
    </ol>
  );
}
export function CompletionFormPreview({ row, student, onClose }) {
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
    <Modal
      title="OSWE Completion Form"
      className="mr-completion-modal"
      onClose={onClose}
      footer={
        <div className="mr-form-actions">
          <button type="button" className={primary} onClick={download}>
            <Download size={13} className="mr-1 inline" />
            Download printable form
          </button>
          <button type="button" className={button} onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <iframe
        title="OSWE Completion Form preview"
        sandbox=""
        srcDoc={completionFormHtml(row, student)}
        className="mr-form-preview"
      />
    </Modal>
  );
}
export function ReportConditions({ row, student, details = false }) {
  const [preview, setPreview] = useState(false);
  if (!row.decision) return null;
  const conditions = caseConditions(row);
  const blocked = reportStage(row, true) === "Clearance Blocked";
  return (
    <div className="mr-conditions">
      <div className={details ? "" : "mr-columns"}>
        {!details && (
          <div>
            <h3>What happens next</h3>
            <p>{reportNotice(row, true)}</p>
            <h3>Decision basis</h3>
            <p>
              {row.decision.notes ||
                row.decision.basis ||
                "Contact OSWE for the recorded decision basis."}
            </p>
          </div>
        )}
        <div>
          <h3>
            {blocked ? "Conditions for clearance" : "Recorded conditions"}
          </h3>
          {conditions.length ? (
            conditions.map((condition, i) => (
              <div className="mr-condition" key={i}>
                <span>
                  {condition.completed ? (
                    <CheckCircle size={15} />
                  ) : (
                    <Clock size={15} />
                  )}
                  {condition.text}
                </span>
                <b className={condition.completed ? "mr-condition-done" : ""}>
                  {condition.completed ? "Completed" : "Pending"}
                </b>
              </div>
            ))
          ) : (
            <p>No completion condition is recorded.</p>
          )}
          {row.decision.due && (
            <p className="mr-muted">Due: {reportDate(row.decision.due)}</p>
          )}
          <p className="mr-muted">
            OSWE updates this list after verifying compliance.
          </p>
        </div>
      </div>
      {(conditions.length > 0 || blocked) && (
        <section className="mr-form">
          <div className="mr-form-heading">
            <h3>
              <FileText size={15} />
              OSWE Completion Form
            </h3>
            <span className="mr-detail-status">
              {completionFormStatus(row)}
            </span>
          </div>
          <ol>
            <li>
              <b>Download</b> the form for CASE-{row.case_id}. Your recorded
              details and conditions are filled in.
            </li>
            <li>
              <b>Complete and sign</b> it after meeting the recorded conditions.
            </li>
            <li>
              <b>Submit in person</b> to OSWE for verification.
            </li>
          </ol>
          <div className="mr-form-actions">
            <button
              type="button"
              className={primary}
              onClick={() => setPreview(true)}
            >
              <Download size={13} className="mr-1 inline" />
              Download Completion Form
            </button>
            <span className="mr-muted">
              <Info size={13} className="mr-1 inline" />
              Submitted face to face at the OSWE office, not online.
            </span>
          </div>
          <small>
            Downloading or previewing does not record submission or release a
            hold.
          </small>
        </section>
      )}
      {preview && (
        <CompletionFormPreview
          row={row}
          student={student}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
export function AboutCaseDetails({ row, student, onClose }) {
  const stage = reportStage(row, true);
  const activities = reportActivity(row, true);
  const blocked = stage === "Clearance Blocked";
  return (
    <Modal
      title={`CASE-${row.case_id} - ${row.incident_type}`}
      headerLabel="Report about you - OSWE case"
      headerAside={
        <span
          className={`mr-detail-status ${blocked ? "is-blocked" : stage === "Resolved" ? "is-resolved" : "is-osas"}`}
        >
          {stage}
        </span>
      }
      className="mr-report-modal"
      onClose={onClose}
    >
      <div className="mr-details">
        {!blocked && <ReportProgress row={row} about />}
        <div className="mr-columns">
          <section>
            <h3>Case</h3>
            <dl className="mr-facts">
              <dt>Case ID</dt>
              <dd>CASE-{row.case_id}</dd>
              <dt>Incident report</dt>
              <dd>IR-{row.report_id}</dd>
              <dt>Concern</dt>
              <dd>{row.incident_type}</dd>
              <dt>Related booking</dt>
              <dd>
                {row.booking_id
                  ? `BK-${row.booking_id} - ${row.session?.title || "Tutoring session"}`
                  : "No linked booking"}
              </dd>
              <dt>Case opened</dt>
              <dd>{reportDate(row.opened_at)}</dd>
              <dt>Reporter</dt>
              <dd>Kept confidential by OSWE</dd>
              <dt>Case officer</dt>
              <dd>
                {row.officer || "OSWE"}
                {row.officer_email && (
                  <>
                    {" "}
                    -{" "}
                    <a href={`mailto:${row.officer_email}`}>
                      {row.officer_email}
                    </a>
                  </>
                )}
              </dd>
            </dl>
          </section>
          <section>
            <h3>Decision</h3>
            <dl className="mr-facts">
              <dt>{blocked ? "Case action" : "Outcome"}</dt>
              <dd>
                {row.decision?.outcome ||
                  row.resolution ||
                  "Pending - OSWE has not recorded a decision"}
              </dd>
              {row.decision?.at && (
                <>
                  <dt>Recorded</dt>
                  <dd>{reportDate(row.decision.at)}</dd>
                </>
              )}
              <dt>{blocked ? "Effect" : "Clearance"}</dt>
              <dd>{caseClearanceText(row)}</dd>
            </dl>
            {row.decision && (
              <>
                <h3 className="mr-decision-heading">Decision basis</h3>
                <p className="mr-box">
                  {row.decision.notes ||
                    row.decision.basis ||
                    "No decision basis is recorded."}
                </p>
                {row.decision.basis && (
                  <p className="mr-muted">
                    Policy reference: {row.decision.basis}
                  </p>
                )}
              </>
            )}
            {row.response_request?.notes && (
              <>
                <h3 className="mr-decision-heading">Requested response</h3>
                <p className="mr-box">{row.response_request.notes}</p>
                {row.response_request.due && (
                  <p className="mr-muted">
                    Due: {reportDate(row.response_request.due)}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
        {row.decision && (
          <ReportConditions row={row} student={student} details />
        )}
        {!blocked && (
          <section>
            <h3>Activity</h3>
            {activities.length ? (
              <ol className="mr-activity">
                {activities.map((activity, i) => (
                  <li key={i}>
                    <b>{activity.title}</b>
                    <time>{reportDate(activity.at)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mr-muted">No dated activity is recorded.</p>
            )}
          </section>
        )}
        <p className="mr-info">
          <Info size={14} />
          {blocked
            ? "Questions about this decision go to the OSWE office. Kasangga does not share the reporter's statement with you."
            : reportNotice(row, true)}
        </p>
      </div>
    </Modal>
  );
}
