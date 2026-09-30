import { useState } from "react";
import { Modal, Field, input, button, primary } from "./ui.jsx";
import { hour, time, slotError } from "./data.js";
import { confirmedClasses } from "./scheduleReview.js";
import { parseDate, formatTimeInput } from "./schedule.js";
export default function AvailabilityEditor({
  slot,
  data,
  update,
  onClose,
  onSaved,
  onDelete,
}) {
  const [draft, setDraft] = useState({
      ...slot,
      kind: slot.kind || "available",
      repeat: slot.repeat ?? false,
    }),
    [error, setError] = useState("");
  const date = parseDate(draft.date);
  const candidate = { ...draft, day: date ? (date.getDay() + 6) % 7 : -1 };
  const validation = slotError(
    candidate,
    data.slots,
    data.sessions,
    confirmedClasses(data),
  );
  const times = Array.from({ length: 29 }, (_, i) => 7 + i * 0.5);
  function patch(key, value) {
    setDraft({ ...draft, [key]: value });
    setError("");
  }
  function save(e) {
    e.preventDefault();
    if (validation) return;
    if (slot.id && !data.slots.some((s) => s.id === slot.id))
      return setError("This block is no longer available.");
    const next = { ...candidate, id: slot.id || crypto.randomUUID() };
    if (
      update((d) => ({
        ...d,
        slots: slot.id
          ? d.slots.map((s) => (s.id === slot.id ? next : s))
          : [...d.slots, next],
      })) === false
    )
      return setError("Could not save. Please try again.");
    onSaved(date);
  }
  return (
    <Modal
      title={slot.id ? "Update Availability" : "Add Availability"}
      subtitle="Only times you create here can be changed. Classes and booked sessions stay locked."
      onClose={onClose}
      footer={
        <>
          <button className={button + " mr-auto"} onClick={onClose}>
            Cancel
          </button>
          {slot.id && (
            <button
              className="text-red-600 text-xs"
              onClick={() => onDelete(slot)}
            >
              Remove Availability
            </button>
          )}
          <button
            className={primary}
            form="availability-editor"
            type="submit"
            disabled={!!validation}
          >
            Save Availability
          </button>
        </>
      }
    >
      <form id="availability-editor" onSubmit={save} className="space-y-3">
        <Field label="Date">
          <input
            type="date"
            className={input}
            value={draft.date}
            onChange={(e) => patch("date", e.target.value)}
            required
          />
        </Field>
        {date && (
          <p className="session-muted">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {["start", "end"].map((key) => (
            <Field
              key={key}
              label={key === "start" ? "Start Time" : "End Time"}
            >
              <select
                className={input}
                value={formatTimeInput(draft[key])}
                onChange={(e) => patch(key, hour(e.target.value))}
              >
                {[...new Set([...times, draft[key]])]
                  .sort((a, b) => a - b)
                  .map((v) => (
                    <option key={v} value={formatTimeInput(v)}>
                      {time(v)}
                    </option>
                  ))}
              </select>
            </Field>
          ))}
        </div>
        <fieldset>
          <legend className="mb-2 font-semibold">Type</legend>
          <div className="flex gap-2">
            {[
              ["available", "Available for Tutoring"],
              ["unavailable", "Unavailable"],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={draft.kind === v ? primary : button}
                aria-pressed={draft.kind === v}
                onClick={() => patch("kind", v)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {draft.kind === "available" && (
          <fieldset>
            <legend className="mb-2 font-semibold">Session Type</legend>
            <div className="flex gap-2">
              {["Online", "In-person", "Both"].map((v) => (
                <button
                  type="button"
                  key={v}
                  className={draft.type === v ? primary : button}
                  aria-pressed={draft.type === v}
                  onClick={() => patch("type", v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="session-muted">
              Online sessions use external Google Meet or Zoom links.
            </p>
          </fieldset>
        )}
        <Field label="Repeat">
          <select
            className={input}
            value={draft.repeat ? "weekly" : "once"}
            onChange={(e) => patch("repeat", e.target.value === "weekly")}
          >
            <option value="once">This date only</option>
            <option value="weekly">Repeat weekly on this day</option>
          </select>
        </Field>
        {slot.repeat && (
          <p className="session-muted">
            Updating this block changes its weekly availability.
          </p>
        )}
        {validation && (
          <div role="status" className="session-warning">
            <strong>{validation}</strong>
            <p className="mt-1">
              Update the existing block instead, or choose a different time.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
