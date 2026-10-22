import { savedService } from "../../../services/savedTutors.js";
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
import { useEffect, useState } from "react";
import {
  listTutorReviews,
  getTutorCompletedSessions,
} from "../../../services/tutorReviews.js";
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
  savedFor = () => false,
  savingFor = () => false,
  saving = false,
  onSave,
  onMessage,
  onBook,
}) {
  const t = tutorProfile(record);
  const tutorId = t.tutorProfileId || t.id;
  const [reviews, setReviews] = useState({ entries: [], count: 0, average: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [retry, setRetry] = useState(0);
  const [completedCount, setCompletedCount] = useState(null);
  const [completedError, setCompletedError] = useState("");
  useEffect(() => {
    let active = true,
      inFlight = false;
    setCompletedCount(null);
    setCompletedError("");
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const count = await getTutorCompletedSessions(tutorId);
        if (active) {
          setCompletedCount(count);
          setCompletedError("");
        }
      } catch (error) {
        if (active) setCompletedError(error.message);
      } finally {
        inFlight = false;
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    window.addEventListener("campustutor:sessions-changed", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener("campustutor:sessions-changed", load);
    };
  }, [tutorId, retry]);
  useEffect(() => {
    let active = true,
      inFlight = false;
    setReviewsLoading(true);
    setReviews({ entries: [], count: 0, average: 0 });
    setReviewsError("");
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await listTutorReviews(tutorId);
        if (active) {
          setReviews(result);
          setReviewsError("");
        }
      } catch (error) {
        if (active) setReviewsError(error.message);
      } finally {
        inFlight = false;
        if (active) setReviewsLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [tutorId, retry]);
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
              {reviews.count
                ? reviews.average.toFixed(1)
                : reviewsLoading
                  ? t.rating || "Not rated"
                  : "Not rated"}
              {reviews.count > 0 && ` (${reviews.count} reviews)`}
            </span>
            {
              <span>
                <Check size={14} />
                {completedError
                  ? "Session count unavailable"
                  : completedCount == null
                    ? "Loading completed sessions..."
                    : `${completedCount} completed session${completedCount === 1 ? "" : "s"}`}
              </span>
            }
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
          {[
            ...new Set(
              t.services
                .flatMap((service) => [service.name, service.subtitle])
                .filter(Boolean),
            ),
          ].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
      </section>
      <section>
        <h4>Services and topics</h4>
        <div className="ltp-services">
          {t.services.map((service) => {
            const serviceReviews = reviews.entries.filter((review) =>
              review.serviceId
                ? String(review.serviceId) === String(service.id)
                : review.service === service.name,
            );
            const serviceRating = serviceReviews.length
              ? serviceReviews.reduce((sum, review) => sum + review.rating, 0) /
                serviceReviews.length
              : null;
            return (
              <div className="ltp-service" key={service.id || service.name}>
                <div>
                  <strong>{service.name}</strong>
                  <small>
                    {service.subtitle || service.category || t.category}
                  </small>
                  <small>
                    Session type:{" "}
                    {service.type === "Both"
                      ? "Online / In-person"
                      : service.type || "Not provided"}
                  </small>
                  <small>
                    <Star size={13} className="inline text-amber-500" />{" "}
                    {reviewsLoading
                      ? "Loading rating..."
                      : reviewsError
                        ? "Rating unavailable"
                        : serviceRating != null
                          ? serviceRating.toFixed(1) +
                            " / 5 (" +
                            serviceReviews.length +
                            " reviews)"
                          : "No ratings yet"}
                  </small>
                  <b>
                    {service.rate || t.rate
                      ? `₱${service.rate || t.rate} / hour`
                      : "Rate unavailable"}
                  </b>
                  <button
                    className={button}
                    onClick={() => onBook(savedService(t, service))}
                  >
                    Book this service
                  </button>
                  {service.id && (
                    <button
                      className={button}
                      disabled={saving || savingFor(savedService(t, service))}
                      aria-pressed={savedFor(savedService(t, service))}
                      onClick={() => onSave(savedService(t, service))}
                    >
                      <Bookmark
                        size={15}
                        fill={
                          savedFor(savedService(t, service))
                            ? "#087542"
                            : "none"
                        }
                      />
                      {savedFor(savedService(t, service))
                        ? "Saved"
                        : "Save service"}
                    </button>
                  )}
                </div>
                <div className="ltp-topics">
                  {chips(service.topics).map((topic) => (
                    <span key={topic}>{topic}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
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
        {completedError && (
          <p role="alert" className="text-red-700">
            {completedError}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry
            </button>
          </p>
        )}
        {reviewsLoading && <p role="status">Loading ratings and reviews...</p>}
        {reviewsError && (
          <p role="alert" className="text-red-700">
            {reviewsError}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry
            </button>
          </p>
        )}
        {!reviewsLoading && !reviewsError && reviews.count > 0 && (
          <p className="ltp-review-summary">
            <Star size={18} className="text-amber-500 fill-amber-500" />{" "}
            <strong>{reviews.average.toFixed(1)} / 5</strong> · {reviews.count}{" "}
            review{reviews.count === 1 ? "" : "s"}
          </p>
        )}
        {!reviewsError && reviews.entries.length
          ? reviews.entries.map((review) => (
              <div className="ltp-review" key={review.id}>
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
                <small>
                  {[review.service, review.topic].filter(Boolean).join(" · ")}
                </small>
              </div>
            ))
          : !reviewsLoading &&
            !reviewsError && <p>No ratings or written reviews yet.</p>}
      </section>
    </article>
  );
}
