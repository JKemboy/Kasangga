import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { Modal, Field, input, button, primary } from "./ui.jsx";
import { money } from "./data.js";
import {
  validateService,
  SERVICE_CATEGORIES,
  SERVICE_LEVELS,
} from "./serviceRules.js";
import "./create-service.css";
export default function CreateService({
  data,
  saveService,
  onClose,
  service = null,
}) {
  const [topics, setTopics] = useState(
      service?.topics
        ?.split(/[,·]/)
        .map((t) => t.trim())
        .filter(Boolean) || [],
    ),
    [topic, setTopic] = useState(""),
    [description, setDescription] = useState(service?.description || ""),
    [rate, setRate] = useState(service?.rate ?? ""),
    [types, setTypes] = useState(
      service
        ? service.type === "Both"
          ? ["Online", "In-person"]
          : [service.type]
        : [],
    ),
    [error, setError] = useState("");
  const type = types.length === 2 ? "Both" : types[0] || "";
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
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const values = {
        ...Object.fromEntries(new FormData(e.currentTarget)),
        description,
        rate,
        type,
        topics: topics.join(", "),
      };
      const result = validateService(
        values,
        data.services,
        service?.id ?? null,
      );
      if (result.error) throw new Error(result.error);
      await saveService(result.values, service?.id ?? null);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      size="service"
      title={service ? "Edit Service" : "Create New Service"}
      subtitle={
        service?.name ||
        "Active services appear to learners after tutor verification."
      }
      onClose={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          <button className={button} disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button
            className={primary}
            disabled={saving}
            type="submit"
            form="create-service-form"
          >
            <Check size={18} />{" "}
            {saving ? "Saving..." : service ? "Save Changes" : "Create Service"}
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
              defaultValue={service?.name || ""}
              placeholder="e.g., Calculus 1"
              maxLength={200}
              required
            />
          </Field>
          <Field label="Subject">
            <input
              className={input}
              name="subtitle"
              defaultValue={service?.subtitle || ""}
              placeholder="e.g., Differential & Integral Calculus"
              maxLength={200}
              required
            />
          </Field>
          <Field label="Category">
            <select
              className={input}
              name="category"
              defaultValue={service?.category || ""}
              required
            >
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
            <select
              className={input}
              name="level"
              defaultValue={service?.level || ""}
              required
            >
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
        {error && (
          <p role="alert" className="service-slot-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
