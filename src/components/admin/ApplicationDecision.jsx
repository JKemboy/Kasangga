import { useState } from "react";
import { Check, Info } from "lucide-react";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";

export function applicationDecision(
  record,
  decision,
  reason,
  fields,
  reviewed,
  verificationState = {},
) {
  if (["Approved", "Rejected"].includes(record.status))
    throw new Error("This application already has a final decision.");
  if (!["Approved", "Rejected", "Resubmission Required"].includes(decision))
    throw new Error("Invalid review action.");
  if (decision === "Approved" && !reviewed)
    throw new Error("Confirm that you reviewed the documents.");
  if (
    decision === "Approved" &&
    (verificationState.documentStatus !== "Complete" ||
      !verificationState.matchConfirmed)
  )
    throw new Error(
      "Complete all document checks and confirm the information match before approval.",
    );
  if (decision !== "Approved" && reason.trim().length < 15)
    throw new Error("Enter at least 15 characters.");
  if (decision === "Resubmission Required" && !fields.length)
    throw new Error("Select what needs to change.");
  return {
    ...record,
    status: decision,
    history: [
      ...(record.history || []),
      {
        from: record.status,
        to: decision,
        reason:
          decision === "Approved"
            ? "Document review acknowledged by Admin."
            : reason.trim(),
        requestedChanges:
          decision === "Resubmission Required" ? [...fields] : [],
        reviewed: decision === "Approved",
        at: new Date().toISOString(),
        by: "Admin User",
      },
    ],
  };
}
export default function ApplicationDecision({
  record,
  decision,
  onSave,
  onClose,
  verificationState,
}) {
  const [reason, setReason] = useState(""),
    [fields, setFields] = useState([]),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const approving = decision === "Approved",
    resubmit = decision === "Resubmission Required";
  const label = approving
    ? "Approve Tutor"
    : resubmit
      ? "Request Resubmission"
      : "Reject Application";
  const approvalChecksComplete =
    verificationState?.documentStatus === "Complete" &&
    verificationState?.matchConfirmed;
  const valid = approving
    ? reviewed && approvalChecksComplete
    : reason.trim().length >= 15 && (!resubmit || fields.length > 0);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const next = applicationDecision(
        record,
        decision,
        reason,
        fields,
        reviewed,
        verificationState,
      );
      await onSave(next);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={approving ? `Approve ${record.name}?` : label}
      subtitle={approving ? undefined : `${record.id} · ${record.name}`}
      onClose={onClose}
    >
      <form
        className={`aar-action ${approving ? "aar-approval" : ""}`}
        onSubmit={submit}
      >
        {approving ? (
          <>
            <div className="aar-approval-icon">
              <Check size={30} />
            </div>
            <p>
              Approve Tutor capability for {record.name}'s existing student
              account. Learner remains alongside Tutor.
            </p>
            {!approvalChecksComplete && (
              <p role="status">
                Run all document checks and confirm the information match from
                the Tutor Verification table before approval.
              </p>
            )}
            <label className="aar-checkbox">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I reviewed the documents.
            </label>
          </>
        ) : (
          <>
            {resubmit ? (
              <>
                <strong>What needs to change</strong>
                <div className="aar-choices">
                  {[
                    "Grade report",
                    "Certificate of Registration",
                    "Clearer scan",
                    "Complete pages",
                  ].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={fields.includes(f) ? primary : button}
                      aria-pressed={fields.includes(f)}
                      onClick={() =>
                        setFields(
                          fields.includes(f)
                            ? fields.filter((v) => v !== f)
                            : [...fields, f],
                        )
                      }
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="aar-reject-info">
                <Info size={20} />
                {record.name}'s Learner account remains unchanged. They can
                apply again later.
              </p>
            )}
            <label htmlFor="application-decision-reason">
              {resubmit
                ? "Instructions for the applicant (required)"
                : "Rejection reason (required)"}
            </label>
            <textarea
              id="application-decision-reason"
              className={input}
              rows={4}
              maxLength={2000}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                resubmit
                  ? "Say exactly what to upload again and why."
                  : "Explain which requirement was not met."
              }
            />
            <small>{reason.trim().length}/15 characters minimum</small>
          </>
        )}
        <small>This decision is saved to the tutor application record.</small>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <div className="aar-action-footer">
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={
              primary + (!approving && !resubmit ? " aar-reject-button" : "")
            }
            disabled={!valid || busy}
          >
            {busy ? "Saving…" : label}
          </button>
        </div>
      </form>
    </Modal>
  );
}
