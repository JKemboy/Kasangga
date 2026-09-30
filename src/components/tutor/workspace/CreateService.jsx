import { useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  CircleCheck,
  CalendarDays,
  X,
} from "lucide-react";
import { Modal, Field, input, button, primary } from "./ui.jsx";
import { money, time } from "./data.js";
import { SERVICE_CATEGORIES, SERVICE_LEVELS } from "./serviceRules.js";
import { serviceAvailabilityErrors, createService } from "./createService.js";
import "./create-service.css";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const newRow = (date = today()) => ({
  id: crypto.randomUUID(),
  date,
  start: 18,
  end: 19,
});
const times = Array.from({ length: 48 }, (_, i) => i / 2);
export default function CreateService({ data, update, onClose }) {
  const [topics, setTopics] = useState([]),
    [topic, setTopic] = useState(""),
    [description, setDescription] = useState(""),
    [rate, setRate] = useState(""),
    [types, setTypes] = useState([]),
    [rows, setRows] = useState(() => [newRow()]),
    [error, setError] = useState("");
  const type = types.length === 2 ? "Both" : types[0] || "";
  const errors = serviceAvailabilityErrors(rows, type, data);
  function addTopic() {
    const value = topic.trim();
    if (!value) return;
    if (topics.some((t) => t.toLowerCase() === value.toLowerCase()))
      return setTopic("");
    if ([...topics, value].join(", ").length > 200)
      return setError("Topics must total 200 characters or fewer.");
    setTopics([...topics, value]);
    setTopic("");
    setError("");
  }
  function patch(id, field, value) {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function repeat() {
    const last = rows.at(-1);
    if (!last?.date) return;
    const more = Array.from({ length: 4 }, (_, i) => {
      const date = new Date(last.date + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() + 7 * (i + 1));
      return {
        ...last,
        id: crypto.randomUUID(),
        date: date.toISOString().slice(0, 10),
      };
    });
    setRows([...rows, ...more]);
  }
  function submit(e) {
    e.preventDefault();
    try {
      const values = {
        ...Object.fromEntries(new FormData(e.currentTarget)),
        description,
        rate,
        type,
        topics: topics.join(", "),
      };
      const next = createService(data, values, rows);
      if (update(() => next) === false)
        throw new Error("Could not save this service. Please try again.");
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Modal
      size="service"
      title="Create New Service"
      subtitle="New services go live for learners once saved."
      onClose={onClose}
      footer={
        <>
          <button className={button} onClick={onClose}>
            Cancel
          </button>
          <button className={primary} type="submit" form="create-service-form">
            <Check size={18} /> Create Service
          </button>
        </>
      }
    >
      <form
        id="create-service-form"
        onSubmit={submit}
        className="create-service-form"
      >
        <div className="create-service-columns">
          <Field label="Service Title">
            <input
              className={input}
              name="name"
              placeholder="e.g., Calculus 1"
              maxLength={200}
              required
            />
          </Field>
          <Field label="Subject">
            <input
              className={input}
              name="subtitle"
              placeholder="e.g., Differential & Integral Calculus"
              maxLength={200}
              required
            />
          </Field>
          <Field label="Category">
            <select className={input} name="category" defaultValue="" required>
              <option value="" disabled>
                Select a category
              </option>
              {[
                ...new Set([
                  ...SERVICE_CATEGORIES,
                  ...data.services.map((s) => s.category),
                ]),
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Level">
            <select className={input} name="level" defaultValue="" required>
              <option value="" disabled>
                Select a level
              </option>
              {SERVICE_LEVELS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={input}
            placeholder="What learners get from this service"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={160}
            required
          />
        </Field>
        <p className="create-service-hint">{description.length}/160</p>
        <div>
          <h3>Topics / Skills</h3>
          <div className="service-topics">
            {topics.length ? (
              topics.map((t) => (
                <span key={t}>
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => setTopics(topics.filter((v) => v !== t))}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))
            ) : (
              <p className="create-service-hint">No topics yet.</p>
            )}
          </div>
          <div className="service-topic-input">
            <input
              aria-label="Add a topic"
              className={input}
              placeholder="Add a topic, then press Add"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic();
                }
              }}
            />
            <button type="button" className={button} onClick={addTopic}>
              <Plus size={18} /> Add
            </button>
          </div>
        </div>
        <div className="create-service-columns">
          <div>
            <Field label="Hourly Rate (₱)">
              <input
                className={input}
                name="rate"
                type="number"
                min="1"
                max="10000"
                step="0.01"
                placeholder="e.g., 350"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </Field>
            <p className="create-service-hint">
              1 hr = {money(Number(rate) || 0)} · 1.5 hr ={" "}
              {money((Number(rate) || 0) * 1.5)} · 2 hr ={" "}
              {money((Number(rate) || 0) * 2)}. You receive 90% of each paid
              session.
            </p>
          </div>
          <fieldset>
            <legend>Session Type</legend>
            <div className="service-types">
              {["Online", "In-person"].map((v) => (
                <label key={v}>
                  <input
                    type="checkbox"
                    checked={types.includes(v)}
                    onChange={(e) =>
                      setTypes(
                        e.target.checked
                          ? [...types, v]
                          : types.filter((t) => t !== v),
                      )
                    }
                  />
                  {v === "In-person" ? "In-Person" : v}
                </label>
              ))}
            </div>
            <p className="create-service-hint">
              Online sessions use an external Google Meet or Zoom link.
            </p>
          </fieldset>
        </div>
        <section>
          <div className="service-availability-heading">
            <div>
              <h3>Availability for this service</h3>
              <p className="create-service-hint">
                Choose one or more dates and times. Each one is checked against
                your confirmed class schedule and booked sessions.
              </p>
            </div>
            <span>
              {rows.length} date{rows.length === 1 ? "" : "s"} ·{" "}
              {errors.filter((e) => !e).length} valid
            </span>
          </div>
          <div className="service-availability">
            {rows.map((r, i) => (
              <div className="service-availability-row" key={r.id}>
                <div>
                  <input
                    aria-label={`Date ${i + 1}`}
                    className={input}
                    type="date"
                    min={today()}
                    required
                    value={r.date}
                    onChange={(e) => patch(r.id, "date", e.target.value)}
                  />
                  <p className="create-service-hint">
                    {r.date &&
                      new Date(r.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "long" },
                      )}
                  </p>
                </div>
                <select
                  aria-label={`Start time ${i + 1}`}
                  className={input}
                  value={r.start}
                  onChange={(e) => patch(r.id, "start", Number(e.target.value))}
                >
                  {times.map((v) => (
                    <option key={v} value={v}>
                      {time(v)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`End time ${i + 1}`}
                  className={input}
                  value={r.end}
                  onChange={(e) => patch(r.id, "end", Number(e.target.value))}
                >
                  {times
                    .filter((v) => v > 0)
                    .map((v) => (
                      <option key={v} value={v}>
                        {time(v)}
                      </option>
                    ))}
                </select>
                <p
                  className={
                    errors[i] ? "service-slot-error" : "service-slot-valid"
                  }
                >
                  {!errors[i] && <CircleCheck size={17} />}{" "}
                  {errors[i] ||
                    "No conflicts with your confirmed classes or booked sessions"}
                </p>
                <button
                  type="button"
                  aria-label={`Remove date ${i + 1}`}
                  onClick={() => setRows(rows.filter((row) => row.id !== r.id))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <div className="service-availability-actions">
              <button
                type="button"
                className={button}
                onClick={() => setRows([...rows, newRow()])}
              >
                <Plus size={17} /> Add date &amp; time
              </button>
              <button
                type="button"
                className={button}
                disabled={!rows.length}
                onClick={repeat}
              >
                <CalendarDays size={17} /> Repeat last one weekly (4 weeks)
              </button>
              <span className="create-service-hint">
                Session type follows the service above.
              </span>
            </div>
          </div>
          <p className="create-service-hint">
            Dates saved here appear in Availability &amp; Schedule as green
            blocks reserved for this service. Class times and booked sessions
            stay locked.
          </p>
        </section>
        {error && (
          <p role="alert" className="service-slot-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
