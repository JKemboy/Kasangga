import { statusClass } from "../shared/statusColors.js";
import EvidencePreview from "./EvidencePreview.jsx";
import { useEffect, useRef, useState } from "react";
import { X, Info, Check, Users } from "lucide-react";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
import { dateLabel } from "./adminData.js";
import { reviewIncident } from "./incidentData.js";
import "./incident-details.css";

export default function IncidentDetails({
  record: r,
  onClose,
  onSave,
  onBooking,
  onAccount,
}) {
  const [preview, setPreview] = useState(false);
  const [confirmReferral, setConfirmReferral] = useState(false);
  const ref = useRef(null);
  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const technical = ["Platform / Technical", "Technical issue"].includes(
    r.type,
  );
  const complete = [
    "Admin Screening Complete",
    "Resolved by Admin",
    "Resolved by OSAS",
    "Under OSAS Review",
  ].includes(r.status);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function open(next) {
    setAction(next);
    setConfirmReferral(false);
    setNotes("");
    setError("");
  }
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const next = reviewIncident(r, action, notes);
      if (action === "Referred to OSAS" && !confirmReferral) {
        setConfirmReferral(true);
        return;
      }
      if (!(await onSave(next)))
        throw new Error(
          "This action is saved to the database yet. Nothing was saved.",
        );
      setAction("");
      setNotice("Review saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const pill = (value) => (
    <span className={statusClass(value, "ai-pill")}>{value}</span>
  );
  const facts = [
    ["Incident Report ID", r.id],
    [
      "Booking ID",
      r.booking && onBooking ? (
        <button className="text-green-800" onClick={() => onBooking(r)}>
          {r.booking}
        </button>
      ) : (
        r.booking || "None"
      ),
    ],
    [
      "Incident Type",
      <>
        {r.type}
        <small>{r.issue}</small>
      </>,
    ],
    [
      "Reporter",
      onAccount ? (
        <button className="text-green-800" onClick={() => onAccount(r)}>
          {r.reporter}
        </button>
      ) : (
        r.reporter
      ),
    ],
    ["Reported User", r.reported],
    ["Priority", pill(r.priority)],
    ["Submitted Date", dateLabel(r.date)],
    ["Admin Status", pill(r.status)],
    ["OSAS Referral Status", pill(r.referral)],
    ...(r.osasCaseId
      ? [
          ["OSAS Case", r.osasCaseId],
          ["OSAS Case Status", r.osasStatus],
        ]
      : []),
    ...(r.osasOutcome
      ? [
          ["OSAS Decision", r.osasOutcome],
          ["Decision Notes", r.osasNotes],
          ["Policy Basis", r.osasBasis || "Not recorded"],
        ]
      : []),
  ];
  return (
    <dialog
      ref={ref}
      className="admin-incident-details"
      aria-labelledby="incident-details-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <div>
          <h2 id="incident-details-title">
            {r.id} {pill(r.priority)}
          </h2>
          <p>
            {r.type} · {r.issue}
          </p>
        </div>
        <button
          className={button}
          aria-label="Close incident details"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </header>
      <div className="aid-body">
        <dl>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h3>Description</h3>
        <div className="aid-description">
          <strong>
            AS SUBMITTED ·{" "}
            {technical ? "PLATFORM REPORT" : "ALLEGATION, NOT A FINDING"}
          </strong>
          <p>
            {r.description ||
              "The original report description is not included in this database record."}
          </p>
        </div>
        <h3>Evidence ({r.evidence?.length || 0})</h3>
        <div className="aid-evidence">
          {r.evidence?.length ? (
            <>
              <p>{r.evidence.map((e) => e.name).join(", ")}</p>
              <button className={button} onClick={() => setPreview(true)}>
                View attachment records
              </button>
            </>
          ) : (
            "No evidence files recorded."
          )}
        </div>
        <div className="aid-info">
          <Info size={21} />
          <p>
            {technical
              ? "This is a platform or technical issue. Admin can resolve it and record what was done."
              : "Conduct concerns are referred to OSAS for institutional review."}
          </p>
        </div>
        {r.referral === "Referred to OSAS" && (
          <div className="aid-info !bg-purple-50">
            <div>
              <h3>Referred to OSAS</h3>
              <p>
                {[...(r.history || [])]
                  .reverse()
                  .find((h) => h.action === "Referred to OSAS")?.notes ||
                  "Referred for institutional assessment. Referral notes are not available in this database record."}
              </p>
              <small>
                OSAS assesses the matter. Admin has no disciplinary controls.
              </small>
            </div>
          </div>
        )}
        {!!r.history?.length && (
          <details>
            <summary>Review history ({r.history.length})</summary>
            {r.history.map((h, i) => (
              <div key={i}>
                <strong>{h.action}</strong>
                <p>{h.notes}</p>
                <small>
                  {h.by} ·{" "}
                  {new Date(h.at).toLocaleString("en-PH", {
                    timeZone: "Asia/Manila",
                  })}
                </small>
              </div>
            ))}
          </details>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
      <footer>
        {complete ? (
          <p>Completed Admin review · {r.status}</p>
        ) : (
          <>
            <button className={button} onClick={() => open("Referred to OSAS")}>
              <Users size={15} />
              Refer to OSAS
            </button>
            {technical && (
              <button
                className={primary}
                onClick={() => open("Resolved by Admin")}
              >
                <Check size={15} />
                Handle Platform/Technical Issue
              </button>
            )}
          </>
        )}
      </footer>
      {action && (
        <Modal
          title={
            action === "Resolved by Admin"
              ? "Handle Platform/Technical Issue"
              : "Refer to OSAS"
          }
          subtitle={`${r.id} · ${r.issue}`}
          onClose={() => setAction("")}
        >
          <form className="aid-action" onSubmit={submit}>
            <div className="aid-info">
              <Info size={21} />
              <p>
                {action === "Resolved by Admin"
                  ? "Resolve only platform or technical issues. Conduct concerns go to OSAS. Participants arrange any session rescheduling."
                  : "A referral does not establish misconduct. OSAS assesses whether a formal case is needed. The referral status is saved in the database."}
              </p>
            </div>
            <label htmlFor="incident-resolution">
              {action === "Resolved by Admin"
                ? "What was done (required)"
                : "Referral note for OSAS (required)"}
            </label>
            <textarea
              id="incident-resolution"
              className={input}
              rows={4}
              maxLength={2000}
              required
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setConfirmReferral(false);
              }}
              placeholder={
                action === "Resolved by Admin"
                  ? "Describe the steps taken to resolve this issue."
                  : "Describe the concern requiring institutional review."
              }
            />
            {confirmReferral && (
              <p className="aid-info">
                Confirm this database referral to OSAS. No external notification
                will be sent.
              </p>
            )}
            <small>
              {notes.trim().length}/15 characters minimum · saved to the
              database
            </small>
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            <div className="aid-action-footer">
              <button
                type="button"
                className={button}
                onClick={() => setAction("")}
              >
                Cancel
              </button>
              <button
                className={primary}
                disabled={saving || notes.trim().length < 15}
              >
                {action === "Resolved by Admin"
                  ? "Mark Resolved"
                  : confirmReferral
                    ? "Confirm Referral"
                    : "Continue"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {preview && (
        <EvidencePreview record={r} onClose={() => setPreview(false)} />
      )}
    </dialog>
  );
}
