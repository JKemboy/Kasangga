// Application Status: renders the learner's current tutor-application state and any review feedback.
import { useEffect, useRef } from "react";
import { ArrowLeft, Check, Info } from "lucide-react";
import { DOCUMENTS, documentSlots } from "./applicationRules.js";
const date = (value) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not available";
function Details({ items }) {
  return (
    <dl className="ta-status-details">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function ApplicationStatus({
  application,
  account,
  onBack,
  onEdit,
  onDocument,
  error,
}) {
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  const docs = application.documents || {};
  const statusKey = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[_\s]+/g, " ");
  const latestReview = [...(application.history || [])]
    .reverse()
    .find((item) =>
      ["resubmission required", "rejected"].includes(statusKey(item.to)),
    );
  const requestedChanges =
    application.status === "Resubmission Required"
      ? latestReview?.requestedChanges || []
      : [];
  const adminFeedback =
    latestReview?.reason || application.rejectionReason || "";
  const hasDecision = [
    "Approved",
    "Rejected",
    "Resubmission Required",
  ].includes(application.status);
  const decisionTone =
    application.status === "Approved"
      ? "approved"
      : application.status === "Rejected"
        ? "rejected"
        : application.status === "Resubmission Required"
          ? "resubmission"
          : "";
  const decisionRecord = [...(application.history || [])]
    .reverse()
    .find((item) => statusKey(item.to) === statusKey(application.status));
  const decisionDate = date(decisionRecord?.at || application.reviewed_at);
  const decisionDetail = hasDecision
    ? `${application.status}${decisionDate !== "Not available" ? ` · ${decisionDate}` : ""}`
    : application.status === "Under Review"
      ? "Admin review is in progress."
      : "Waiting for an Admin decision.";
  const required = DOCUMENTS.filter((d) => d.required);
  const processed = required.every(
    (d) => docs[d.id]?.storagePath && !docs[d.id]?.error,
  );
  const info = application.account || account;
  return (
    <section className="tutor-application">
      <button className="ta-back" onClick={onBack}>
        <ArrowLeft size={14} />
        Back to Profile
      </button>
      <h1 ref={heading} tabIndex={-1}>
        Tutor Application Status
      </h1>
      <p className="ta-subtitle">
        Tutor approval is decided by an authorized Kasangga Admin.
      </p>
      <div className="ta-status-grid">
        <section className="ta-status-card">
          <header>
            <h2>Status</h2>
            <span
              className={`ta-status-pill ${decisionTone ? `decision-${decisionTone}` : ""}`}
            >
              {application.status || "Draft"}
            </span>
          </header>
          <div className="ta-status-facts">
            {[
              ["Application ID", application.id || "Not assigned"],
              [
                "Submitted Date",
                date(application.created || application.updated),
              ],
              ["Current Status", application.status || "Draft"],
              [
                "Last Updated",
                date(application.updated || application.created),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <ol className="ta-timeline">
            {[
              [
                "Application submitted for review",
                date(application.created || application.updated),
                !!application.id,
              ],
              [
                "Documents received",
                processed
                  ? "Supporting documents are available for manual review."
                  : "Some required documents have not been uploaded.",
                processed,
              ],
              [
                "Admin review",
                application.reviewed_at
                  ? date(application.reviewed_at)
                  : "Waiting for an Admin decision",
                !!application.reviewed_at || hasDecision,
              ],
              ["Decision", decisionDetail, hasDecision],
            ].map(([title, detail, done]) => (
              <li
                key={title}
                className={[
                  done ? "complete" : "",
                  title === "Decision" && decisionTone
                    ? `decision-${decisionTone}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span aria-label={done ? "Complete" : "Pending"}>
                  {done && <Check size={14} />}
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="ta-notice blue">
            <Info size={21} />
            <p>
              {application.status === "Approved"
                ? "Your tutor application was approved. You can continue to view this application status from your profile."
                : application.status === "Rejected"
                  ? "Your tutor application was rejected. Review the Admin feedback below before starting a new application."
                  : application.status === "Resubmission Required"
                    ? "The Admin requested changes. Your current status and application remain available here while you prepare the requested updates."
                    : "Your application is submitted to Kasangga for Admin review. You can keep using your Learner account while it is being reviewed."}
            </p>
          </div>
          {(adminFeedback || requestedChanges.length > 0) && (
            <div className="ta-notice blue">
              <Info size={21} />
              <div>
                <strong>
                  {application.status === "Rejected"
                    ? "Admin feedback"
                    : "Changes requested"}
                </strong>
                {adminFeedback && <p>{adminFeedback}</p>}
                {!!requestedChanges.length && (
                  <>
                    <p>Please resubmit or correct the following:</p>
                    <ul className="ta-requested-changes">
                      {requestedChanges.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
          {["Resubmission Required", "Rejected"].includes(
            application.status,
          ) && (
            <button
              type="button"
              className="ta-primary ta-application-action"
              onClick={onEdit}
            >
              {application.status === "Rejected"
                ? "Start a new application"
                : "Update requested items"}
            </button>
          )}
        </section>
        <div className="ta-status-column">
          <section className="ta-status-card">
            <h2>Student Information</h2>
            <Details
              items={[
                ["Full Name", info.name],
                ["Student ID", info.studentId],
                ["CarSU Email", info.email],
                ["College", info.college],
                ["Program", info.program],
                ["Year Level", info.year],
              ]}
            />
          </section>
          <section className="ta-status-card">
            <h2>Tutoring Information</h2>
            <Details
              items={[
                [
                  "Subjects / Areas of Expertise",
                  application.subjects?.join(", "),
                ],
                ["Course Code", application.courseCode],
                ["Course Description", application.courseDescription],
                ["GCash Account Name", application.gcashName],
                ["GCash Number", application.gcashNumber],
                ["Tutor Bio", application.bio],
                ["Tutoring Experience", application.experience],
                ["Reason for Applying", application.motivation],
              ]}
            />
          </section>
          <section className="ta-status-card">
            <h2>Uploaded Documents</h2>
            <Details
              items={documentSlots(docs)
                .filter(
                  (d) =>
                    d.id !== "awards" ||
                    docs.awards ||
                    !Object.keys(docs).some((key) => key.startsWith("awards_")),
                )
                .map((d) => [
                  d.title,
                  docs[d.id] ? (
                    <>
                      <button
                        className="ta-document-link"
                        onClick={() => onDocument(docs[d.id])}
                      >
                        {docs[d.id].name}
                      </button>
                      <span className="ta-file-type">
                        {" "}
                        ·{" "}
                        {docs[d.id].type === "application/pdf"
                          ? "PDF document"
                          : docs[d.id].type === "image/png"
                            ? "PNG image"
                            : "JPG image"}
                      </span>
                      <span className="ta-status-pill warning">
                        Manual Review by Admin
                      </span>
                      {docs[d.id].error && (
                        <p className="ta-muted">{docs[d.id].error}</p>
                      )}
                    </>
                  ) : d.required ? (
                    "Not uploaded"
                  ) : (
                    "Not provided (optional)"
                  ),
                ])}
            />
          </section>
          {error && (
            <p className="ta-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
