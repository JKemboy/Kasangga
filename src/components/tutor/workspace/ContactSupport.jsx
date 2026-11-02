import { useAuth } from "../../../auth/AuthProvider.jsx";
import { createSupportConversation } from "../../../services/supportInbox.js";
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

export default function ContactSupport({ onClose }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const valid = topics.includes(topic) && message.trim().length >= 15;
  async function submit(event) {
    event.preventDefault();
    if (busy || saved) return;
    if (!valid)
      return setError(
        "Choose a topic and describe the issue in at least 15 characters.",
      );
    setError("");
    setBusy(true);
    try {
      await createSupportConversation({
        userId: user.id,
        subject: topic,
        category: topic,
        message: message.trim(),
      });
      setSaved(true);
    } catch (error) {
      setError(
        error.message ||
          "Could not send your support request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Contact Support"
      subtitle="Technical or account help"
      onClose={(event) => {
        if (busy) event?.preventDefault();
        else onClose();
      }}
      footer={
        <>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={onClose}
          >
            {saved ? "Close" : "Cancel"}
          </button>
          {!saved && (
            <button
              className={primary}
              type="submit"
              form="contact-support-form"
              disabled={busy}
            >
              <Send size={15} />
              {busy ? "Sending..." : "Send Support Request"}
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
            disabled={saved || busy}
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
            disabled={saved || busy}
            placeholder="Describe the problem and what you expected to happen."
            aria-describedby="support-message-length"
          />
        </Field>
        <p id="support-message-length" className="text-[11px] text-slate-500">
          {message.trim().length}/15 characters minimum
        </p>
        <p className="text-xs text-slate-500">
          For session incidents, use Report an Issue in Session Details so LCO
          can review it and refer conduct concerns to OSWE.
        </p>
        <p className="text-[11px] text-slate-500">
          Your request is sent to the Kasangga LCO support inbox. Do not
          include passwords, OTPs or GCash MPINs.
        </p>
        {saved && (
          <p role="status" className="text-xs text-green-800">
            Your support request was sent to the LCO team.
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
