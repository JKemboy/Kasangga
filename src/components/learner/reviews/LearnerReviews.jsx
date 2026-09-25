import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
import { useState } from "react";
import { sortReviews } from "./reviewFilters.js";
import {
  BarChart3,
  ChevronDown,
  Eye,
  Pencil,
  PenLine,
  Star,
} from "lucide-react";

const reviews = [
  [
    "Maria Angelica R.",
    "BS Physics",
    "Calculus 1 - Derivatives",
    "5.0",
    5,
    "“Excellent tutor! Explained the concepts clearly and made difficult topics easy to understand. Very patient and professional.”",
    "May 21, 2026",
    "May 20, 2026",
    "MA",
  ],
  [
    "John Michael P.",
    "BS Mathematics",
    "Statistics - Probability",
    "4.0",
    4,
    "“Great discussion and very organized session. Helped me a lot with my midterm preparation. Could improve the time management but overall, a great tutor!”",
    "May 18, 2026",
    "May 17, 2026",
    "JM",
  ],
  [
    "Janine Claire T.",
    "BS English",
    "English, Essay Writing",
    "5.0",
    5,
    "“Very helpful tips and feedback on my essay. Improved my writing skills a lot! Highly recommended.”",
    "May 15, 2026",
    "May 14, 2026",
    "JC",
  ],
];

const Summary = ({ icon: Icon, value, title, detail, color }) => (
  <section className="flex items-center gap-3 rounded-xl border border-[#e1e7ef] bg-white p-3">
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${color}`}
    >
      <Icon className="h-6 w-6 text-white" />
    </span>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs text-[#637191]">{detail}</p>
    </div>
  </section>
);

// No completed sessions awaiting a review are supplied by the current sample data.
const pendingReviews = [];
const PAGE_SIZE = 3;

export default function LearnerReviews() {
 const work=useLearnerWorkspace();
 const original=reviews;
 const rows=original.map(row=>{const stored=work.data.reviews.find(r=>r.sessionId===`${row[0]}:${row[6]}`);return stored?[row[0],row[1],row[2],String(stored.rating),stored.rating,stored.text,row[6],stored.date.slice(0,10),row[8]]:row;});
  const [activeTab, setActiveTab] = useState("Submitted");
  const [sort, setSort] = useState("recent");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const selectedReviews = activeTab === "Submitted" ? rows : pendingReviews;
  const sortedReviews = sortReviews(selectedReviews, sort);
  const visibleReviews = sortedReviews.slice(0, visibleCount);
  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, review) => sum + Number(review[3]), 0) /
        reviews.length
      ).toFixed(1)
    : "0.0";

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        My Reviews
      </h1>
      <p className="mt-1 text-xs font-medium text-[#173a9b]">
        Manage the reviews you’ve given to your tutors and leave reviews for
        your completed sessions.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Summary
          icon={Star}
          value={reviews.length}
          title="Total Reviews"
          detail="Tutors you have reviewed"
          color="bg-[#ffb800]"
        />
        <Summary
          icon={BarChart3}
          value={averageRating}
          title="Average Rating Given"
          detail="Based on your reviews"
          color="bg-[#29a45b]"
        />
        <Summary
          icon={PenLine}
          value={pendingReviews.length}
          title="Pending Reviews"
          detail="Completed sessions not yet reviewed"
          color="bg-[#4b84f5]"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-b border-[#dfe5ed]">
        <nav
          aria-label="Review status"
          className="flex gap-4 text-xs font-semibold"
        >
          {["Submitted", "Pending"].map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={activeTab === tab}
              onClick={() => {
                setActiveTab(tab);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`border-b-2 pb-2 ${activeTab === tab ? "border-[#087542] text-[#087542]" : "border-transparent text-[#173a9b]"}`}
            >
              {tab} Reviews (
              {tab === "Submitted" ? reviews.length : pendingReviews.length})
            </button>
          ))}
        </nav>
        <label className="mb-2">
          <span className="sr-only">Sort reviews</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="h-8 rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-semibold"
          >
            <option value="recent">Sort by: Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="name">Tutor Name: A to Z</option>
          </select>
        </label>
      </div>
      <h2 className="mt-3 text-sm font-bold">Your {activeTab} Reviews</h2>
      {visibleReviews.length === 0 && (
        <p
          role="status"
          className="mt-2 rounded-xl border border-[#e0e7f0] bg-white p-6 text-center text-sm text-[#637191]"
        >
          {activeTab === "Pending"
            ? "No completed sessions are awaiting your review."
            : "You haven't submitted any reviews yet."}
        </p>
      )}
      <div className="mt-2 space-y-2">
        {visibleReviews.map(
          ([
            name,
            program,
            topic,
            rating,
            stars,
            review,
            date,
            reviewed,
            initials,
          ]) => (
            <article
              key={name}
              className="grid items-center gap-3 rounded-xl border border-[#e0e7f0] bg-white p-3 text-xs [&>div]:min-w-0 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.8fr)_115px_120px]"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-bold text-[#405276]">
                  {initials}
                </span>
                <div>
                  <h3 className="text-sm font-bold">{name}</h3>
                  <p className="mt-1 text-xs text-blue-700">{program}</p>
                  <p className="mt-1 text-xs">
                    Topic: <b>{topic}</b>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`mr-0.5 inline h-4 w-4 ${n <= stars ? "fill-[#ffb800] text-[#ffb800]" : "fill-slate-200 text-slate-200"}`}
                    />
                  ))}{" "}
                  <span className="ml-2">{rating}</span>
                </p>
                <p className="mt-1 text-xs leading-4 text-[#637191]">
                  {review}
                </p>
              </div>
              <div className="border-l border-[#e1e7ef] pl-3">
                <p className="font-bold">{date}</p>
                <p className="mt-2 text-xs text-[#637191]">
                  Reviewed on {reviewed}
                </p>
              </div>
              <div className="grid gap-2">
                <button onClick={()=>work.open("review",{id:name+":"+date,name,subject:topic,date,lifecycle:"Completed"})} className="h-8 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]">
                  <Pencil className="mr-2 inline h-4 w-4" />
                  Edit Review
                </button>
                <button onClick={()=>work.open("details",{id:name+":"+date,name,subject:topic,date,lifecycle:"Completed"})} className="h-8 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]">
                  <Eye className="mr-2 inline h-4 w-4" />
                  View Session
                </button>
              </div>
            </article>
          ),
        )}
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-[#637191]">
        Showing {visibleReviews.length} of {selectedReviews.length}{" "}
        {activeTab.toLowerCase()} reviews
      </p>
      {visibleCount < sortedReviews.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          className="mx-auto mt-3 flex h-8 items-center gap-3 rounded-md border border-[#dfe5ed] px-3 text-xs font-semibold"
        >
          View More Reviews
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
