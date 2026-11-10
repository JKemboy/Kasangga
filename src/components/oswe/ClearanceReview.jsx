import { useEffect, useRef, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { button, primary, input } from "../shared/staffUi.jsx";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import { reviewStudentClearance } from "../../services/osweCaseWorkflow.js";
import { COMPLETION_INSTRUCTION } from "../../services/osweDecisionRules.js";
import "./case-shortcuts.css";
export default function ClearanceReview({ record, onClose }) {
  const database = useOsweDatabase(),
    ref = useRef(null);
  const [choice, setChoice] = useState(""),
    [notes, setNotes] = useState(""),
    [verified, setVerified] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const r =
    (database.records?.clearance || []).find(
      (row) => row.clearanceDatabaseId === record.clearanceDatabaseId,
    ) || record;
  const cases = (database.records?.cases || []).filter(
    (c) => c.studentUserId === r.userId,
  );
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  async function save(event) {
    event.preventDefault();
    if (saving || choice !== "cleared" || !verified || notes.trim().length < 15)
      return;
    setSaving(true);
    setError("");
    try {
      if (!r.clearanceDatabaseId)
        throw new Error(
          "A saved clearance review is required. Record the case decision first.",
        );
      await reviewStudentClearance(
        r.clearanceDatabaseId,
        "cleared",
        notes.trim(),
        verified,
      );
      await database.refresh();
      onClose();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="ocx-dialog clr-review"
      aria-label="Student clearance review"
      onCancel={(e) => {
        if (saving) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <h2>Student Clearance Review · {r.clearanceId || r.id}</h2>
          <p>
            {r.name} · {r.status}
          </p>
        </div>
        <button
          className={button}
          disabled={saving}
          onClick={onClose}
          aria-label="Close clearance review"
        >
          <X size={18} />
        </button>
      </header>
      <div className="ocx-body">
        <dl className="ocx-facts">
          {[
            ["Student", r.name],
            ["Student ID", r.id],
            ["College / Program", r.program],
            ["Academic Year / Semester", r.term],
            ["Status", r.status],
            ["Last Reviewed", r.reviewed || "Not yet reviewed"],
          ].map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="clr-effect">
          <ShieldCheck size={18} />
          {COMPLETION_INSTRUCTION} OSWE confirms receipt and completion before
          clearing.
        </div>
        <h3>Recorded Cases &amp; Clearance Instructions</h3>
        {cases.map((c) => (
          <section key={c.caseId} className="rounded-lg border p-3 mb-3">
            <strong>
              {c.caseId} · {c.decision?.outcome || c.status}
            </strong>
            <p>
              {c.decision?.condition ||
                c.resolutionNotes ||
                "No instructions recorded."}
            </p>
            <small>
              {c.decision?.conditionDone
                ? "Completion verified"
                : "Awaiting OSWE verification"}
            </small>
          </section>
        ))}
        <form id="clearance-review-form" onSubmit={save} className="space-y-4">
          <h3>Clearance Decision</h3>
          <div className="ocx-outcomes">
            <button
              type="button"
              disabled={saving}
              aria-pressed={choice === "cleared"}
              className={choice === "cleared" ? primary : button}
              onClick={() => setChoice("cleared")}
            >
              Cleared
            </button>
          </div>
          <label className="block">
            Review notes
            <textarea
              required
              minLength={15}
              maxLength={2000}
              className={input + " w-full mt-1"}
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record the submitted form and completed requirements."
            />
          </label>
          {choice === "cleared" && (
            <label className="flex gap-2 items-start">
              <input
                required
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              I received the signed form in person, verified all outstanding
              case requirements, and authorize release of this student's
              clearance holds.
            </label>
          )}
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
        </form>
      </div>
      <footer>
        <button className={button} disabled={saving} onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          form="clearance-review-form"
          className={primary}
          disabled={
            saving ||
            !choice ||
            notes.trim().length < 15 ||
            (choice === "cleared" && !verified)
          }
        >
          {saving ? "Saving..." : "Save Clearance Decision"}
        </button>
      </footer>
    </dialog>
  );
}
