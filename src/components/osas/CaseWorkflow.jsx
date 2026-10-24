import { casePermissions } from "./caseProgress.js";
import { useState } from "react";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
const outcomes = [
  "No Violation",
  "Case Dismissed",
  "Counseled",
  "Verbal Warning",
  "Written Warning",
  "Referred for Further Action",
  "Clearance Hold Recommended",
];
export function caseTransition(record, action, form = {}) {
  if (record.archived) throw Error("Archived cases are read-only.");
  const at = new Date().toISOString(),
    entry = {
      at,
      officer: record.officer,
      action,
      notes: form.notes?.trim() || "",
      status: record.status,
    };
  let next = { ...record };
  if (action === "review") {
    if (record.status === "Resolved") throw Error("This case is resolved.");
    next.status = "Under Review";
    entry.notes = "Evidence validated. Started case review.";
  } else if (action === "pending") {
    if (record.status === "Resolved")
      throw Error("Resolved cases cannot return to review.");
    next.status = "Pending Decision";
    entry.notes = "Moved to Pending Decision.";
  } else if (action === "request") {
    if (record.status === "Resolved") throw Error("This case is resolved.");
    if (
      ![record.reporterId, record.studentUserId].includes(form.recipient) ||
      form.notes?.trim().length < 10 ||
      !form.notes ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.due || "")
    )
      throw Error("Complete the recipient, details and due date.");
    next.status = "Awaiting Evidence";
    next.evidenceRequest = {
      recipient:
        form.recipient === record.reporterId ? record.reporter : record.student,
      recipientId: form.recipient,
      due: form.due,
      notes: form.notes.trim(),
    };
  } else if (action === "decision") {
    if (record.status !== "Pending Decision" || record.decision)
      throw Error("Move this case to Pending Decision first.");
    if (
      !outcomes.includes(form.outcome) ||
      !form.notes ||
      form.notes.trim().length < 30 ||
      !form.basis?.trim() ||
      !form.ack
    )
      throw Error(
        "Complete the outcome, decision basis, policy reference and acknowledgement.",
      );
    if (form.hasCondition && (!form.condition?.trim() || !form.due))
      throw Error("Enter a condition and due date.");
    next.status = form.hasCondition ? "Pending Completion" : "Resolved";
    next.decision = {
      outcome: form.outcome,
      notes: form.notes.trim(),
      basis: form.basis.trim(),
      condition: form.hasCondition ? form.condition.trim() : "",
      due: form.hasCondition ? form.due : "",
      conditionDone: !form.hasCondition,
      at,
      notify: !!form.notify,
    };
  } else if (action === "condition") {
    if (
      !["Pending Completion", "Resolved"].includes(record.status) ||
      !record.decision?.condition ||
      record.decision.conditionDone
    )
      throw Error("No pending condition.");
    next.decision = {
      ...record.decision,
      conditionDone: true,
      completedAt: at,
    };
    next.status = "Resolved";
    entry.notes = "Condition marked completed.";
  } else throw Error("Invalid case action.");
  entry.status = next.status;
  return { ...next, history: [...(record.history || []), entry] };
}
export default function CaseWorkflow({
  record: r,
  evidence,
  clearance = [],
  onSave,
}) {
  const [menu, setMenu] = useState(false),
    [action, setAction] = useState(""),
    [form, setForm] = useState({}),
    [error, setError] = useState(""),
    [confirmation, setConfirmation] = useState(null),
    [saving, setSaving] = useState(false);
  const permissions = casePermissions(r, evidence, clearance);
  const pending = evidence.filter((e) => e.status !== "Validated");
  function open(a) {
    if (!permissions[a]) return;
    setMenu(false);
    setAction(a);
    setError("");
    setForm({ recipient: r.reporterId, notes: "", due: "", notify: true });
  }
  async function save(e, confirmed = false) {
    e?.preventDefault();
    if (saving) return;
    try {
      if (!permissions[action])
        throw Error("Complete the current workflow step first.");
      if (
        ["review", "pending", "decision"].includes(action) &&
        (!evidence.length || pending.length)
      )
        throw Error("Validate every evidence file before proceeding.");
      if (action === "pending" && !["Open", "Under Review"].includes(r.status))
        throw Error("The case must be Open or Under Review before proceeding.");
      const next = caseTransition(r, action, form);
      if (["decision", "condition"].includes(action) && !confirmed) {
        setConfirmation(next);
        return;
      }
      setSaving(true);
      if ((await onSave(next)) === false)
        throw Error("Could not save this case. Please try again.");
      setAction("");
      setConfirmation(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const set = (k, v) => setForm({ ...form, [k]: v });
  return (
    <>
      {!["Resolved", "Pending Completion"].includes(r.status) &&
        !evidence.some((e) => e.status === "Insufficient") && (
          <>
            {permissions.pending && (
              <button className={primary} onClick={() => open("pending")}>
                Proceed to Case Action
              </button>
            )}
            <div className="ocx-status-menu">
              <button
                className={button}
                disabled={
                  r.archived || !["Case Actions"].includes(permissions.step)
                }
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                Update Status ▾
              </button>
              {menu && (
                <div>
                  <button
                    disabled={!permissions.request}
                    onClick={() => open("request")}
                  >
                    Request evidence
                  </button>
                  <button
                    disabled={!permissions.pending}
                    onClick={() => open("pending")}
                  >
                    Move to Pending Decision
                  </button>
                </div>
              )}
            </div>
            <button
              className={primary}
              disabled={!permissions.decision}
              onClick={() => open("decision")}
            >
              Record Decision & Block Clearance
            </button>
          </>
        )}
      {["Pending Completion", "Resolved"].includes(r.status) &&
        r.decision?.condition &&
        !r.decision.conditionDone && (
          <>
            <button
              className={primary}
              disabled={!permissions.condition}
              onClick={() => open("condition")}
            >
              Mark Condition Completed
            </button>
          </>
        )}
      {action && (
        <Modal
          title={
            action === "review"
              ? "Start Case Review?"
              : action === "request"
                ? "Request Evidence"
                : action === "pending"
                  ? pending.length
                    ? "Evidence still under validation"
                    : "Move to Pending Decision?"
                  : action === "condition"
                    ? "Mark the condition completed?"
                    : "Record Decision"
          }
          subtitle={`${r.caseId} · ${r.type}`}
          onClose={() => setAction("")}
        >
          <form onSubmit={save} className="ocx-workflow-form">
            {action === "review" && (
              <p>
                All evidence must be validated and the case must be Under Review
                before proceeding to Pending Decision. A case note is optional.
              </p>
            )}
            {action === "pending" && (
              <p className="ocx-warning">
                {pending.length
                  ? `${pending.map((e) => e.id).join(", ")} must be validated before this case can move to Pending Decision.`
                  : "The case will become ready for a recorded decision."}
              </p>
            )}
            {action === "condition" && (
              <p>
                {r.decision.condition}. Mark this condition completed? The case
                will then be ready for resolution and archival.
              </p>
            )}
            {action === "request" && (
              <>
                <label>
                  Request from
                  <select
                    className={input}
                    value={form.recipient}
                    onChange={(e) => set("recipient", e.target.value)}
                  >
                    <option value={r.reporterId}>Reporter: {r.reporter}</option>
                    <option value={r.studentUserId}>
                      Reported student: {r.student}
                    </option>
                  </select>
                </label>
                <label>
                  What is needed
                  <textarea
                    className={input}
                    required
                    minLength={10}
                    maxLength={4000}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Full chat export including timestamps"
                  />
                </label>
                <label>
                  Due date
                  <input
                    className={input}
                    type="date"
                    required
                    value={form.due}
                    onChange={(e) => set("due", e.target.value)}
                  />
                </label>
                <small>
                  The request is saved to the case record and sent as an in-app
                  notification.
                </small>
              </>
            )}
            {action === "decision" && (
              <>
                {pending.length > 0 && (
                  <p className="ocx-warning">
                    <b>{pending.length} evidence item(s) not validated</b>
                    <br />
                    {pending.map((e) => `${e.id} (${e.status})`).join(", ")}.
                    Base the decision on validated evidence and documented
                    statements.
                  </p>
                )}
                <label>Institutional outcome</label>
                <div className="ocx-outcomes">
                  {outcomes.map((o) => (
                    <button
                      type="button"
                      key={o}
                      className={form.outcome === o ? primary : button}
                      aria-pressed={form.outcome === o}
                      onClick={() => set("outcome", o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <label>
                  Decision details and basis
                  <textarea
                    className={input}
                    rows={4}
                    minLength={30}
                    maxLength={4000}
                    required
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </label>
                <small>{form.notes.length}/30 characters minimum</small>
                <label>
                  Policy reference
                  <input
                    className={input}
                    required
                    placeholder="Enter the applicable policy and version"
                    value={form.basis || ""}
                    onChange={(e) => set("basis", e.target.value)}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!form.hasCondition}
                    onChange={(e) => set("hasCondition", e.target.checked)}
                  />{" "}
                  Add a condition the student must complete
                </label>
                {form.hasCondition && (
                  <>
                    <p className="ocx-warning">
                      Recording this condition blocks student clearance until
                      compliance is verified and OSAS releases the hold.
                    </p>
                    <label>
                      Condition
                      <input
                        className={input}
                        required
                        value={form.condition || ""}
                        onChange={(e) => set("condition", e.target.value)}
                      />
                    </label>
                    <label>
                      Due date
                      <input
                        className={input}
                        type="date"
                        required
                        value={form.due}
                        onChange={(e) => set("due", e.target.value)}
                      />
                    </label>
                  </>
                )}
                <label>
                  <input
                    type="checkbox"
                    required
                    checked={!!form.ack}
                    onChange={(e) => set("ack", e.target.checked)}
                  />{" "}
                  This decision rests on the reviewed case record, not on the
                  existence of a report or case.
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.notify}
                    onChange={(e) => set("notify", e.target.checked)}
                  />{" "}
                  Record a request to notify both parties in the database
                </label>
              </>
            )}
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
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
                disabled={
                  saving ||
                  (action === "pending" &&
                    (pending.length > 0 ||
                      !["Open", "Under Review"].includes(r.status)))
                }
              >
                {action === "review"
                  ? "Start Case Review"
                  : action === "pending"
                    ? "Move to Pending Decision"
                    : action === "request"
                      ? "Save Request"
                      : action === "condition"
                        ? "Mark Completed"
                        : form.hasCondition
                          ? "Record Decision & Block Clearance"
                          : "Record Decision"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmation && (
        <Modal
          title={
            action === "decision"
              ? `Record ${form.outcome} for ${r.caseId}?`
              : "Mark the condition completed?"
          }
          onClose={() => setConfirmation(null)}
        >
          <p>
            {action === "decision"
              ? "This decision becomes part of the institutional case record and cannot be changed after recording."
              : r.decision?.condition}
          </p>
          <div className="ocx-results">
            <button
              className={button}
              disabled={saving}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </button>
            <button
              className={primary}
              disabled={saving}
              onClick={(e) => save(e, true)}
            >
              {saving
                ? "Saving..."
                : action === "decision"
                  ? form.hasCondition
                    ? "Record Decision & Block Clearance"
                    : "Record Decision"
                  : "Mark Completed"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
