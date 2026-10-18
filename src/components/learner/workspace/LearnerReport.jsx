import EvidencePicker from "../../shared/EvidencePicker.jsx";
import { useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { button, input, primary } from "../../tutor/workspace/ui.jsx";
import { sessionInfo } from "./SessionDialog.jsx";
export default function LearnerReport({ record, onClose, onSubmit }) {
  const submissionKey = useRef(crypto.randomUUID());
  const bookings = record.bookings || (record.id ? [sessionInfo(record)] : []);
  const [booking, setBooking] = useState(String(bookings[0]?.id || "")),
    [type, setType] = useState(""),
    [description, setDescription] = useState(""),
    [files, setFiles] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="ls-flow"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await onSubmit({
            sessionId: bookings.find((b) => String(b.id) === booking)?.id,
            name: record.name,
            incidentType: type,
            reason: description.trim(),
            evidence: files,
            submissionKey: submissionKey.current,
          });
        } catch (cause) {
          setError(cause.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="ls-content">
        <label className="ls-field">
          Booking reference
          <select
            className={input}
            value={booking}
            onChange={(e) => setBooking(e.target.value)}
          >
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bookingId}, {b.name}, {b.date}
              </option>
            ))}
          </select>
        </label>
        <label className="ls-field">
          Incident type
          <select
            className={input}
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Select an incident type</option>
            {[
              "Inappropriate behavior or harassment",
              "No-show",
              "Payment concern",
              "Technical issue",
              "Other",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="ls-field">
          Description
          <textarea
            className={input}
            rows={4}
            required
            minLength={20}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, including times and what was said or done."
          />
        </label>
        <p className="ls-muted">At least 20 characters.</p>
        <EvidencePicker
          files={files}
          onChange={setFiles}
          onError={setError}
          disabled={busy}
        />
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <div className="ls-alert mt-4">
          <ShieldCheck size={23} />
          <p>
            Reports are saved securely for Admin screening and OSAS review. For
            emergencies, contact campus security right away.
          </p>
        </div>
      </div>
      <footer className="ls-footer">
        <button type="button" className={button} onClick={onClose}>
          Cancel
        </button>
        <button
          className={primary}
          disabled={
            busy ||
            !booking ||
            !type ||
            description.trim().length < 20 ||
            !files.length
          }
        >
          {busy ? "Reading evidence…" : "Submit Report"}
        </button>
      </footer>
    </form>
  );
}
