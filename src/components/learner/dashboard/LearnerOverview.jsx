// Learner dashboard overview: live tutor recommendations and account-linked shortcuts.
import { useEffect, useState } from "react";
import { CalendarDays, Bookmark, Star } from "lucide-react";

import { courseRecommendations } from "../../../services/tutorRecommendations.js";
import { listDiscoverableTutors } from "../../../services/tutorServices.js";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { button } from "../../tutor/workspace/ui.jsx";
import TutorServiceCard from "../find-tutors/TutorServiceCard.jsx";
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
  const rows = recommended.flatMap((tutor) =>
    tutor.courseServices.map((service) => ({ tutor, service })),
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
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back
          {work.data.profile.name ? `, ${work.data.profile.name}` : ""}!
        </h1>
        <p className="mt-1">Find a tutor and continue your learning journey.</p>
      </header>
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
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]">
          {rows.slice(0, 4).map(({ tutor, service }) => (
            <TutorServiceCard
              key={service.id}
              tutor={tutor}
              service={service}
            />
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
