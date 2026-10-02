import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
import { loadOsasCases } from "./OsasCases.jsx";
import { initialRecords } from "./OsasArchive.jsx";
import CaseShortcut from "./CaseShortcut.jsx";
import { clearanceOptions, decideClearance } from "./clearanceRules.js";
import "./case-shortcuts.css";
export default function ClearanceReview({ record: r, onSave, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  const [cases, setCases] = useState(loadOsasCases),
    [linked, setLinked] = useState(null),
    [choice, setChoice] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  const related = cases.filter((c) => c.student === r.name),
    archives = initialRecords.filter(
      (c) =>
        c.student === r.name && !related.some((a) => a.caseId === c.caseId),
    );
  const options = clearanceOptions(r, cases),
    complete = r.status === "Cleared",
    last = r.history?.at(-1);
  function save() {
    try {
      const updated = decideClearance(r, choice, note, loadOsasCases());
      if (onSave(updated) === false) throw Error("Could not save the review.");
      setNote("");
      setChoice("");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <dialog
      ref={ref}
      className="ocx-dialog clr-review"
      aria-label="Student clearance review"
      onCancel={onClose}
    >
      <header>
        <div>
          <h2>
            {complete ? "Clearance Review Record" : "Review Clearance"} ·{" "}
            {r.clearanceId || r.id}
            <span className="ocx-badge">{r.status}</span>
          </h2>
          <p>
            {r.name} · {r.id}
          </p>
        </div>
        <button
          className={button}
          aria-label="Close clearance review"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="ocx-body">
        <dl className="ocx-facts">
          {[
            ["Student ID", r.id],
            ["Student", r.name],
            ["College / Program", r.program],
            ["Academic Year / Semester", r.term],
            ["Clearance Review ID", r.clearanceId || "Not recorded"],
            ["Requested Date", r.requested],
            ["Current Status", r.status],
            ["Reviewed Date", r.reviewed],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v || "Not recorded"}</dd>
            </div>
          ))}
        </dl>
        <h3>Relevant cases (student as reported party)</h3>
        {[...related, ...archives].map((c) => (
          <button
            key={c.caseId}
            className="ocx-evidence-row"
            onClick={() => setLinked(c)}
          >
            <span>
              <b>{c.caseId}</b> · {c.type}
              <small>
                {c.archived ? "Archived" : c.status} ·{" "}
                {c.decision?.outcome || c.outcome || "No decision recorded"}
              </small>
            </span>
            <span className="ocx-link">View Relevant Case</span>
          </button>
        ))}
        {!related.length && !archives.length && (
          <p>No relevant case records.</p>
        )}
        <h3>Existing clearance effect</h3>
        <p className="clr-effect">
          {r.status === "On Hold"
            ? "Clearance on hold. Recorded authorization must be reviewed before release."
            : !options.Cleared
              ? "Recorded case decision requires review."
              : complete
                ? "None — cleared"
                : "None. An active case alone does not block clearance."}
        </p>
        {r.status === "On Hold" && (
          <section className="clr-effect">
            <h3>Existing Clearance Hold Details</h3>
            {[
              ["Hold ID", r.hold?.id],
              ["Basis", r.hold?.basis || last?.basis],
              ["Authorized by", r.hold?.authorizedBy],
              ["Placed on", r.hold?.placedAt || r.reviewed],
              ["Release", r.hold?.release],
              ["Next review", r.hold?.reviewAt],
            ].map(([k, v]) => (
              <p key={k}>
                <b>{k}:</b> {v || "Not recorded in the available record"}
              </p>
            ))}
          </section>
        )}
        {last && (
          <p>
            <b>Last review note:</b> {last.notes} · {last.reviewed}
          </p>
        )}
        {complete ? (
          <p className="clr-effect">
            Cleared on {r.reviewed}. This review is complete.
          </p>
        ) : (
          <>
            <h3>Clearance decision</h3>
            <div className="ocx-outcomes">
              {[
                ["Cleared", "Cleared", "Clearance may proceed."],
                [
                  "On Hold",
                  "Place Clearance On Hold",
                  "Requires a recorded case decision recommending a hold.",
                ],
                [
                  "Requires Resolution",
                  "Requires Resolution",
                  "Requires a recorded decision with a pending condition.",
                ],
                [
                  "Maintain",
                  r.status === "On Hold"
                    ? "Maintain Current Hold"
                    : "Keep Pending",
                  "Record a review note without changing status.",
                ],
              ].map(([value, label, hint]) => (
                <button
                  key={value}
                  className={choice === value ? primary : button}
                  disabled={!options[value]}
                  aria-pressed={choice === value}
                  onClick={() => setChoice(value)}
                >
                  <b>{label}</b>
                  <small className="block">{hint}</small>
                </button>
              ))}
            </div>
            <label>
              Decision note (required)
              <textarea
                className={input}
                rows={4}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="State the institutional basis for this clearance decision."
              />
            </label>
            <small>
              {note.trim().length}/15 characters minimum · local review
            </small>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      <footer>
        <button className={button} onClick={onClose}>
          {complete ? "Close" : "Cancel"}
        </button>
        {!complete && (
          <button
            className={primary}
            disabled={!choice || note.trim().length < 15}
            onClick={save}
          >
            Save Clearance Decision
          </button>
        )}
      </footer>
      {linked &&
        (linked.archived || archives.includes(linked) ? (
          <Modal
            title={`${linked.caseId} · Archived`}
            onClose={() => setLinked(null)}
          >
            <p className="ocx-warning">
              Read-only archived record. Edit, delete and decision changes are
              unavailable.
            </p>
            <dl className="ocx-facts">
              {[
                ["Student", linked.student],
                ["Incident", linked.incident || linked.id],
                ["Type", linked.type],
                ["Date Opened", linked.opened || linked.date],
                ["Resolved", linked.resolved],
                ["Archived", linked.archived],
                ["Outcome", linked.outcome || linked.decision?.outcome],
                ["Officer", linked.officer],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v || "Not recorded")}</dd>
                </div>
              ))}
            </dl>
            <p>Original archived evidence files are not attached.</p>
            <button className={primary} onClick={() => setLinked(null)}>
              Close
            </button>
          </Modal>
        ) : (
          <CaseShortcut
            record={cases.find((c) => c.caseId === linked.caseId) || linked}
            onClose={() => {
              setLinked(null);
              setCases(loadOsasCases());
            }}
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
        ))}
    </dialog>
  );
}
