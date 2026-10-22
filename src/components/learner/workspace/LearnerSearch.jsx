import { savedService } from "../../../services/savedTutors.js";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { listDiscoverableTutors } from "../../../services/tutorServices.js";
import { useLearnerWorkspace } from "./LearnerWorkspace.jsx";
import { learnerNav } from "../learnerNavigation.js";

export default function LearnerSearch({ go }) {
  const work = useLearnerWorkspace();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const rows = await listDiscoverableTutors();
        if (active) {
          setTutors(rows);
          setError("");
        }
      } catch (error) {
        if (active) setError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const timer = window.setInterval(load, 30000);
    window.addEventListener("campustutor:services-changed", load);
    window.addEventListener("focus", load);
    document.addEventListener("pointerdown", close);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("campustutor:services-changed", load);
      window.removeEventListener("focus", load);
      document.removeEventListener("pointerdown", close);
    };
  }, []);
  const select = (action) => {
    action();
    setQuery("");
    setOpen(false);
  };
  const results = [
    ...learnerNav.map(([id, label]) => ({
      label,
      kind: "Section",
      action: () => go(id),
    })),
    {
      label: "Apply as Tutor",
      kind: "Section",
      action: () => go("application"),
    },
    ...tutors.flatMap((tutor) =>
      tutor.services.map((service) => ({
        label: [
          tutor.name,
          service.name,
          service.subtitle,
          ...(service.topics || []),
        ]
          .filter(Boolean)
          .join(" - "),
        kind: "Tutor / Subject",
        action: () => work.open("profile", savedService(tutor, service)),
      })),
    ),
    ...work.data.saved.map((tutor) => ({
      label: [
        tutor.name,
        tutor.subjects,
        ...(tutor.services || []).map((service) => service.name),
      ]
        .filter(Boolean)
        .join(" - "),
      kind: "Saved Tutor",
      action: () => work.open("profile", tutor),
    })),
    ...work.data.sessions.map((session) => ({
      label: [
        session.name,
        session.course,
        session.subject,
        session.topic,
        session.date,
        session.status,
      ]
        .filter(Boolean)
        .join(" - "),
      kind: "Session",
      action: () => work.open("details", session),
    })),
  ].filter((result) =>
    result.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <form
      ref={ref}
      className="relative w-full max-w-lg"
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim())
          select(() => go("find-tutor", { query: query.trim() }));
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <input
        type="search"
        aria-label="Search tutors, subjects, topics, sessions, or sections"
        placeholder="Search tutors, subjects, topics, or sessions..."
        className="h-8 w-full rounded-md border border-slate-200 pl-3 pr-9 text-xs"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
      />
      <button aria-label="Search" className="absolute right-2 top-1.5">
        <Search size={18} />
      </button>
      {open && query.trim() && (
        <div className="absolute mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-white p-2 shadow-lg">
          {loading && (
            <p role="status" className="p-2 text-xs">
              Loading tutors...
            </p>
          )}
          {error && (
            <p role="alert" className="p-2 text-xs text-red-700">
              Could not search tutors: {error}
            </p>
          )}
          {results.slice(0, 12).map((result, index) => (
            <button
              key={index}
              type="button"
              className="block w-full rounded p-2 text-left text-xs hover:bg-green-50"
              onClick={() => select(result.action)}
            >
              <span className="block text-[10px] text-slate-500">
                {result.kind}
              </span>
              {result.label}
            </button>
          ))}
          {!loading && !results.length && (
            <p className="p-2 text-xs">No matching results.</p>
          )}
          <button
            type="submit"
            className="block w-full border-t p-2 text-left text-xs font-semibold text-green-800"
          >
            Search all tutors for &quot;{query.trim()}&quot;
          </button>
        </div>
      )}
    </form>
  );
}
