import { useState } from "react";
import { Modal, Field, input, button, primary } from "./ui.jsx";
import { hour, time, slotError } from "./data.js";
import { confirmedClasses } from "./scheduleReview.js";
import { parseDate, formatTimeInput } from "./schedule.js";
export default function AvailabilityEditor({
  slot,
  data,
  saveAvailability,
  onClose,
  onSaved,
  onDelete,
}) {
  const [draft, setDraft] = useState({
      ...slot,
      kind: slot.kind || "available",
      repeat: slot.repeat ?? false,
    }),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const date = parseDate(draft.date);
  const candidate = { ...draft, day: date ? (date.getDay() + 6) % 7 : -1 };
  const validation = slotError(
    candidate,
    [],
    data.sessions,
    confirmedClasses(data),
  );
  const times = Array.from({ length: 29 }, (_, i) => 7 + i * 0.5);
  function patch(key, value) {
    setDraft({
      ...draft,
      [key]: value,
      ...(key === "serviceId" ? { topicId: null } : {}),
    });
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (validation || saving) return;
    if (slot.id && !data.slots.some((s) => s.id === slot.id))
      return setError("This block is no longer available.");
    setSaving(true);
    setError("");
    try {
      await saveAvailability({ ...candidate, id: slot.id || null });
      onSaved(date);
    } catch (saveError) {
      setError(saveError.message || "Could not save availability.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={slot.id ? "Update Availability" : "Add Availability"}
      subtitle="Only times you create here can be changed. Classes and booked sessions stay locked."
      onClose={onClose}
      footer={
        <>
          <button
            className={button + " mr-auto"}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          {slot.id && (
            <button
              className="text-red-600 text-xs"
              onClick={() => onDelete(slot)}
              disabled={saving}
            >
              Remove Availability
            </button>
          )}
          <button
            className={primary}
            form="availability-editor"
            type="submit"
            disabled={!!validation || saving}
          >
            {saving ? "Saving..." : "Save Availability"}
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.repeat}
            onChange={(e) => patch("repeat", e.target.checked)}
          />
          Repeat weekly on this weekday
        </label>
        <p className="session-muted">
          {draft.repeat
            ? "Available every week on this weekday."
            : "Available only on the selected date."}{" "}
          Matching availability for the same service is combined automatically.
        </p>
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
        <Field label="Tutoring Service (optional)">
          <select
            className={input}
            value={draft.serviceId || ""}
            onChange={(e) => patch("serviceId", e.target.value || null)}
          >
            <option value="">All active services</option>
            {data.services
              .filter((service) => service.status?.toLowerCase() === "active")
              .map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
          </select>
          <p className="session-muted">
            Leave this as all services to offer the time across your active
            listings.
          </p>
        </Field>
        {draft.serviceId && (
          <Field label="Topic (optional)">
            <select
              className={input}
              value={draft.topicId || ""}
              onChange={(e) => patch("topicId", e.target.value || null)}
            >
              <option value="">All topics in this service</option>
              {data.services
                .find((service) => service.id === draft.serviceId)
                ?.topicDetails?.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
            </select>
          </Field>
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
