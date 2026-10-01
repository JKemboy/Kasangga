import { useEffect, useRef } from "react";
import { ArrowLeft, Check, Info } from "lucide-react";
import { DOCUMENTS } from "./applicationRules.js";
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
  const required = DOCUMENTS.filter((d) => d.required);
  const processed = required.every(
    (d) => docs[d.id]?.storageId && !docs[d.id]?.error && !!docs[d.id]?.text,
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
        Tutor approval is decided by an authorized CampusTutor Admin.
      </p>
      <div className="ta-status-grid">
        <section className="ta-status-card">
          <header>
            <h2>Status</h2>
            <span className="ta-status-pill">
              {application.status || "Draft"}
            </span>
          </header>
          <div className="ta-status-facts">
            {[
              ["Application ID", application.id || "Not assigned"],
              ["Saved Date", date(application.created || application.updated)],
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
                "Application saved on this browser",
                date(application.created || application.updated),
                !!application.id,
              ],
              [
                "Documents processed (OCR assist)",
                processed
                  ? "Text extracted and flagged for manual review"
                  : "Some documents need manual review or have not been uploaded.",
                processed,
              ],
              ["Admin review", "Not submitted to an Admin", false],
              ["Decision", "Not available", false],
            ].map(([title, detail, done]) => (
              <li key={title} className={done ? "complete" : ""}>
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
              Your application is saved locally. Admin submission is not
              connected yet, so it is not in the review queue. You can keep
              booking sessions as a Learner.
            </p>
          </div>
          <button onClick={onEdit}>Edit saved application</button>
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
                [
                  "Specific Skills / Topics",
                  application.subjects?.map((s) => (
                    <div key={s}>
                      <strong>{s}:</strong>{" "}
                      {(application.topics?.[s] || []).join(", ") ||
                        "None selected"}
                    </div>
                  )),
                ],
                ["Tutor Bio", application.bio],
                ["Tutoring Experience", application.experience],
                ["Preferred Session Type", application.type],
                ["Reason for Applying", application.motivation],
              ]}
            />
          </section>
          <section className="ta-status-card">
            <h2>Uploaded Documents</h2>
            <Details
              items={DOCUMENTS.map((d) => [
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
                      Needs Manual Review
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
