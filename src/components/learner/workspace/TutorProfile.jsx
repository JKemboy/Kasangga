import { profileSamples } from "./profileSamples.js";
import {
  Bookmark,
  MessageCircle,
  ShieldCheck,
  Star,
  Check,
} from "lucide-react";
import { button, primary } from "../../tutor/workspace/ui.jsx";
import "./tutor-profile.css";
export function tutorProfile(record) {
  const sample = {};
  const tutor = { ...sample, ...profileSamples[record.name], ...record };
  tutor.rate =
    Number(record.rate) ||
    Number(String(record.price || "").replace(/[^\d.]/g, "")) ||
    profileSamples[record.name]?.rate ||
    null;
  tutor.services =
    tutor.services ||
    String(tutor.subjects || "")
      .split(",")
      .filter(Boolean)
      .map((name) => ({
        name: name.trim(),
        category: tutor.category,
        rate: tutor.rate,
        topics: [],
      }));
  return tutor;
}
export default function TutorProfile({
  record,
  saved,
  onSave,
  onMessage,
  onBook,
}) {
  const t = tutorProfile(record);
  const chips = (value) =>
    Array.isArray(value)
      ? value
      : String(value || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
  return (
    <article className="learner-tutor-profile">
      <header className="ltp-intro">
        <div className="ltp-avatar">
          {t.image || t.avatar ? (
            <img src={t.image || t.avatar} alt={t.name} />
          ) : (
            <span>
              {t.name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </span>
          )}
          {t.online && <i />}
        </div>
        <div className="ltp-summary">
          <div className="ltp-name">
            <h3>{t.name}</h3>
            {t.verified && (
              <span className="ltp-badge">
                <ShieldCheck size={13} /> Verified Tutor
              </span>
            )}
            {typeof t.online === "boolean" && (
              <span className="ltp-badge">
                ● {t.online ? "Online" : "Offline"}
              </span>
            )}
          </div>
          <p className="ltp-degree">{t.degree || "Program not provided"}</p>
          <div className="ltp-stats">
            <span>
              <Star size={15} className="text-amber-500 fill-amber-500" />
              {t.rating || "Not rated"}
              {t.reviews && ` (${t.reviews} reviews)`}
            </span>
            {t.completed != null && (
              <span>
                <Check size={14} />
                {t.completed} completed sessions
              </span>
            )}
            <span>
              <b>{t.rate ? `₱${t.rate}` : "Rate unavailable"}</b>
              {t.rate && " / hour"}
            </span>
          </div>
          <div className="ltp-actions">
            <button className={primary} onClick={() => onBook(t)}>
              Book Now
            </button>
            <button className={button} onClick={() => onMessage(t)}>
              <MessageCircle size={15} /> Message Tutor
            </button>
            <button
              className={button}
              aria-pressed={saved}
              onClick={() => onSave(t)}
            >
              <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save Tutor"}
            </button>
          </div>
        </div>
      </header>
      <section>
        <h4>About</h4>
        <p>
          {t.about || t.bio || "This tutor has not added an introduction yet."}
        </p>
      </section>
      <section>
        <h4>Expertise</h4>
        <div className="ltp-chips">
          {chips(t.expertise || t.subjects).map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
      </section>
      <section>
        <h4>Services and topics</h4>
        <div className="ltp-services">
          {t.services.map((service) => (
            <div className="ltp-service" key={service.id || service.name}>
              <div>
                <strong>{service.name}</strong>
                <small>{service.category || t.category}</small>
                <b>
                  {service.rate || t.rate
                    ? `₱${service.rate || t.rate} / hour`
                    : "Rate unavailable"}
                </b>
                <button
                  className={button}
                  onClick={() =>
                    onBook({ ...t, selectedService: service.name })
                  }
                >
                  Book this service
                </button>
              </div>
              <div className="ltp-topics">
                {chips(service.topics).map((topic) => (
                  <span key={topic}>{topic}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <dl className="ltp-details">
        {[
          ["Session types", chips(t.types).join(", ") || "Ask the tutor"],
          [
            "Online platform",
            t.platform
              ? `${t.platform} (external link shared after booking)`
              : "Ask the tutor",
          ],
          ["In-person location", t.location || "Ask the tutor"],
          ["Levels", chips(t.levels).join(", ") || "Not provided"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h4>Weekly availability</h4>
        {t.weeklyAvailability ? (
          <>
            <div className="ltp-week">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className={t.weeklyAvailability[day] ? "available" : ""}
                >
                  <b>{day}</b>
                  <small>{t.weeklyAvailability[day] || "Unavailable"}</small>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Only open, conflict-free times are offered when you book.
            </p>
          </>
        ) : (
          <p>Weekly availability has not been provided.</p>
        )}
      </section>
      <section>
        <h4>Ratings and reviews</h4>
        {t.reviewEntries?.length ? (
          t.reviewEntries.map((review, i) => (
            <div className="ltp-review" key={i}>
              <div>
                <b>{review.name}</b>
                <small>{review.date}</small>
              </div>
              <p
                className="text-amber-500"
                aria-label={review.rating + " out of 5 stars"}
              >
                {"★".repeat(review.rating)}
              </p>
              <p>{review.text}</p>
            </div>
          ))
        ) : (
          <p>No written reviews available.</p>
        )}
      </section>
    </article>
  );
}
