import { useState } from "react";
import {
  Modal,
  Field,
  button,
  primary,
  input,
} from "../tutor/workspace/ui.jsx";
import { useInteractions } from "../shared/InteractionProvider.jsx";

export default function CaseActions({ record, onChange, onArchive }) {
  const [action, setAction] = useState(""),
    [error, setError] = useState("");
  const { confirm } = useInteractions();
  const resolved = record.status === "Resolved";
  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (!values.notes.trim()) return setError("Enter notes before saving.");
    let next = { ...record };
    const entry = {
      at: new Date().toISOString(),
      officer: record.officer || "OSAS Officer",
      notes: values.notes.trim(),
      status: record.status,
    };
    if (action === "Request Evidence") {
      next.status = "Awaiting Evidence";
      next.evidenceRequest = {
        recipient: values.recipient,
        due: values.due,
        notes: values.notes,
      };
      entry.status = next.status;
    }
    if (action === "Record Decision") {
      if (
        !(await confirm({
          title: `Record ${values.outcome}?`,
          message:
            "This decision becomes part of the database case record. Archived decisions cannot be edited.",
          accept: "Record Decision",
        }))
      )
        return;
      next.status = "Resolved";
      next.decision = {
        outcome: values.outcome,
        basis: values.basis,
        notes: values.notes,
        condition: values.condition,
        due: values.due,
        conditionDone: !values.condition,
        at: entry.at,
        notify: values.notify === "on",
      };
      entry.status = "Resolved";
      entry.basis = values.basis;
    }
    next.history = [...(record.history || []), entry];
    if ((await onChange(next)) === false)
      return setError("Could not save this case. Please try again.");
    setAction("");
    setError("");
  }
  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-xs">
      <div className="flex flex-wrap gap-2">
        {!resolved &&
          ["Add Case Note", "Request Evidence", "Record Decision"].map(
            (label) => (
              <button
                type="button"
                key={label}
                className={button}
                onClick={() => {
                  setAction(label);
                  setError("");
                }}
              >
                {label}
              </button>
            ),
          )}
        {resolved &&
          record.decision?.condition &&
          !record.decision.conditionDone && (
            <button
              type="button"
              className={button}
              onClick={async () => {
                if (
                  await confirm({
                    title: "Mark the condition completed?",
                    message: record.decision.condition,
                    accept: "Mark Completed",
                  })
                )
                  onChange({
                    ...record,
                    decision: { ...record.decision, conditionDone: true },
                  });
              }}
            >
              Mark Condition Completed
            </button>
          )}
        {resolved && (
          <button
            type="button"
            className={button}
            disabled={!record.decision || !record.decision.conditionDone}
            onClick={async () => {
              if (
                await confirm({
                  title: `Archive ${record.caseId}?`,
                  message:
                    "The case becomes a read-only institutional record. Its decision cannot be edited or deleted.",
                  accept: "Resolve & Archive",
                })
              )
                onArchive(record);
            }}
          >
            Resolve & Archive
          </button>
        )}
      </div>
      {record.evidenceRequest && (
        <p>
          Evidence requested from {record.evidenceRequest.recipient}, due{" "}
          {record.evidenceRequest.due}.
        </p>
      )}
      {record.decision && (
        <p>
          Outcome: {record.decision.outcome}.{" "}
          {record.decision.condition &&
            `Condition: ${record.decision.condition} (${record.decision.conditionDone ? "Completed" : "Pending"})`}
        </p>
      )}
      {action && (
        <Modal title={action} onClose={() => setAction("")}>
          <form onSubmit={submit} className="space-y-3 text-xs">
            <p>
              {record.caseId} · {record.student}
            </p>
            {action === "Request Evidence" && (
              <>
                <Field label="Request From">
                  <select name="recipient" className={input}>
                    <option>{record.reporter}</option>
                    <option>{record.student}</option>
                  </select>
                </Field>
                <Field name="due" label="Due Date" type="date" required />
              </>
            )}
            {action === "Record Decision" && (
              <>
                <Field label="Outcome">
                  <select name="outcome" className={input} required>
                    <option value="">Choose an outcome</option>
                    {[
                      "No Violation",
                      "Case Dismissed",
                      "Counseled",
                      "Verbal Warning",
                      "Written Warning",
                      "Referred for Further Action",
                      "Clearance Hold Recommended",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Institutional / Policy Basis"
                  name="basis"
                  required
                />
                <Field label="Condition (optional)" name="condition" />
                <Field label="Condition Due Date" name="due" type="date" />
                <label className="flex gap-2">
                  <input name="notify" type="checkbox" defaultChecked />
                  Record a notification request for both parties
                </label>
                <label className="flex gap-2">
                  <input type="checkbox" required />I completed an impartial
                  review and recorded the basis.
                </label>
              </>
            )}
            <Field label="Notes">
              <textarea
                name="notes"
                className={input}
                required
                minLength={10}
                maxLength={4000}
              />
            </Field>
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                onClick={() => setAction("")}
              >
                Cancel
              </button>
              <button className={primary}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
