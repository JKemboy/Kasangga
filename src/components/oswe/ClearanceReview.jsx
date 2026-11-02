// Student Clearance Review dialog: derives enabled decisions from relevant database cases and saves an authorized decision through its parent.
import { statusClass } from "../shared/statusColors.js";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { button, primary, input } from "../tutor/workspace/ui.jsx";
import CaseShortcut from "./CaseShortcut.jsx";
import ArchivedCaseDetails from "./ArchivedCaseDetails.jsx";
import { clearanceOptions, decideClearance } from "./clearanceRules.js";
import "./case-shortcuts.css";
export default function ClearanceReview({ record: r, onSave, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  const database = useOsweDatabase();
  const cases = database.records?.cases || [];
  const initialRecords = database.records?.archive || [];
  const [linked, setLinked] = useState(null),
    [choice, setChoice] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  const related = cases.filter((c) => c.studentUserId === r.userId),
    archives = initialRecords.filter(
      (c) =>
        c.studentUserId === r.userId &&
        !related.some((a) => a.caseId === c.caseId),
    );
  const options = clearanceOptions(r, cases),
    followUpOnly = !r.clearanceDatabaseId,
    complete = r.status === "Cleared",
    last = r.history?.at(-1);
  const formatArchiveDate = (value) =>
    value
      ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" },
        )
      : "Not recorded";
  async function save() {
    try {
      const updated = decideClearance(r, choice, note, cases);
      if ((await onSave(updated)) === false)
        throw Error("Could not save the review.");
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
            <span className={statusClass(r.status, "ocx-badge")}>{r.status}</span>
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
        {(r.holds || [])
          .filter((h) => h.hold_status === "active")
          .map((h) => (
            <div key={h.hold_id}>
              <p>Active hold: {h.reason}</p>
              <button
                className={button}
                disabled={note.trim().length < 15}
                onClick={async () => {
                  try {
                    await database.save("hold", h.hold_id, "release", {
                      notes: note.trim(),
                    });
                    setNote("");
                  } catch (cause) {
                    setError(cause.message);
                  }
                }}
              >
                Release Hold with Recorded Basis
              </button>
              <small>
                Enter at least 15 characters in review notes. Case conditions
                must be completed.
              </small>
            </div>
          ))}
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
            {followUpOnly && (
              <p className="clr-effect">
                This case follow-up has no clearance request yet. Saving a
                decision will create its clearance review record.
              </p>
            )}
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
                  "Record the pending case condition so it can be completed.",
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
              Decision note (optional)
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
              Optional · database review
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
            disabled={!choice}
            onClick={save}
          >
            Save Clearance Decision
          </button>
        )}
      </footer>
      {linked &&
        (linked.archived || archives.includes(linked) ? (
          <ArchivedCaseDetails
            record={linked}
            date={formatArchiveDate}
            onClose={() => setLinked(null)}
          />
        ) : (
          <CaseShortcut
            record={cases.find((c) => c.caseId === linked.caseId) || linked}
            onClose={() => {
              setLinked(null);
            }}
            onSave={database.saveCase}
          />
        ))}
    </dialog>
  );
}
