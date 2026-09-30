import { useState } from "react";
import { Upload, ShieldCheck } from "lucide-react";
import { button, input, primary } from "../../tutor/workspace/ui.jsx";
import { sessionInfo } from "./SessionDialog.jsx";
export default function LearnerReport({ record, onClose, onSubmit }) {
  const bookings = record.bookings || (record.id ? [sessionInfo(record)] : []);
  const [booking, setBooking] = useState(String(bookings[0]?.id || "")),
    [type, setType] = useState(""),
    [description, setDescription] = useState(""),
    [files, setFiles] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function attach(e) {
    const chosen = [...e.target.files];
    e.target.value = "";
    if (
      chosen.some(
        (f) =>
          !["image/png", "image/jpeg", "application/pdf"].includes(f.type) ||
          f.size > 10 * 1024 * 1024,
      )
    )
      return setError("Choose PNG, JPG or PDF files up to 10 MB each.");
    setBusy(true);
    setError("");
    try {
      const attachments = await Promise.all(
        chosen.map(
          (f) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: f.name,
                  type: f.type,
                  size: f.size,
                  data: reader.result,
                });
              reader.onerror = () =>
                reject(new Error("Could not read evidence."));
              reader.readAsDataURL(f);
            }),
        ),
      );
      setFiles((prev) => [...prev, ...attachments]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="ls-flow"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          sessionId: bookings.find((b) => String(b.id) === booking)?.id,
          name: record.name,
          incidentType: type,
          reason: description.trim(),
          evidence: files,
        });
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
            <option value="">Conversation only (no booking)</option>
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
        <label className="ls-field">
          Evidence (optional)
          <span className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4">
            <Upload size={20} />
            <span>
              Upload screenshots or files
              <small className="block font-normal text-slate-500">
                PNG, JPG or PDF, up to 10 MB each
              </small>
            </span>
          </span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,application/pdf"
            onChange={attach}
            disabled={busy}
          />
        </label>
        {files.map((f, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="truncate">{f.name}</span>
            <button
              type="button"
              onClick={() => setFiles(files.filter((_, j) => i !== j))}
            >
              Remove
            </button>
          </div>
        ))}
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <div className="ls-alert mt-4">
          <ShieldCheck size={23} />
          <p>
            Reports are saved on this browser; admin delivery is not connected
            yet. For emergencies, contact campus security right away.
          </p>
        </div>
      </div>
      <footer className="ls-footer">
        <button type="button" className={button} onClick={onClose}>
          Cancel
        </button>
        <button
          className={primary}
          disabled={busy || !type || description.trim().length < 20}
        >
          {busy ? "Reading evidence…" : "Submit Report"}
        </button>
      </footer>
    </form>
  );
}
