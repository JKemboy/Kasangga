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
                <div className="ltp-service-heading">
                  <strong>{service.name}</strong>
                  {service.id && (
                    <button
                      type="button"
                      className="ltp-service-save"
                      disabled={saving || savingFor(savedService(t, service))}
                      aria-label={
                        savedFor(savedService(t, service))
                          ? "Unsave service"
                          : "Save service"
                      }
                      title={
                        savedFor(savedService(t, service))
                          ? "Unsave service"
                          : "Save service"
                      }
                      aria-pressed={savedFor(savedService(t, service))}
                      onClick={() => onSave(savedService(t, service))}
                    >
                      <Bookmark
                        size={18}
                        fill={
                          savedFor(savedService(t, service))
                            ? "#087542"
                            : "none"
                        }
                      />
                    </button>
                  )}
                </div>
                <div className="ltp-service-meta">
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
                </div>
                <div className="ltp-service-bottom">
                  <div className="ltp-topics">
                    {chips(service.topics).map((topic) => (
                      <span key={topic}>{topic}</span>
                    ))}
                  </div>
                  <div className="ltp-service-booking">
                    <b>
                      {(service.rate ?? t.rate)
                        ? `\u20b1${service.rate ?? t.rate} / hour`
                        : "Rate unavailable"}
                    </b>
                    <button
                      type="button"
                      className={button}
                      onClick={() => onBook(savedService(t, service))}
                    >
                      Book this service
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
                <div className="ltp-review-header">
                  <div className="ltp-review-author">
                    <b>{review.name}</b>
                    {review.service && <small>{review.service}</small>}
                  </div>
                  <small className="ltp-review-date">{review.date}</small>
                </div>
                <p
                  className="ltp-review-stars"
                  aria-label={review.rating + " out of 5 stars"}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={15}
                      aria-hidden="true"
                      className={
                        index < review.rating
                          ? "fill-amber-500 text-amber-500"
                          : "fill-slate-200 text-slate-200"
                      }
                    />
                  ))}
                </p>
                <p>{review.text}</p>
              </div>
            ))
          : !reviewsLoading &&
            !reviewsError && <p>No ratings or written reviews yet.</p>}
      </section>
    </article>
  );
}
