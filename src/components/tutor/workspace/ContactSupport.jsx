import { useState } from "react";
import { Send } from "lucide-react";
import { Modal, Field, button, primary, input } from "./ui.jsx";

const topics = [
  "Account access",
  "Technical issue",
  "Booking or session help",
  "Payment or earnings",
  "Other",
];

export default function ContactSupport({ update, onClose }) {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const valid = topics.includes(topic) && message.trim().length >= 15;
  function submit(event) {
    event.preventDefault();
    if (!valid || saved) return;
    setError("");
    try {
      const result = update((data) => ({
        ...data,
        reports: [
          ...(data.reports || []),
          {
            id: crypto.randomUUID(),
            type: "support",
            subject: topic,
            details: message.trim(),
            created: new Date().toISOString(),
          },
        ],
      }));
      if (result === false)
        throw new Error("Could not save your request. Please try again.");
      setSaved(true);
    } catch {
      setError("Could not save your request. Please try again.");
    }
  }
  return (
    <Modal
      title="Contact Support"
      subtitle="Technical or account help"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={button} onClick={onClose}>
            {saved ? "Close" : "Cancel"}
          </button>
          {!saved && (
            <button
              className={primary}
              type="submit"
              form="contact-support-form"
              disabled={!valid}
            >
              <Send size={15} />
              Save Support Draft
            </button>
          )}
        </>
      }
    >
      <form id="contact-support-form" className="space-y-3" onSubmit={submit}>
        <Field label="Topic">
          <select
            className={input}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            disabled={saved}
          >
            <option value="">Select a topic</option>
            {topics.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        <Field label="Message">
          <textarea
            className={input}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={3000}
            required
            disabled={saved}
            placeholder="Describe the problem and what you expected to happen."
            aria-describedby="support-message-length"
          />
        </Field>
        <p id="support-message-length" className="text-[11px] text-slate-500">
          {message.trim().length}/15 characters minimum
        </p>
        <p className="text-xs text-slate-500">
          For session incidents, use Report an Issue in Session Details so Admin
          can review it and refer conduct concerns to OSAS.
        </p>
        <p className="text-[11px] text-slate-500">
          Support delivery is not connected. Requests are saved on this browser
          only.
        </p>
        {saved && (
          <p role="status" className="text-xs text-green-800">
            Draft saved locally. It has not been sent.
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
