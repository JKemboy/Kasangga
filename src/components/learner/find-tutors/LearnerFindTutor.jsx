import {
  ratingOptions,
  priceOptions,
  matchesRating,
  matchesPrice,
} from "../../../services/tutorFilters.js";
// Find a Tutor: loads published tutor services, supports search/filtering, and opens profile, booking, save, or message actions.
import TutorServiceCard from "./TutorServiceCard.jsx";
import { listDiscoverableTutors } from "../../../services/tutorServices.js";

import { useState, useEffect } from "react";

import { ChevronDown, Grid2X2, List, ShieldCheck } from "lucide-react";

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

export default function LearnerFindTutor({ query = "" }) {
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
  const [subject, setSubject] = useState("All Subjects"),
    [ratingFilter, setRatingFilter] = useState("All Ratings"),
    [availability, setAvailability] = useState("All Availability"),
    [price, setPrice] = useState("All Prices"),
    [list, setList] = useState(false);
  const rows = tutors
    .flatMap((tutor) => tutor.services.map((service) => ({ tutor, service })))
    .filter(
      ({ tutor, service: s }) =>
        (!query.trim() ||
          [
            tutor.name,
            tutor.program,
            s.name,
            s.subtitle,
            s.category,
            ...(s.topics || []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase())) &&
        (subject === "All Subjects" ||
          [s.name, s.subtitle, ...s.topics]
            .join(" ")
            .toLowerCase()
            .includes(subject.toLowerCase())) &&
        matchesRating(tutor.rating, ratingFilter) &&
        matchesPrice(s.rate, price) &&
        (availability === "All Availability" ||
          s.type === availability ||
          s.type === "Both"),
    )
    .sort((a, b) => (b.tutor.rating || 0) - (a.tutor.rating || 0));
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
            label="Session Type"
            value={availability}
            onChange={setAvailability}
            options={["All Availability", "Online", "In-person"]}
          />
          <Select
            label="Ratings"
            value={ratingFilter}
            onChange={setRatingFilter}
            options={ratingOptions}
          />
          <Select
            label="Price"
            value={price}
            onChange={setPrice}
            options={priceOptions}
          />
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
            type="button"
            aria-label="Grid view"
            aria-pressed={!list}
            onClick={() => setList(false)}
            className={`grid h-7 w-8 place-items-center rounded-md border ${!list ? "bg-[#087542] text-white" : "border-[#dfe5ed]"}`}
          >
            <Grid2X2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={list}
            onClick={() => setList(true)}
            className={`grid h-7 w-8 place-items-center rounded-md border ${list ? "bg-[#087542] text-white" : "border-[#dfe5ed]"}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        className={
          list
            ? "mt-1 grid gap-2"
            : "mt-1 grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]"
        }
      >
        {rows.map(({ tutor, service }) => (
          <TutorServiceCard
            key={service.id}
            tutor={tutor}
            service={service}
            list={list}
          />
        ))}
      </div>
      {(subject !== "All Subjects" ||
        ratingFilter !== "All Ratings" ||
        price !== "All Prices" ||
        availability !== "All Availability") && (
        <button
          className="mt-2 text-xs text-green-800"
          onClick={() => {
            setSubject("All Subjects");
            setRatingFilter("All Ratings");
            setPrice("All Prices");
            setAvailability("All Availability");
          }}
        >
          Reset Filters
        </button>
      )}
    </section>
  );
}
