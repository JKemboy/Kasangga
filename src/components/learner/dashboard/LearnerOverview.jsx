// Learner dashboard summary: fetches discoverable tutors, applies recommendations, and links metrics to learner sections.
import { savedService } from "../../../services/savedTutors.js";
import { courseRecommendations } from "../../../services/tutorRecommendations.js";
import { listDiscoverableTutors } from "../../../services/tutorServices.js";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { useEffect, useState } from "react";
import { Users, CalendarDays, Bookmark, Star, Heart } from "lucide-react";
import { button, primary, input } from "../../tutor/workspace/ui.jsx";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import "./overview.css";

export default function LearnerOverview({ go }) {
  const work = useLearnerWorkspace();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("relevance");

  useEffect(() => {
    let active = true;
    let request = 0;

    async function load() {
      const current = ++request;
      setLoading(true);
      setError("");
      try {
        const records = await listDiscoverableTutors();
        if (active && current === request) setTutors(records);
      } catch (loadError) {
        if (active && current === request) setError(loadError.message);
      } finally {
        if (active && current === request) setLoading(false);
      }
    }

    load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [retry]);

  const categories = {
    STEM: ["Mathematics", "Science"],
    "IT & Computer Science": ["Computer Science"],
    Others: ["Other"],
  };
  const program = work.data.profile.program || "";
  const recommended = courseRecommendations(tutors, program);
  const rows = recommended
    .flatMap((t) =>
      t.courseServices.map((service) =>
        savedService({ ...t, courseServices: [service] }, service),
      ),
    )
    .filter((tutor) =>
      tutor.courseServices.some(
        (service) =>
          (!subject ||
            [service.name, service.subtitle, ...service.topics]
              .join(" ")
              .toLowerCase()
              .includes(subject.toLowerCase())) &&
          (!category ||
            (categories[category] || [category]).includes(service.category)),
      ),
    )
    .sort((a, b) =>
      sort === "rate"
        ? a.rate - b.rate
        : sort === "rating"
          ? b.rating - a.rating
          : b.courseScore - a.courseScore || b.rating - a.rating,
    );

  function toggle(tutor) {
    work.toggleSave(tutor);
  }

  return (
    <section className="lo-overview">
      <h1>Welcome back! 👋</h1>
      <p>Let's continue your learning journey.</p>
      <div className="lo-metrics">
        {[
          [Users, tutors.length, "Available Tutors", () => go("find-tutor")],
          [CalendarDays, "View", "Upcoming Sessions", () => go("sessions")],
          [
            Bookmark,
            work.data.saved.length,
            "Saved Tutors",
            () => go("saved-tutors"),
          ],
          [Star, "Not rated", "Average Tutor Rating", () => go("reviews")],
        ].map(([Icon, value, label, action], index) => (
          <button key={label} onClick={action}>
            <Icon className={index % 2 ? "gold" : ""} />
            <span>
              <b>{loading && index === 0 ? "…" : value}</b>
              <small>{label}</small>
            </span>
          </button>
        ))}
      </div>

      <section className="lo-panel">
        <h2>Find the perfect tutor for you</h2>
        <div className="lo-filters">
          <label>
            Subject
            <select
              className={input}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              <option value="">All Subjects</option>
              {[
                ...new Set(
                  tutors.flatMap((tutor) => tutor.subjects.split(", ")),
                ),
              ]
                .filter(Boolean)
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </label>
          <label>
            Level
            <select className={input} defaultValue="College" disabled>
              <option>College</option>
            </select>
          </label>
          <label>
            Availability
            <select className={input} defaultValue="All Availability" disabled>
              <option>All Availability</option>
            </select>
          </label>
          <label>
            Sort by
            <select
              className={input}
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="relevance">Course Relevance</option>
              <option value="rating">Highest Rated</option>
              <option value="rate">Lowest Rate</option>
            </select>
          </label>
        </div>
        <p>Popular Subjects</p>
        <div className="lo-chips">
          {[
            "Programming",
            "Calculus",
            "Physics",
            "Chemistry",
            "Statistics",
            "Accounting",
            "English",
            "Filipino",
          ].map((value) => (
            <button
              className={button}
              aria-pressed={subject === value}
              key={value}
              onClick={() => setSubject(subject === value ? "" : value)}
            >
              {value}
            </button>
          ))}
        </div>
        <p>Tutor Categories</p>
        <div className="lo-chips">
          {[
            "STEM",
            "IT & Computer Science",
            "Business",
            "Languages",
            "Education",
            "Others",
          ].map((value) => (
            <button
              className={button}
              aria-pressed={category === value}
              key={value}
              onClick={() => setCategory(category === value ? "" : value)}
            >
              {value}
            </button>
          ))}
          <button
            className={button}
            onClick={() => {
              setSubject("");
              setCategory("");
            }}
          >
            Reset
          </button>
        </div>
      </section>

      <div className="lo-title">
        <h2>Recommended Tutors</h2>
        <button className={button} onClick={() => go("find-tutor")}>
          View all tutors →
        </button>
      </div>
      <p className="text-sm text-slate-600">
        {program
          ? `Services related to your program: ${program}`
          : "Add your course/program in your profile to get relevant tutor recommendations."}
      </p>
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
              <button
                className="lo-save"
                aria-label={`Save ${tutor.name}`}
                aria-pressed={work.isSaved(tutor)}
                disabled={work.savedLoading || work.isSaving(tutor)}
                onClick={() => toggle(tutor)}
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
                {tutor.courseServices.map((service) => service.name).join(", ")}
              </p>
              <span className="text-amber-500">
                ★ {tutor.rating || "No ratings yet"}
              </span>
              <strong>₱{tutor.rate.toLocaleString()} / hour</strong>
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
        <p>
          No course-related services match your current profile and filters. You
          can explore all services in Find a Tutor.{" "}
          {(subject || category) && (
            <button
              className="underline"
              onClick={() => {
                setSubject("");
                setCategory("");
              }}
            >
              Reset filters
            </button>
          )}
        </p>
      )}
      <p className="lo-help">
        Live tutor profiles and services are loaded from the database.
      </p>
    </section>
  );
}
