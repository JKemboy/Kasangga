import { useState } from "react";
import {
  completionProofUrl,
  confirmLearnerCompletion,
  remindLearnerCompletion,
} from "../../services/tutorSessionCompletion.js";
import { button, primary } from "./staffUi.jsx";

export default function SessionCompletionProof({
  bookingId,
  proof,
  tutor = false,
  onConfirmed,
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [url, setUrl] = useState("");
  async function run(action) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "view") {
        setUrl("");
        setUrl(await completionProofUrl(proof.storage_path));
      } else if (action === "confirm") {
        await confirmLearnerCompletion(bookingId);
        await onConfirmed?.();
      } else {
        await remindLearnerCompletion(bookingId);
        setMessage("Reminder sent to the learner.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (!proof)
    return (
      <p className="text-xs text-slate-500">
        Awaiting tutor’s completion proof. Review and confirm it before rating.
      </p>
    );
  const nextReminder = new Date(
    Math.max(
      new Date(proof.uploaded_at).getTime(),
      new Date(proof.last_reminded_at || 0).getTime(),
    ) + 86400000,
  );
  const reminderWaiting = nextReminder.getTime() > Date.now();
  return (
    <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs">
      <p>
        {proof.learner_confirmed_at
          ? "Completion confirmed by learner."
          : "Proof uploaded — awaiting learner confirmation."}
      </p>
      <button
        type="button"
        className={button}
        disabled={busy}
        onClick={() => run("view")}
      >
        View completion proof
      </button>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block underline"
        >
          Open {proof.file_name || "completion proof"}
        </a>
      )}
      {!proof.learner_confirmed_at &&
        (tutor ? (
          <button
            type="button"
            className={button}
            disabled={busy || reminderWaiting}
            onClick={() => run("remind")}
          >
            Remind learner to confirm
          </button>
        ) : (
          <>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I reviewed the tutor’s proof and confirm that this session was
              completed.
            </label>
            <button
              type="button"
              className={primary}
              disabled={busy || !reviewed}
              onClick={() => run("confirm")}
            >
              {busy ? "Saving…" : "Confirm session completion"}
            </button>
          </>
        ))}
      {message && <p role="status">{message}</p>}
      {tutor && !proof.learner_confirmed_at && reminderWaiting && (
        <p>Reminders are available 24 hours after the last notification.</p>
      )}
    </div>
  );
}
