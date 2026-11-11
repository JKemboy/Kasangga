import { useEffect, useRef, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { button, primary, input } from "../shared/staffUi.jsx";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import {
  reviewStudentClearance,
  verifyCaseCondition,
  recordReferralResponse,
  addReferralCondition,
} from "../../services/osweCaseWorkflow.js";
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
  const [verificationNotes, setVerificationNotes] = useState("");
  const [responseNotes, setResponseNotes] = useState({});
  const [authorityCondition, setAuthorityCondition] = useState({});
  const busy = useRef(false);
  const r =
    (database.records?.clearance || []).find(
      (row) => row.clearanceDatabaseId === record.clearanceDatabaseId,
    ) || record;
  const isCleared = String(r.status).toLowerCase() === "cleared";
  const cases = (database.records?.cases || []).filter(
    (c) => c.studentUserId === r.userId,
  );
  const outstanding = cases.filter(
    (c) =>
      c.decision?.workflow === "clearance_handoff" &&
      !c.decision?.conditionDone,
  );
  const requirementsReady = outstanding.every(
    (c) =>
      !c.decision.referralPending &&
      (![1, 2].includes(c.decision.conditionTrackingVersion) ||
        (c.decision.conditions?.length > 0 &&
          c.decision.conditions.every((condition) => condition.completed) &&
          c.decision.completionForm?.verifiedAt)),
  );
  async function verify(action) {
    if (busy.current || isCleared) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await action();
      if (!(await database.refresh()))
        throw new Error(
          "Saved, but the latest records could not be loaded. Reopen the review before continuing.",
        );
    } catch (cause) {
      setError(cause.message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  async function save(event) {
    event.preventDefault();
    if (
      busy.current ||
      isCleared ||
      saving ||
      !requirementsReady ||
      choice !== "cleared" ||
      !verified ||
      notes.trim().length < 15
    )
      return;
    busy.current = true;
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
      busy.current = false;
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
        {!isCleared &&
          outstanding.some((c) =>
            [1, 2].includes(c.decision.conditionTrackingVersion),
          ) && (
            <label className="block mb-4">
              Condition verification notes (at least 15 characters)
              <textarea
                className={input + " w-full mt-1"}
                rows={2}
                maxLength={2000}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Record what was received or verified in person before checking a condition."
              />
            </label>
          )}
        {cases.map((c) => (
          <section key={c.caseId} className="rounded-lg border p-3 mb-3">
            <strong>
              {c.caseId}
              {c.id ? ` / ${c.id}` : ""} · {c.decision?.outcome || c.status}
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
            {[1, 2].includes(c.decision?.conditionTrackingVersion) && (
              <div className="space-y-3 mt-3">
                {(c.decision.conditions || []).map((condition, index) => (
                  <label className="flex gap-2 items-start" key={index}>
                    <input
                      type="checkbox"
                      checked={!!condition.completed}
                      disabled={
                        saving ||
                        isCleared ||
                        c.decision.conditionDone ||
                        verificationNotes.trim().length < 15 ||
                        (c.decision.referralPending &&
                          condition.text !== COMPLETION_INSTRUCTION)
                      }
                      onChange={(e) => {
                        const completed = e.target.checked;
                        verify(() =>
                          verifyCaseCondition(
                            c.caseDatabaseId,
                            index,
                            completed,
                            verificationNotes.trim(),
                          ),
                        );
                      }}
                    />
                    <span>
                      {condition.text}
                      {condition.text === COMPLETION_INSTRUCTION && (
                        <small className="block">
                          Check only after receiving and verifying the signed
                          form in person.
                        </small>
                      )}
                      {condition.completedAt && (
                        <small className="block">
                          Verified{" "}
                          {new Date(condition.completedAt).toLocaleString(
                            "en-PH",
                          )}
                        </small>
                      )}
                    </span>
                  </label>
                ))}
                {c.decision.outcome === "Referred for Further Action" &&
                  !c.decision.referralPending &&
                  !c.decision.conditionDone &&
                  !isCleared && (
                    <div className="rounded border p-3">
                      <p>{c.decision.authorityResponse}</p>
                      <label className="block mt-2">
                        Additional requirement from the received authority
                        decision
                        <input
                          className={input + " w-full mt-1"}
                          maxLength={1000}
                          value={authorityCondition[c.caseId] || ""}
                          onChange={(e) =>
                            setAuthorityCondition((v) => ({
                              ...v,
                              [c.caseId]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        className={button}
                        disabled={
                          saving ||
                          !authorityCondition[c.caseId]?.trim() ||
                          verificationNotes.trim().length < 15
                        }
                        onClick={() =>
                          verify(async () => {
                            await addReferralCondition(
                              c.caseDatabaseId,
                              authorityCondition[c.caseId].trim(),
                              verificationNotes.trim(),
                            );
                            setAuthorityCondition((v) => ({
                              ...v,
                              [c.caseId]: "",
                            }));
                          })
                        }
                      >
                        Add authority requirement
                      </button>
                    </div>
                  )}
                {c.decision.referralPending && !isCleared && (
                  <div className="rounded border p-3">
                    <strong>
                      Awaiting authority decision — clearance hold remains
                      active.
                    </strong>
                    <label className="block mt-2">
                      Actual authority response
                      <textarea
                        className={input + " w-full mt-1"}
                        rows={3}
                        minLength={30}
                        maxLength={5000}
                        value={responseNotes[c.caseId] || ""}
                        onChange={(e) =>
                          setResponseNotes((v) => ({
                            ...v,
                            [c.caseId]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      className={button}
                      disabled={
                        saving ||
                        (responseNotes[c.caseId] || "").trim().length < 30
                      }
                      onClick={() =>
                        verify(() =>
                          recordReferralResponse(
                            c.caseDatabaseId,
                            responseNotes[c.caseId].trim(),
                          ),
                        )
                      }
                    >
                      Record received authority response
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        ))}
        {isCleared ? (
          <section className="rounded-lg border p-3">
            <p role="status">
              This clearance is already cleared. This review is read-only.
            </p>
            {r.history?.at(-1)?.notes && (
              <p className="mt-2">Review notes: {r.history.at(-1).notes}</p>
            )}
          </section>
        ) : (
          <form
            id="clearance-review-form"
            onSubmit={save}
            className="space-y-4"
          >
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
            {!requirementsReady && (
              <p className="text-amber-700">
                Verify every outstanding condition and the signed form, and
                record any pending authority response before releasing
                clearance.
              </p>
            )}
          </form>
        )}
      </div>
      <footer>
        <button className={button} disabled={saving} onClick={onClose}>
          {isCleared ? "Close" : "Cancel"}
        </button>
        {!isCleared && (
          <button
            type="submit"
            form="clearance-review-form"
            className={primary}
            disabled={
              saving ||
              !requirementsReady ||
              !choice ||
              notes.trim().length < 15 ||
              (choice === "cleared" && !verified)
            }
          >
            {saving ? "Saving..." : "Save Clearance Decision"}
          </button>
        )}
      </footer>
    </dialog>
  );
}
