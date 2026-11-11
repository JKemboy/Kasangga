import PolicyRecommendationDetails from "../shared/PolicyRecommendationDetails.jsx";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  FileText,
  Image,
  Info,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { button, primary, input, Modal } from "../shared/staffUi.jsx";
import PortalAvatar from "../shared/PortalAvatar.jsx";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import EvidenceFile from "./EvidenceFile.jsx";
import {
  validateCaseEvidence,
  recordDecisionAndHold,
  recordNoViolation,
  startCaseReview,
  caseReviewContext,
} from "../../services/osweCaseWorkflow.js";
import {
  caseActions,
  decisionHandbookBasis,
  caseActionDescriptions,
  evidenceReviewState,
  clearanceConditionError,
} from "../../services/osweDecisionRules.js";
import "./case-shortcuts.css";
import "./case-review-flow.css";

export const caseReviewDate = (value) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(
        value.length === 10 ? `${value}T12:00:00+08:00` : value,
      ).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not recorded";
const clock = (value) =>
  value
    ? new Date(`2000-01-01T${value}+08:00`).toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
export function CaseParty({ person, label }) {
  return (
    <div className="case-party">
      <small>{label}</small>
      <div className="case-party-identity">
        <PortalAvatar
          name={person?.name || "Unavailable"}
          userId={person?.userId}
        />
        <div>
          <strong>{person?.name || "Not recorded"}</strong>
          <p>
            {[person?.studentId, person?.college, person?.program]
              .filter(Boolean)
              .join(" · ") || "Student details not recorded"}
          </p>
        </div>
      </div>
      {person?.email && (
        <p className="case-contact">
          <Mail size={14} />
          <a href={`mailto:${person.email}`}>{person.email}</a>
        </p>
      )}
      {person?.phone && (
        <p className="case-contact">
          <Phone size={14} />
          <span>{person.phone}</span>
        </p>
      )}
    </div>
  );
}

function DecisionTextHint({ id, value, minimum, maximum }) {
  const count = value.trim().length;
  const remaining = Math.max(0, minimum - count);
  return (
    <span
      id={id}
      className={`case-text-hint ${remaining ? "needs-text" : "ready"}`}
    >
      <span>
        Minimum {minimum} characters.{" "}
        {remaining
          ? `${remaining} more needed to proceed.`
          : "Minimum reached."}
      </span>
      <span>
        {count.toLocaleString()} / {maximum.toLocaleString()} characters
      </span>
    </span>
  );
}

export default function CaseReviewFlow({
  record,
  onClose,
  inline = false,
  onRecorded,
}) {
  const database = useOsweDatabase();
  const basisHintId = useId(),
    confirmationBasisHintId = useId(),
    overrideHintId = useId();
  const ref = useRef(null),
    top = useRef(null),
    submitting = useRef(false);
  const [step, setStep] = useState(1),
    [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [decisionSaved, setDecisionSaved] = useState(false);
  const [context, setContext] = useState(null),
    [contextError, setContextError] = useState("");
  const [confirmation, setConfirmation] = useState(null),
    [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    outcome: "",
    notes: "",
    overrideReason: "",
  });
  const [conditionsByAction, setConditionsByAction] = useState({});
  const reportId = record.reportDatabaseId,
    refresh = database.refresh;
  const linked = database.records?.cases.find(
    (row) => String(row.reportDatabaseId) === String(reportId),
  );
  const incident = database.records?.incidents.find(
    (row) => String(row.reportDatabaseId) === String(reportId),
  );
  const report = { ...record, ...incident, ...linked };
  const evidence = (database.records?.evidence || []).filter(
    (row) => String(row.reportDatabaseId) === String(reportId),
  );
  const validation = evidenceReviewState(evidence);
  const history = context?.history;
  const decisionBasis = decisionHandbookBasis({ outcome: form.outcome });
  const defaults = form.outcome
    ? (context?.editableDefaults || context?.defaults)?.[form.outcome] || []
    : [];
  const editable =
    conditionsByAction[form.outcome] ??
    defaults.map((text, index) => ({
      id: form.outcome + "-default-" + index,
      text,
      source: "action_default",
    }));
  const conditions = form.outcome
    ? [
        ...editable.map((row) => ({ ...row, required: false })),
        { text: context?.completionInstruction, required: true },
      ].filter((row) => row.text != null)
    : [];
  const final = decisionSaved || !!linked?.decision || !!linked?.archived;

  useEffect(() => {
    if (inline) return;
    ref.current.showModal();
    return () => ref.current?.close();
  }, [inline]);
  useEffect(() => {
    let live = true;
    setReady(false);
    setSaving(true);
    setError("");
    startCaseReview(reportId)
      .then(async () => {
        const next = await refresh();
        if (!next)
          throw new Error(
            "The case was opened, but its current records could not be reloaded. Reopen the case to retry.",
          );
        if (live) {
          setReady(true);
          window.dispatchEvent(new Event("campustutor:sessions-changed"));
        }
      })
      .catch((cause) => {
        if (live) setError(cause.message);
      })
      .finally(() => {
        if (live) setSaving(false);
      });
    return () => {
      live = false;
    };
  }, [reportId, refresh]);
  useEffect(() => {
    let live = true;
    let request = 0;
    setContext(null);
    setContextError("");
    const loadContext = async () => {
      const current = ++request;
      try {
        const value = await caseReviewContext(reportId);
        if (live && current === request) {
          setContext(value);
          setContextError("");
        }
      } catch (cause) {
        if (live && current === request) setContextError(cause.message);
      }
    };
    loadContext();
    window.addEventListener("focus", loadContext);
    window.addEventListener("campustutor:oswe-mapping-updated", loadContext);
    return () => {
      live = false;
      window.removeEventListener("focus", loadContext);
      window.removeEventListener(
        "campustutor:oswe-mapping-updated",
        loadContext,
      );
    };
  }, [reportId, step]);
  useEffect(() => {
    if (step === 2 && validation.allInsufficient) {
      setStep(1);
      setConfirmation(null);
      setConfirmed(false);
    }
  }, [step, validation.allInsufficient]);
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateConditions = (rows) =>
    setConditionsByAction((current) => ({ ...current, [form.outcome]: rows }));
  function chooseAction(action) {
    setForm((current) => ({
      ...current,
      outcome: action,
      overrideReason: "",
    }));
    setError("");
  }
  async function validate(item, result) {
    if (submitting.current || saving || !ready || final) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await validateCaseEvidence(item.evidenceDatabaseId, result);
      if (!(await refresh()))
        throw new Error(
          "Validation saved; reopen the case to reload its current evidence.",
        );
    } catch (cause) {
      setError(cause.message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  function requestDecision(kind = "action") {
    setError("");
    if (!ready || !validation.complete || final) {
      setError("Review every evidence item before recording a decision.");
      return;
    }
    if (kind === "no_violation" && !validation.allInsufficient) {
      setError(
        "No Violation is available only when every evidence item is marked Insufficient.",
      );
      return;
    }
    if (kind === "action") {
      const invalid = clearanceConditionError(conditions);
      if (
        !context ||
        !caseActions.includes(form.outcome) ||
        invalid ||
        form.notes.trim().length < 30 ||
        !decisionBasis.trim()
      ) {
        setError(
          invalid ||
            "Choose an action and explain the validated evidence and policy basis in at least 30 characters.",
        );
        return;
      }
      if (
        history?.suggestedAction &&
        history.suggestedAction !== form.outcome &&
        form.overrideReason.trim().length < 15
      ) {
        setError(
          "Explain why your action differs from the verified suggestion (at least 15 characters).",
        );
        return;
      }
    }
    setConfirmed(false);
    setConfirmation(kind);
  }
  async function submit(event) {
    event.preventDefault();
    if (
      submitting.current ||
      saving ||
      !confirmed ||
      !validation.complete ||
      form.notes.trim().length < 30
    )
      return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const result =
        confirmation === "no_violation"
          ? await recordNoViolation(reportId, form.notes.trim())
          : await recordDecisionAndHold(reportId, {
              ...form,
              basis: decisionBasis,
              recommendationFingerprint: context?.recommendation?.fingerprint,
              notes: form.notes.trim(),
              conditions,
              violationConfirmed: true,
            });
      setDecisionSaved(true);
      if (!(await refresh()))
        throw new Error(
          "Decision saved. Reload the page to view the committed record; do not submit another decision.",
        );
      window.dispatchEvent(new Event("campustutor:sessions-changed"));
      if (onRecorded)
        onRecorded({
          reportId,
          clearanceId: confirmation === "action" ? result : null,
        });
      else {
        onClose();
      }
      if (confirmation === "action") {
        window.dispatchEvent(
          new CustomEvent("campustutor:open-student-clearance", {
            detail: {
              clearanceId: result,
              studentName: report.student,
              studentId: report.studentId,
            },
          }),
        );
      } else if (!onRecorded) {
        window.dispatchEvent(new Event("campustutor:open-case-archive"));
      }
    } catch (cause) {
      setConfirmation(null);
      setError(cause.message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  const session = report.session;
  const sessionText = session
    ? [
        session.title,
        session.type,
        session.platform || session.location,
        caseReviewDate(session.date),
        session.start && `${clock(session.start)}–${clock(session.end)}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "No related session recorded";
  const status = final
    ? "Decision Recorded"
    : ready
      ? "Under Review"
      : "Opening case…";
  const Root = inline ? "section" : "dialog";
  return (
    <Root
      ref={ref}
      className={`case-review-flow ${inline ? "case-review-inline" : "ocx-dialog case-review-dialog"}`}
      aria-label="Case review"
      onCancel={
        inline
          ? undefined
          : (event) => {
              if (saving) event.preventDefault();
              else onClose();
            }
      }
    >
      <div ref={top} className="case-review-top">
        <button
          type="button"
          className="case-back-link"
          onClick={onClose}
          disabled={saving}
        >
          <ArrowLeft size={16} />
          Back to Case Review
        </button>
        <header className="case-review-banner">
          <span className="case-document-icon">
            <FileText size={25} />
          </span>
          <div>
            <h2>
              {report.caseId || report.id} · {report.type}
            </h2>
            <p>
              Referred by LCO Admin ·{" "}
              {caseReviewDate(report.referredAt || report.receivedAt)} ·
              Assigned to {report.officer || "Unassigned"}
            </p>
          </div>
          <div className="case-status-group">
            <span className="case-badge warning">{status}</span>
            <span
              className={`case-badge ${report.priority === "High" ? "danger" : "neutral"}`}
            >
              {report.priority || "Not recorded"}
            </span>
          </div>
        </header>
        <ol className="review-flow-steps" aria-label="Case review steps">
          <li aria-current={step === 1 ? "step" : undefined}>
            <span>{step === 2 ? <Check size={16} /> : "1"}</span>Case Details
            &amp; Evidence
          </li>
          <li aria-current={step === 2 ? "step" : undefined}>
            <span>2</span>Case Decision
          </li>
        </ol>
      </div>
      <div className="case-review-content">
        {error && (
          <p role="alert" className="case-alert error">
            {error}
          </p>
        )}
        {final && (
          <p role="status" className="case-alert info">
            A decision is already recorded. Open it from Case Archive to view
            the saved record.
          </p>
        )}
        {step === 1 ? (
          <>
            <section className="case-panel">
              <h3>
                <FileText size={17} />
                Case Details
              </h3>
              <dl className="case-detail-grid">
                {[
                  ["Case ID", report.caseId || "Opening case…"],
                  ["Incident Report ID", report.id],
                  ["Booking ID", report.booking || "Not recorded"],
                  ["Incident Type", report.type],
                  ["Priority", report.priority],
                  ["Date Opened", caseReviewDate(report.openedAt)],
                  ["Assigned OSWE", report.officer || "Unassigned"],
                  ["Status", status],
                  ["Session", sessionText],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "Not recorded"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="case-panel">
              <h3>
                <Users size={17} />
                Parties
              </h3>
              <div className="case-parties-grid">
                <CaseParty label="Reporter" person={report.reporterDetails} />
                <CaseParty
                  label="Reported Student"
                  person={report.studentDetails}
                />
              </div>
              <p className="case-muted">
                The reported student is a respondent. No finding has been made.
              </p>
            </section>
            <section className="case-panel">
              <h3>
                <Info size={17} />
                Incident Description
              </h3>
              <p className="case-description">
                {report.description || "No description recorded."}
              </p>
            </section>
            <section className="case-panel">
              <h3>
                <ShieldCheck size={17} />
                Evidence ({evidence.length})
              </h3>
              <p className="case-muted">
                Review each item and mark it Valid or Insufficient. Available
                session proof is linked automatically when LCO refers a report.
              </p>
              {evidence.map((item) => (
                <div className="review-evidence-item" key={item.id}>
                  <span className="review-evidence-icon">
                    <Image size={23} />
                  </span>
                  <div className="review-evidence-name">
                    <strong>
                      {item.id} ·{" "}
                      {item.sourceBookingId
                        ? "Session Proof"
                        : item.evidenceType?.startsWith("image/")
                          ? "Screenshot / Image"
                          : item.evidenceType?.startsWith("video/")
                            ? "Video"
                            : "Document"}
                    </strong>
                    {item.sourceBookingId && (
                      <span className="case-source-badge">
                        System · uploaded by tutor
                      </span>
                    )}
                    <p>
                      {item.fileName} · {item.reporter} ·{" "}
                      {caseReviewDate(item.time)}
                    </p>
                  </div>
                  <div className="review-evidence-actions">
                    <button
                      type="button"
                      className={button}
                      disabled={saving}
                      onClick={() => setPreview(item)}
                    >
                      <Eye size={15} />
                      Preview
                    </button>
                    <div className="case-validation-toggle">
                      <button
                        type="button"
                        className={
                          item.status === "Validated" ? "selected-valid" : ""
                        }
                        aria-pressed={item.status === "Validated"}
                        disabled={saving || !ready || final}
                        onClick={() => validate(item, "validated")}
                      >
                        Valid
                      </button>
                      <button
                        type="button"
                        className={
                          item.status === "Insufficient"
                            ? "selected-insufficient"
                            : ""
                        }
                        aria-pressed={item.status === "Insufficient"}
                        disabled={saving || !ready || final}
                        onClick={() => validate(item, "insufficient")}
                      >
                        Insufficient
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!evidence.length && (
                <p className="case-muted">
                  No evidence is attached. A decision cannot be recorded until
                  evidence is available and reviewed.
                </p>
              )}
              {validation.complete && (
                <div
                  className={`case-alert ${validation.allInsufficient ? "warning" : "info"}`}
                >
                  <Info size={20} />
                  <div>
                    <strong>
                      {validation.allInsufficient
                        ? "Evidence is insufficient."
                        : "Evidence is valid."}
                    </strong>
                    <p>
                      {validation.allInsufficient
                        ? "The decision is recorded as No Violation and the case is archived. This records an unsubstantiated allegation, not proof that the incident did not occur."
                        : "Proceed to choose the case action and record the decision. Valid evidence does not automatically establish a violation."}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <form
            id="case-action-form"
            className="review-decision-form"
            onSubmit={(event) => {
              event.preventDefault();
              requestDecision();
            }}
          >
            <section className="case-panel">
              <h3>
                <Check size={18} />
                Case Action &amp; Decision
              </h3>
              <p className="case-muted">
                The evidence has been reviewed. Choose the case action. A
                confirmed disciplinary decision blocks clearance until its
                recorded conditions are verified.
              </p>
              <PolicyRecommendationDetails
                compact
                subject={report}
                recommendation={context?.recommendation}
                history={history}
              />
              {contextError && (
                <p role="alert" className="case-alert error">
                  Unable to load the policy recommendation: {contextError}
                </p>
              )}
              <div
                className="case-action-grid"
                role="radiogroup"
                aria-label="Case action"
              >
                {caseActions.map((action) => (
                  <label
                    key={action}
                    className={`case-action-choice ${form.outcome === action ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="case-action"
                      value={action}
                      checked={form.outcome === action}
                      disabled={saving || !context || final}
                      onChange={() => chooseAction(action)}
                    />
                    <span>
                      <strong>{action}</strong>
                      {history?.suggestedAction === action && (
                        <span className="case-source-badge">Suggested</span>
                      )}
                      <small>{caseActionDescriptions[action]}</small>
                    </span>
                  </label>
                ))}
              </div>
              {form.outcome && (
                <div className="case-conditions">
                  <h4>Conditions for clearance</h4>
                  {conditions.map((condition, index) => (
                    <div
                      className="case-condition-row"
                      key={condition.required ? condition.text : condition.id}
                    >
                      <input
                        aria-label={`Condition ${index + 1}`}
                        className={input}
                        value={
                          condition.required
                            ? "Submit the completed OSWE Completion Form"
                            : condition.text
                        }
                        readOnly={condition.required}
                        disabled={saving || final}
                        maxLength={1000}
                        onChange={(event) =>
                          updateConditions(
                            editable.map((row) =>
                              row.id === condition.id
                                ? { ...row, text: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      {condition.required ? (
                        <span className="case-source-badge">Required</span>
                      ) : (
                        <button
                          type="button"
                          className={button}
                          disabled={saving || final}
                          aria-label={`Remove condition ${index + 1}`}
                          onClick={() =>
                            updateConditions(
                              editable.filter((row) => row.id !== condition.id),
                            )
                          }
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="case-back-link"
                    disabled={saving || final || editable.length >= 29}
                    onClick={() =>
                      updateConditions([
                        ...editable,
                        { id: crypto.randomUUID(), text: "" },
                      ])
                    }
                  >
                    <Plus size={14} />
                    Add condition
                  </button>
                  <p className="case-muted">
                    The student downloads the OSWE Completion Form from My
                    Reports › About Me and submits the signed form in person at
                    the OSWE office.
                  </p>
                  {form.outcome === "Referred for Further Action" && (
                    <p className="case-muted">
                      The case awaits the authority's actual decision. Record
                      the response before verifying referral conditions; the
                      clearance hold stays active.
                    </p>
                  )}
                </div>
              )}
              {history?.suggestedAction &&
                form.outcome &&
                history.suggestedAction !== form.outcome && (
                  <label className="case-form-field">
                    Reason for departing from the suggestion *
                    <textarea
                      className={input}
                      aria-label="Reason for departing from the suggestion *"
                      aria-describedby={overrideHintId}
                      minLength={15}
                      maxLength={2000}
                      required
                      value={form.overrideReason}
                      onChange={(event) =>
                        set("overrideReason", event.target.value)
                      }
                    />
                    <DecisionTextHint
                      id={overrideHintId}
                      value={form.overrideReason}
                      minimum={15}
                      maximum={2000}
                    />
                  </label>
                )}
              <label className="case-form-field">
                Basis for the decision *
                <textarea
                  className={input}
                  aria-label="Basis for the decision *"
                  aria-describedby={basisHintId}
                  rows={3}
                  minLength={30}
                  maxLength={5000}
                  required
                  placeholder="Summarize the validated evidence and the policy applied."
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
                <DecisionTextHint
                  id={basisHintId}
                  value={form.notes}
                  minimum={30}
                  maximum={5000}
                />
              </label>
            </section>
          </form>
        )}
      </div>
      <footer className="case-review-footer">
        <button
          type="button"
          className={button}
          disabled={saving}
          onClick={() => (step === 2 ? setStep(1) : onClose())}
        >
          <ArrowLeft size={15} />
          {step === 2 ? "Back" : "Back to Case Review"}
        </button>
        <div>
          {step === 1 && !validation.complete && (
            <span className="case-muted">
              Mark every evidence item to continue.
            </span>
          )}
          {step === 1 ? (
            <button
              type="button"
              className={primary}
              disabled={!ready || !validation.complete || saving || final}
              onClick={() =>
                validation.allInsufficient
                  ? requestDecision("no_violation")
                  : setStep(2)
              }
            >
              {validation.allInsufficient
                ? "Record Decision (No Violation)"
                : "Proceed to Case Action"}
            </button>
          ) : (
            <button
              type="submit"
              form="case-action-form"
              className={primary}
              disabled={
                !ready ||
                !validation.complete ||
                saving ||
                final ||
                form.notes.trim().length < 30 ||
                !context ||
                !form.outcome ||
                !!clearanceConditionError(conditions)
              }
            >
              <Check size={15} />
              Record Decision &amp; Block Clearance
            </button>
          )}
        </div>
      </footer>
      {preview && (
        <Modal
          title={`${preview.id} · Evidence Preview`}
          onClose={() => setPreview(null)}
        >
          <EvidenceFile evidence={preview} />
        </Modal>
      )}
      {confirmation && (
        <Modal
          title={
            confirmation === "no_violation"
              ? "Confirm No Violation decision"
              : "Confirm decision and clearance hold"
          }
          onClose={() => {
            if (!saving) setConfirmation(null);
          }}
        >
          <form className="case-confirmation" onSubmit={submit}>
            <p>
              {confirmation === "no_violation"
                ? "This records insufficient evidence / an unsubstantiated allegation as No Violation, archives the case, and does not impose a clearance hold."
                : `${form.outcome}: record this decision and its ${conditions.length} clearance condition(s). A referral is not a final decision by the authority.`}
            </p>
            {confirmation === "no_violation" && (
              <label className="case-form-field">
                Basis for the decision *
                <textarea
                  className={input}
                  aria-label="Basis for the decision *"
                  aria-describedby={confirmationBasisHintId}
                  rows={3}
                  required
                  minLength={30}
                  maxLength={5000}
                  placeholder="Explain why the evidence is insufficient; do not state that the incident necessarily did not occur."
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
                <DecisionTextHint
                  id={confirmationBasisHintId}
                  value={form.notes}
                  minimum={30}
                  maximum={5000}
                />
              </label>
            )}
            <label className="case-confirm-check">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {confirmation === "no_violation"
                ? "I reviewed all evidence and confirm the insufficient-evidence determination."
                : "I confirm the violation after OSWE review, the selected action, and the recorded clearance conditions."}
            </label>
            <div className="case-confirm-actions">
              <button
                type="button"
                className={button}
                disabled={saving}
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={primary}
                disabled={saving || !confirmed || form.notes.trim().length < 30}
              >
                {saving
                  ? "Saving…"
                  : confirmation === "no_violation"
                    ? "Record Decision (No Violation)"
                    : "Record Decision & Block Clearance"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Root>
  );
}
