import { useState } from "react";
import { Star } from "lucide-react";
import { Avatar, button, primary, input } from "../../tutor/workspace/ui.jsx";
import { sessionInfo } from "./SessionDialog.jsx";
export default function ReviewDialog({ record, review, onClose, onSave }) {
  const r = sessionInfo(record);
  const [rating, setRating] = useState(Number(review?.rating) || 0),
    [text, setText] = useState(review?.text || "");
  return (
    <form
      className="ls-flow"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          r.lifecycle === "Completed" &&
          rating >= 1 &&
          rating <= 5 &&
          text.trim().length >= 3
        )
          onSave({ rating, text: text.trim() });
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
        <fieldset>
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
          Reviews are only available for completed sessions. Changes are saved
          on this browser; publishing to the tutor's profile is not connected
          yet.
        </p>
      </div>
      <footer className="ls-footer">
        <button type="button" className={button} onClick={onClose}>
          Cancel
        </button>
        <button
          className={primary}
          disabled={
            r.lifecycle !== "Completed" || !rating || text.trim().length < 3
          }
        >
          {review ? "Save Changes" : "Submit Review"}
        </button>
      </footer>
    </form>
  );
}
