// Learner dashboard overview: live tutor recommendations and account-linked shortcuts.
import { useEffect, useState } from "react";
import { CalendarDays, Bookmark, Star, Heart } from "lucide-react";
import { savedService } from "../../../services/savedTutors.js";
import { courseRecommendations } from "../../../services/tutorRecommendations.js";
import { listDiscoverableTutors } from "../../../services/tutorServices.js";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { button, primary } from "../../tutor/workspace/ui.jsx";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import "./overview.css";

export default function LearnerOverview({ go }) {
  const work = useLearnerWorkspace();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const records = await listDiscoverableTutors();
        if (active) setTutors(records);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("campustutor:services-changed", load);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("campustutor:services-changed", load);
      window.removeEventListener("focus", load);
    };
  }, [retry]);

  const program = work.data.profile.program || "";
  const recommended = courseRecommendations(tutors, program);
  const rows = recommended
    .flatMap((tutor) =>
      tutor.courseServices.map((service) =>
        savedService({ ...tutor, courseServices: [service] }, service),
      ),
    )
    .sort(
      (a, b) =>
        b.courseScore - a.courseScore || (b.rating || 0) - (a.rating || 0),
    );

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const upcomingSessions = work.data.sessions.filter((session) => {
    const startsAt = new Date(session.startAt);
    return (
      session.lifecycle === "Upcoming" &&
      startsAt >= weekStart &&
      startsAt < weekEnd
    );
  }).length;
  const averageRating = work.data.reviews.length
    ? (
        work.data.reviews.reduce(
          (sum, review) => sum + Number(review.rating || 0),
          0,
        ) / work.data.reviews.length
      ).toFixed(1)
    : "—";

  return (
    <section className="lo-overview">
      <div className="lo-metrics">
        {[
          [
            CalendarDays,
            loading ? "…" : upcomingSessions,
            "Upcoming Sessions",
            "This week",
            () => go("sessions"),
          ],
          [
            Bookmark,
            work.data.saved.length,
            "Saved Tutors",
            "View your list",
            () => go("saved-tutors"),
          ],
          [
            Star,
            averageRating,
            "Average Rating",
            "Your sessions",
            () => go("reviews"),
          ],
        ].map(([Icon, value, label, detail, action], index) => (
          <button
            key={label}
            onClick={action}
            className={index !== 1 ? "lo-metric-warm" : ""}
          >
            <Icon className={index === 1 ? "" : "gold"} />
            <span>
              <b>{value}</b>
              <small>{label}</small>
              <small>{detail}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="lo-title">
        <div>
          <h2>Recommended Tutors</h2>
          <p>Highly rated tutors ready to help you succeed.</p>
        </div>
        <button className={button} onClick={() => go("find-tutor")}>
          View all tutors <span aria-hidden="true">›</span>
        </button>
      </div>
      {loading && <p role="status">Loading recommended tutors...</p>}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}{" "}
          <button
            className="underline"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry
          </button>
        </p>
      )}
      {!loading && !error && (
        <div className="lo-tutors">
          {rows.slice(0, 4).map((tutor) => (
            <article key={tutor.serviceId}>
              <span
                className={`lo-status ${(tutor.types || []).includes("Online") ? "online" : "offline"}`}
              >
                •{" "}
                {(tutor.types || []).includes("Online") ? "Online" : "Offline"}
              </span>
              <button
                className="lo-save"
                aria-label={`Save ${tutor.name}`}
                aria-pressed={work.isSaved(tutor)}
                disabled={work.savedLoading || work.isSaving(tutor)}
                onClick={() => work.toggleSave(tutor)}
              >
                <Heart
                  size={18}
                  fill={work.isSaved(tutor) ? "#087542" : "none"}
                />
              </button>
              <PortalAvatar
                name={tutor.name}
                userId={tutor.avatarUserId}
                className="lo-avatar overflow-hidden"
              />
              <h3>{tutor.name}</h3>
              <p>
                {tutor.courseServices
                  .map((service) =>
                    [service.name, service.subtitle]
                      .filter(Boolean)
                      .join(" - "),
                  )
                  .join(", ")}
              </p>
              <span className="lo-rating">
                ★ <span>{tutor.rating || "No ratings yet"}</span>
              </span>
              <strong>
                ₱{tutor.rate.toLocaleString()} <span>/ hour</span>
              </strong>
              <div>
                <button
                  className={button}
                  onClick={() => work.open("profile", tutor)}
                >
                  View Profile
                </button>
                <button
                  className={primary}
                  onClick={() => work.open("book", tutor)}
                >
                  Book Now
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !error && !rows.length && (
        <p className="lo-empty">
          {program
            ? "No recommended tutors are available yet."
            : "Add your course or program to your profile to see relevant tutor recommendations."}{" "}
        </p>
      )}
    </section>
  );
}
