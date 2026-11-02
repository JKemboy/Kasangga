import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Image, Eye, X } from "lucide-react";
import { button, primary, input, Modal } from "../tutor/workspace/ui.jsx";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import EvidenceFile from "./EvidenceFile.jsx";
import {
  validateCaseEvidence,
  recordDecisionAndHold,
  recordNoViolation,
} from "../../services/osweCaseWorkflow.js";
import "./case-shortcuts.css";
import "./case-review-flow.css";
export default function CaseReviewFlow({ record, onClose }) {
  const database = useOsweDatabase(),
    ref = useRef(null);
  const [step, setStep] = useState(1),
    [preview, setPreview] = useState(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [form, setForm] = useState({
      outcome: "",
      notes: "",
      basis: "",
      condition: "",
      due: "",
    }),
    [ack, setAck] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const reportId = record.reportDatabaseId;
  const report =
    database.records?.incidents.find((r) => r.reportDatabaseId === reportId) ||
    record;
  const evidence = (database.records?.evidence || []).filter(
    (e) => e.reportDatabaseId === reportId,
  );
  const reviewed =
    evidence.length > 0 &&
    evidence.every((e) => ["Validated", "Insufficient"].includes(e.status));
  const allInsufficient =
    evidence.length > 0 && evidence.every((e) => e.status === "Insufficient");
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function validate(item, result) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await validateCaseEvidence(item.evidenceDatabaseId, result);
      await database.refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (allInsufficient) {
        await recordNoViolation(reportId, form.notes);
        await database.refresh();
        onClose();
        window.dispatchEvent(new Event("campustutor:open-case-archive"));
        return;
      }
      if (!ack) throw new Error("Confirm the decision and clearance block.");
      const clearanceId = await recordDecisionAndHold(reportId, form);
      await database.refresh();
      onClose();
      window.dispatchEvent(
        new CustomEvent("campustutor:open-student-clearance", {
          detail: { clearanceId, studentName: report.student },
        }),
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }
  const policies = database.records?.policies || [];
  const policyLabel = (policy) =>
    [policy.title, policy.version].filter(Boolean).join(" - ");
  const outcomes = [
    "No Violation",
    "Case Dismissed",
    "Counseled",
    "Verbal Warning",
    "Written Warning",
    "Referred for Further Action",
    "Clearance Hold Recommended",
  ];
  return (
    <dialog
      ref={ref}
      className="ocx-dialog ocx-drawer case-review-flow"
      aria-label="Case review"
      onCancel={(event) => {
        if (saving) event.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <h2>{report.caseId || report.id} · Case Review</h2>
          <p>
            {report.student} · {report.type}
          </p>
        </div>
        <button
          className={button}
          disabled={saving}
          onClick={onClose}
          aria-label="Close case review"
        >
          <X size={18} />
        </button>
      </header>
      <div className="ocx-body">
        <ol className="review-flow-steps">
          <li aria-current={step === 1 ? "step" : undefined}>
            1. Case Details &amp; Evidence
          </li>
          <li aria-current={step === 2 ? "step" : undefined}>
            {allInsufficient
              ? "2. Record Decision: No Violation"
              : "2. Case Action & Decision"}
          </li>
        </ol>
        {step === 1 ? (
          <>
            <section>
              <h3>Case Details</h3>
              <dl className="ocx-facts">
                {[
                  ["Report", report.id],
                  ["Booking", report.booking],
                  ["Reporter", report.reporter],
                  ["Reported Student", report.student],
                  ["Incident Type", report.type],
                  ["Submitted", report.date],
                ].map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value || "Not recorded"}</dd>
                  </div>
                ))}
              </dl>
              <div className="review-allegation">
                <strong>Allegation as reported</strong>
                <p>{report.description || "No description recorded."}</p>
              </div>
            </section>
            <section>
              <h3>
                <ShieldCheck size={18} />
                Evidence ({evidence.length})
              </h3>
              <p className="ocx-muted">
                Review each item individually and mark it Valid or Insufficient.
                A report is an allegation, not proof of misconduct.
              </p>
              {evidence.map((item) => (
                <div className="review-evidence-item" key={item.id}>
                  <span className="review-evidence-icon">
                    <Image size={24} />
                  </span>
                  <div className="review-evidence-name">
                    <strong>
                      {item.id} · {item.evidenceType}
                    </strong>
                    <p>
                      {item.fileName || item.filename} ·{" "}
                      {item.reporter || "Submitted evidence"}
                    </p>
                    <span
                      className={
                        "review-validation " +
                        (item.status === "Validated"
                          ? "valid"
                          : item.status === "Insufficient"
                            ? "insufficient"
                            : "")
                      }
                    >
                      {item.status === "Validated" ? "Valid" : item.status}
                    </span>
                  </div>
                  <div className="review-evidence-actions">
                    <button
                      className={button}
                      disabled={saving}
                      onClick={() => setPreview(item)}
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      className={item.status === "Validated" ? primary : button}
                      disabled={saving}
                      aria-pressed={item.status === "Validated"}
                      onClick={() => validate(item, "validated")}
                    >
                      Valid
                    </button>
                    <button
                      className={
                        item.status === "Insufficient" ? primary : button
                      }
                      disabled={saving}
                      aria-pressed={item.status === "Insufficient"}
                      onClick={() => validate(item, "insufficient")}
                    >
                      Insufficient
                    </button>
                  </div>
                </div>
              ))}
              {!evidence.length && (
                <p>
                  No evidence is attached. Evidence must be provided before a
                  decision can be recorded.
                </p>
              )}
            </section>
          </>
        ) : (
          <form
            id="case-handoff-decision"
            className="review-decision-form"
            onSubmit={submit}
          >
            {allInsufficient ? (
              <section className="review-no-violation">
                <h3>Record Decision: No Violation</h3>
                <p className="ocx-muted">
                  The evidence is insufficient, so the decision is No Violation.
                  The student's clearance is not affected and the case is
                  archived.
                </p>
                <div className="review-no-violation-choice">
                  <strong>No Violation</strong>
                  <p>Insufficient evidence after OSWE review.</p>
                </div>
                <label>
                  Basis for the decision <span aria-hidden="true">*</span>
                  <textarea
                    className={input}
                    required
                    minLength={30}
                    maxLength={5000}
                    rows={5}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Explain why the evidence is insufficient."
                  />
                </label>
              </section>
            ) : (
              <>
                <h3>Case Action &amp; Decision</h3>
                <label>
                  Outcome
                  <select
                    className={input}
                    required
                    value={form.outcome}
                    onChange={(e) => set("outcome", e.target.value)}
                  >
                    <option value="">Choose an outcome</option>
                    {outcomes.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Decision basis
                  <textarea
                    className={input}
                    required
                    minLength={30}
                    maxLength={5000}
                    rows={4}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </label>
                <label>
                  Policy reference
                  <select
                    className={input}
                    required
                    aria-label="Policy reference"
                    value={form.basis}
                    onChange={(event) => {
                      const policy = policies.find(
                        (item) => policyLabel(item) === event.target.value,
                      );
                      setForm((current) => ({
                        ...current,
                        basis: event.target.value,
                        policyId: policy?.id || null,
                      }));
                    }}
                  >
                    <option value="">
                      Select a policy ({policies.length})
                    </option>
                    {policies.map((policy) => (
                      <option key={policy.id} value={policyLabel(policy)}>
                        {policyLabel(policy)}
                        {policy.status !== "Active"
                          ? " (" + policy.status + ")"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Clearance instructions / required completion
                  <textarea
                    className={input}
                    required
                    maxLength={3000}
                    rows={3}
                    value={form.condition}
                    onChange={(e) => set("condition", e.target.value)}
                    placeholder="Instructions for the student to complete, print and submit the signed form to OSWE."
                  />
                </label>
                <label>
                  Due date (optional)
                  <input
                    className={input}
                    type="date"
                    value={form.due}
                    onChange={(e) => set("due", e.target.value)}
                  />
                </label>
                <label className="review-confirm">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    required
                  />
                  I confirm the decision. This resolves the case and places the
                  student's clearance on hold until OSWE verifies the manually
                  submitted form.
                </label>
              </>
            )}
          </form>
        )}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </div>
      <footer>
        <button
          className={button}
          disabled={saving}
          onClick={() => (step === 2 ? setStep(1) : onClose())}
        >
          {step === 2 ? "Back" : "Close"}
        </button>
        {step === 1 ? (
          <button
            className={primary}
            disabled={!reviewed || saving}
            onClick={() => setStep(2)}
          >
            {allInsufficient
              ? "Record Decision (No Violation)"
              : "Proceed to Case Action"}
          </button>
        ) : (
          <button
            type="submit"
            form="case-handoff-decision"
            className={primary}
            disabled={!reviewed || (!allInsufficient && !ack) || saving}
          >
            {saving
              ? "Saving..."
              : allInsufficient
                ? "Record No Violation & Archive"
                : "Record Decision & Block Clearance"}
          </button>
        )}
      </footer>
      {preview && (
        <Modal
          title={preview.id + " · Evidence Preview"}
          onClose={() => setPreview(null)}
        >
          <EvidenceFile evidence={preview} />
        </Modal>
      )}
    </dialog>
  );
}
