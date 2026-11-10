import { useState } from "react";
import { Star } from "lucide-react";
import { Avatar, button, primary, input } from "../../tutor/workspace/ui.jsx";
import { sessionInfo } from "./SessionDialog.jsx";
export default function ReviewDialog({ record, review, onClose, onSave }) {
  const r = sessionInfo(record);
  const [rating, setRating] = useState(Number(review?.rating) || 0),
    [text, setText] = useState(review?.text || ""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="ls-flow"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        if (
          r.lifecycle === "Completed" &&
          rating >= 1 &&
          rating <= 5 &&
          text.trim().length >= 3
        ) {
          setSaving(true);
          setError("");
          try {
            await onSave({ rating, text: text.trim() });
          } catch (err) {
            setError(err.message);
          } finally {
            setSaving(false);
          }
        }
      }}
    >
      <div className="ls-content">
        <div className="ls-tutor">
          <Avatar name={r.name} />
          <div>
            <strong>{r.name}</strong>
            <small style={{ color: "#748093" }}>
              {r.service}
              {r.topic ? ` - ${r.topic}` : ""}, completed {r.date}
            </small>
          </div>
        </div>
        <fieldset disabled={saving}>
          <legend className="mb-2 font-semibold">Your rating</legend>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="cursor-pointer rounded focus-within:ring-2 focus-within:ring-green-700"
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  required
                />
                <Star
                  size={29}
                  fill={n <= rating ? "#ffb800" : "#d1d5db"}
                  color={n <= rating ? "#ffb800" : "#d1d5db"}
                />
              </label>
            ))}
            <span className="ml-2 font-semibold">
              {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
            </span>
          </div>
        </fieldset>
        <label className="ls-field">
          Your review
          <textarea
            className={input}
            disabled={saving}
            rows={4}
            required
            minLength={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What went well? What could be better?"
          />
        </label>
        <p className="ls-muted mt-5">
          Reviews are available after the tutor uploads proof and you confirm
          session completion. Your review is saved to your account.
        </p>
      </div>
      {error && (
        <p role="alert" className="ls-warning">
          {error}
        </p>
      )}
      <footer className="ls-footer">
        <button
          type="button"
          className={button}
          disabled={saving}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className={primary}
          disabled={
            saving ||
            r.lifecycle !== "Completed" ||
            !rating ||
            text.trim().length < 3
          }
        >
          {saving ? "Saving..." : review ? "Save Changes" : "Submit Review"}
        </button>
      </footer>
    </form>
  );
}
