import { savedService } from "../../../services/savedTutors.js";
import { listDiscoverableTutors } from "../../../services/tutorServices.js";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import { useState, useEffect } from "react";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import {
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  GraduationCap,
  Grid2X2,
  List,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";

const Select = ({ label, value, onChange, options = [] }) => (
  <label className="block text-xs font-semibold">
    <span>{label}</span>
    <span className="relative mt-1.5 block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-normal text-[#637191] outline-none"
      >
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#405276]" />
    </span>
  </label>
);

export default function LearnerFindTutor() {
  const work = useLearnerWorkspace();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true,
      request = 0;
    async function load() {
      const current = ++request;
      setLoading(true);
      setError("");
      try {
        const records = await listDiscoverableTutors();
        if (active && current === request) setTutors(records);
      } catch (err) {
        if (active && current === request) setError(err.message);
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
  const [subject, setSubject] = useState("All Subjects"),
    [level, setLevel] = useState("All Levels"),
    [availability, setAvailability] = useState("All Availability"),
    [sort, setSort] = useState("Highest Rated"),
    [category, setCategory] = useState(""),
    [list, setList] = useState(false);
  const categories = {
    STEM: ["Mathematics", "Science"],
    "IT & Computer Science": ["Computer Science"],
    Others: ["Other"],
  };
  const rows = tutors
    .flatMap((tutor) => tutor.services.map((service) => ({ tutor, service })))
    .filter(
      ({ service: s }) =>
        (subject === "All Subjects" ||
          [s.name, s.subtitle, ...s.topics]
            .join(" ")
            .toLowerCase()
            .includes(subject.toLowerCase())) &&
        (level === "All Levels" ||
          s.level === level ||
          s.level === "All Levels") &&
        (availability === "All Availability" ||
          s.type === availability ||
          s.type === "Both") &&
        (!category ||
          (categories[category] || [category]).includes(s.category)),
    )
    .sort((a, b) =>
      sort === "Lowest Rate"
        ? a.service.rate - b.service.rate
        : (b.tutor.rating || 0) - (a.tutor.rating || 0),
    );
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Find a Tutor
      </h1>
      <p className="mt-1 text-xs font-medium text-[#566aa3]">
        Discover verified CSU student tutors and find the perfect match for your
        learning goals.
      </p>
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-[linear-gradient(100deg,#e9f8ef,#f1faf5)] px-3 py-2">
        <ShieldCheck className="h-6 w-6 shrink-0 text-[#087542]" />
        <div>
          <p className="font-bold text-[#087542]">Verified Tutors</p>
          <p className="text-xs text-[#405276]">
            All tutors have undergone credential verification to ensure a safe
            and reliable learning experience.
          </p>
        </div>
      </div>
      <section className="mt-1 rounded-xl border border-[#e0e7f0] bg-white p-2">
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          <Select
            label="Subject"
            value={subject}
            onChange={setSubject}
            options={[
              ...new Set([
                "All Subjects",
                subject,
                ...tutors.flatMap((t) => t.services.map((s) => s.subtitle)),
              ]),
            ]}
          />
          <Select
            label="Level"
            value={level}
            onChange={setLevel}
            options={["All Levels", "College"]}
          />
          <Select
            label="Session Type"
            value={availability}
            onChange={setAvailability}
            options={["All Availability", "Online", "In-person"]}
          />
          <Select
            label="Sort By"
            value={sort}
            onChange={setSort}
            options={["Highest Rated", "Lowest Rate"]}
          />
        </div>
        <p className="mt-1 text-xs font-semibold">Popular Subjects</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {[
            "Programming",
            "Calculus",
            "Physics",
            "Chemistry",
            "Statistics",
            "Accounting",
            "English",
            "More",
          ].map((item) => (
            <button
              key={item}
              onClick={() =>
                setSubject(
                  item === "More" || subject === item ? "All Subjects" : item,
                )
              }
              aria-pressed={subject === item}
              type="button"
              className="h-7 rounded-md border border-[#e1e7ef] px-2 text-xs hover:bg-slate-50"
            >
              {item}
              {item === "More" && (
                <ChevronDown className="ml-3 inline h-4 w-4" />
              )}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs font-semibold">Tutor Categories</p>
        <div className="mt-1 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            [FlaskConical, "STEM"],
            [GraduationCap, "IT & Computer Science"],
            [BriefcaseBusiness, "Business"],
            [MessageCircle, "Languages"],
            [BookOpen, "Education"],
            [Grid2X2, "Others"],
          ].map(([Icon, label]) => (
            <button
              key={label}
              onClick={() => setCategory(category === label ? "" : label)}
              aria-pressed={category === label}
              type="button"
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#e1e7ef] px-2 py-1 text-xs hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 shrink-0 text-[#087542]" />
              {label}
            </button>
          ))}
        </div>
      </section>
      {loading && (
        <p role="status" className="mt-3 text-sm">
          Loading tutors...
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)} className="underline">
            Retry
          </button>
        </p>
      )}
      {!loading && !error && !tutors.length && (
        <p className="mt-3 text-sm">
          No verified tutors with active services are available yet.
        </p>
      )}
      {!loading && !error && tutors.length > 0 && !rows.length && (
        <p className="mt-3 text-sm">No services match your filters.</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-bold">{rows.length} services found</p>
        <div className="flex items-center gap-2 text-xs text-[#637191]">
          View{" "}
          <button
            aria-label="Grid view"
            onClick={() => setList(false)}
            className="grid h-7 w-8 place-items-center rounded-md bg-[#087542] text-white"
          >
            <Grid2X2 className="h-5 w-5" />
          </button>
          <button
            aria-label="List view"
            onClick={() => setList(true)}
            className="grid h-7 w-8 place-items-center rounded-md border border-[#dfe5ed]"
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        className={
          list
            ? "mt-1 grid gap-2"
            : "mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {rows.map(({ tutor, service }) => {
          const { name, degree, rating } = tutor;
          const bookmark = savedService(tutor, service);
          return (
            <article
              key={service.id}
              className="relative rounded-xl border border-[#e0e7f0] bg-white px-3 pb-2 pt-6 text-center"
            >
              <span className="absolute left-2 top-2 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs text-[#087542]">
                {service.type === "Both" ? "Online / In-person" : service.type}
              </span>
              <button
                type="button"
                aria-label={`Save ${name}`}
                aria-pressed={work.isSaved(bookmark)}
                disabled={work.savedLoading || work.isSaving(bookmark)}
                onClick={() => work.toggleSave(bookmark)}
                className="absolute right-2 top-2 text-[#087542]"
              >
                <BookOpen
                  className="h-4 w-4"
                  fill={work.isSaved(bookmark) ? "#087542" : "none"}
                />
              </button>
              <PortalAvatar
                name={name}
                userId={tutor.avatarUserId}
                className="mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#e5e7eb,#cbd5e1)] text-base font-bold text-[#405276]"
              />
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs font-semibold text-[#087542]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </div>
              <h2 className="mt-2 text-sm font-bold">{service.name}</h2>
              <p className="mt-1 text-xs font-semibold">{name}</p>
              <p className="text-xs text-[#566584]">{degree}</p>
              <p className="mt-1 min-h-7 text-xs leading-4 text-[#637191]">
                {service.subtitle}
              </p>
              <p className="mt-1 text-xs text-[#637191]">
                <Star className="mr-1 inline h-4 w-4 fill-[#ffb800] text-[#ffb800]" />
                {rating || "No ratings yet"}
              </p>
              <p className="mt-1 text-sm font-bold text-[#087542]">
                {"\u20b1"}
                {service.rate.toLocaleString()}
                <span className="font-normal text-[#637191]"> / hour</span>
              </p>
              <p className="my-2 text-xs text-slate-500">
                {service.category} / {service.level}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => work.open("profile", tutor)}
                  className="h-7 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() =>
                    work.open("book", {
                      ...tutor,
                      selectedService: service.name,
                    })
                  }
                  className="h-7 rounded-md bg-[#087542] text-xs font-semibold text-white"
                >
                  Book Now
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {(!rows.length || subject !== "All Subjects" || category) && (
        <button
          className="mt-2 text-xs text-green-800"
          onClick={() => {
            setSubject("All Subjects");
            setCategory("");
            setLevel("All Levels");
            setAvailability("All Availability");
          }}
        >
          Reset Filters
        </button>
      )}
    </section>
  );
}
