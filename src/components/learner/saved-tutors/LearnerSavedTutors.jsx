import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
import { useState } from "react";
import { filterSavedTutors } from "./savedTutorFilters.js";
import {
  BadgeCheck,
  BookMarked,
  BookOpen,
  CalendarDays,
  Clock3,
  Search,
  Star,
} from "lucide-react";

const tutors = [
  [
    "Maria Angelica R.",
    "BS Physics",
    "Calculus, Physics, Mechanics",
    "4.8",
    "96 reviews",
    "₱400",
    "Available Today",
    "MA",
    true,
  ],
  [
    "John Michael P.",
    "BS Mathematics",
    "Statistics, Probability, Algebra",
    "4.9",
    "128 reviews",
    "₱350",
    "Available Tomorrow",
    "JM",
    true,
  ],
  [
    "Janine Claire T.",
    "BS English",
    "English, Essay Writing, Grammar",
    "4.7",
    "82 reviews",
    "₱300",
    "Last seen 2 hours ago",
    "JC",
    false,
  ],
  [
    "Allen Ezra M.",
    "BS Information Technology",
    "Programming (Python), Web Dev.",
    "4.6",
    "71 reviews",
    "₱450",
    "Available This Week",
    "AE",
    true,
  ],
];

const subjectOptions = [
  ...new Set(
    tutors.flatMap((tutor) =>
      tutor[2].split(",").map((subject) => subject.trim()),
    ),
  ),
].sort();
const availabilityOptions = [...new Set(tutors.map((tutor) => tutor[6]))];

export default function LearnerSavedTutors() {
  const work=useLearnerWorkspace();
  const tutors=work.data.saved.map(t=>[t.name,t.degree||"",t.subjects||"",t.rating||0,"",t.price||t.rate||"","Availability not connected",t.name.split(" ").map(n=>n[0]).slice(0,2).join(""),false]);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("recent");
  const visibleTutors = filterSavedTutors(tutors, {
    query,
    subject,
    availability,
    sort,
  });
  const hasFilters =
    query !== "" || subject !== "all" || availability !== "all";
  const clearFilters = () => {
    setQuery("");
    setSubject("all");
    setAvailability("all");
  };

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
            Saved Tutors
          </h1>
          <p className="mt-1 text-xs font-medium text-[#173a9b]">
            View and manage the tutors you’ve saved for future sessions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#effaf3] px-3 py-2 text-xs text-[#075d34]">
          <BookMarked className="h-5 w-5 fill-[#087542] text-[#087542]" />
          <span>
            <b className="block">Your saved tutors are only visible to you.</b>
            <span className="text-[#566584]">
              You can remove a tutor anytime.
            </span>
          </span>
        </div>
      </div>
      <div className="mt-3 grid sm:grid-cols-2 gap-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <label className="relative">
          <span className="sr-only">Search saved tutors</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tutor details..."
            className="h-9 w-full rounded-md border border-[#dfe5ed] px-9 text-xs outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#566584]" />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filter by subject</span>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="h-9 w-full rounded-md border border-[#dfe5ed] bg-white px-3 text-xs"
          >
            <option value="all">All Subjects</option>
            {subjectOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filter by availability</span>
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            className="h-9 w-full rounded-md border border-[#dfe5ed] bg-white px-3 text-xs"
          >
            <option value="all">All Availability</option>
            <option value="online">Online Now</option>
            <option value="offline">Offline</option>
            {availabilityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Sort saved tutors</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-9 w-full rounded-md border border-[#dfe5ed] bg-white px-3 text-xs"
          >
            <option value="recent">Sort by: Recently Saved</option>
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-base font-medium text-[#173a9b]">
          Showing {visibleTutors.length} of {tutors.length} saved tutors
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-[#087542]"
          >
            Clear filters
          </button>
        )}
      </div>
      {visibleTutors.length === 0 && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#e0e7f0] bg-white p-6 text-center text-sm text-[#637191]"
        >
          No saved tutors match your search and filters. Try different details
          or clear the filters.
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {visibleTutors.map(
          ([
            name,
            degree,
            subjects,
            rating,
            reviews,
            price,
            available,
            initials,
            online,
          ]) => (
            <article
              key={name}
              className="relative rounded-xl border border-[#e0e7f0] bg-white px-3 pb-3 pt-8 text-center"
            >
              <span
                className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${online ? "bg-[#dff8e8] text-[#087542]" : "bg-slate-100 text-slate-500"}`}
              >
                • {online ? "Online" : "Offline"}
              </span>
              <button
                type="button"
                aria-label={`Remove ${name} from saved tutors`} onClick={()=>work.toggleSave({name})}
                className="absolute right-2 top-2 text-[#087542]"
              >
                <BookMarked className="h-5 w-5 fill-[#087542]" />
              </button>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#e5e7eb,#cbd5e1)] text-xl font-bold text-[#405276]">
                {initials}
              </div>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs font-semibold text-[#087542]">
                <BadgeCheck className="h-4 w-4" />
                Verified
              </span>
              <h2 className="mt-2 text-base font-bold">{name}</h2>
              <p className="text-xs text-[#637191]">{degree}</p>
              <p className="mt-1 min-h-8 text-xs leading-4 text-[#405276]">
                <BookOpen className="mr-2 inline h-4 w-4 text-blue-600" />
                {subjects}
              </p>
              <p className="mt-1.5 text-xs text-[#637191]">
                <Star className="mr-1 inline h-4 w-4 fill-[#ffb800] text-[#ffb800]" />
                {rating} ({reviews})
              </p>
              <p className="mt-1.5 text-base font-bold text-[#087542]">
                {price}
                <span className="font-normal text-[#637191]"> / hour</span>
              </p>
              <p className="mt-1.5 text-xs font-medium text-[#087542]">
                {online ? (
                  <CalendarDays className="mr-2 inline h-4 w-4" />
                ) : (
                  <Clock3 className="mr-2 inline h-4 w-4 text-[#637191]" />
                )}
                {available}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={()=>work.open("profile",{name,degree,subjects,rating,price})} className="h-8 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]">
                  View Profile
                </button>
                <button onClick={()=>work.open("book",{name,degree,subjects,rating,price})} className="h-8 rounded-md bg-[#087542] text-xs font-semibold text-white">
                  Book Now
                </button>
              </div>
            </article>
          ),
        )}
      </div>
      <section className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-[linear-gradient(145deg,#effaf3,#f8fdf9)] px-3 py-3 text-center sm:text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dff8e8] text-[#087542]">
          <BookMarked className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold">
            {hasFilters ? "Explore more tutors" : "No more saved tutors"}
          </h2>
          <p className="mt-1 text-xs text-[#637191]">
            Explore more tutors and save them for easy access later.
          </p>
        </div>
        <button onClick={()=>work.go("find-tutor")} className="h-8 shrink-0 rounded-md border border-[#15924f] px-3 text-xs font-semibold text-[#087542]">
          Find a Tutor
        </button>
      </section>
    </section>
  );
}
