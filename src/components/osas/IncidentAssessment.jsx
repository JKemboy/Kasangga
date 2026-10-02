import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
import CaseShortcut from "./CaseShortcut.jsx";
import { loadOsasCases } from "./OsasCases.jsx";
import { assessIncident } from "./incidentAssessment.js";
import "./case-shortcuts.css";
export default function IncidentAssessment({ record: r, onSave, onClose }) {
  const ref = useRef(null),
    [action, setAction] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState("");
  const [cases, setCases] = useState(loadOsasCases);
  const linked = cases.find((c) => c.caseId === r.caseId);
  const canAssess =
    !r.caseId &&
    !r.assessment &&
    r.referral !== "Not Referred" &&
    r.status !== "Admin Handling";
  useEffect(() => {
    if (linked) return;
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, [!!linked]);
  function save() {
    try {
      const next = assessIncident(r, action, notes, loadOsasCases());
      if (onSave(next) === false) throw Error("Could not save assessment.");
      setCases(loadOsasCases());
      setAction("");
    } catch (e) {
      setError(e.message);
    }
  }
  if (linked)
    return (
      <CaseShortcut
        record={linked}
        initialView="incident"
        onClose={onClose}
        onSave={(updated) => {
          try {
            const next = loadOsasCases().map((c) =>
              c.caseId === updated.caseId ? updated : c,
            );
            localStorage.setItem(
              "campustutor:osas-case-reviews:v1",
              JSON.stringify(next),
            );
            setCases(next);
            return true;
          } catch {
            return false;
          }
        }}
      />
    );
  return (
    <dialog
      ref={ref}
      className="ocx-dialog"
      aria-label={`Incident ${r.id}`}
      onCancel={onClose}
    >
      <header>
        <div>
          <h2>
            {r.id}
            <span className="ocx-badge">{r.referral}</span>
          </h2>
          <p>Incident report · submitted {r.date}</p>
        </div>
        <button
          className={button}
          aria-label="Close incident"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="ocx-body">
        <p className="ocx-warning">
          <b>INCIDENT REPORT</b>
          <br />A submitted allegation or concern. It is not a finding and does
          not imply that the reported student committed misconduct.
        </p>
        <dl className="ocx-facts">
          {[
            ["Incident Report ID", r.id],
            ["Related Booking ID", r.booking],
            ["Reporter", r.reporter],
            ["Reported Student", r.student],
            ["Incident Type", r.type],
            ["Priority", r.priority],
            ["Submitted Date", r.date],
            ["Referral Status", r.referral],
            ["Current Status", r.status],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v || "None"}</dd>
            </div>
          ))}
        </dl>
        <h3>Reported concern</h3>
        <p className="ocx-warning">
          {r.description ||
            "Original narrative is not attached to this sample."}
        </p>
        <h3>Evidence attached to the report</h3>
        <p>No attachments recorded.</p>
        <h3>Formal OSAS case</h3>
        <section>
          <b>Referral from CampusTutor Admin</b>
          <p>
            {r.referral}. OSAS decides whether a formal case is needed. A
            referral is not a finding.
          </p>
        </section>
        <p>
          {r.assessment?.action === "close"
            ? "No formal case needed."
            : "No formal case has been opened yet."}
        </p>
        {r.assessment?.notes && <p>{r.assessment.notes}</p>}
      </div>
      <footer>
        {canAssess && (
          <>
            <button
              className={button}
              onClick={() => {
                setAction("close");
                setError("");
              }}
            >
              No Formal Case Needed
            </button>
            <button
              className={primary}
              onClick={() => {
                setAction("open");
                setError("");
              }}
            >
              Open Formal Case
            </button>
          </>
        )}
        <button className={button} onClick={onClose}>
          Close
        </button>
      </footer>
      {action && (
        <Modal
          title={
            action === "open"
              ? `Open a formal case for ${r.id}?`
              : "No Formal Case Needed"
          }
          subtitle={r.id}
          onClose={() => setAction("")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {action === "open" ? (
              <p>
                A formal OSAS case starts institutional review. Opening a case
                is not a finding of responsibility and does not affect
                clearance.
              </p>
            ) : (
              <label>
                Details
                <textarea
                  className={input}
                  rows={4}
                  required
                  minLength={10}
                  maxLength={4000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record why this referral does not need a formal case."
                />
                <small>
                  {notes.trim().length}/10 characters minimum · saved locally
                </small>
              </label>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="ocx-results">
              <button
                type="button"
                className={button}
                onClick={() => setAction("")}
              >
                Cancel
              </button>
              <button
                className={primary}
                disabled={action === "close" && notes.trim().length < 10}
              >
                {action === "open" ? "Open Formal Case" : "Save Assessment"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </dialog>
  );
}
