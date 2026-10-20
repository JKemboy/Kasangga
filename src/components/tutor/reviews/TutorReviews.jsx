import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Star,
  ThumbsUp,
} from "lucide-react";
const reviews = [
  [
    "Maria Angela R.",
    "MA",
    5,
    "Calculus 1",
    "Great tutor! Explains concepts clearly and makes lessons easy to understand.",
    "May 13, 2025",
    "May 12, 2025",
    "bg-green-50 text-green-800",
  ],
  [
    "Mark Joseph P.",
    "MJ",
    5,
    "Physics 1",
    "Very patient and knowledgeable. Helped me a lot with problem solving.",
    "May 10, 2025",
    "May 9, 2025",
    "bg-amber-50 text-amber-600",
  ],
  [
    "Rianne Kate L.",
    "RK",
    5,
    "Programming (Python)",
    "I improved a lot in Python because of Sir Juan. Very approachable and helpful!",
    "May 8, 2025",
    "May 7, 2025",
    "bg-purple-50 text-purple-600",
  ],
  [
    "Allen Ezra M.",
    "AE",
    4,
    "Statistics",
    "Sessions are well-structured and easy to follow. Thank you!",
    "May 5, 2025",
    "May 4, 2025",
    "bg-green-50 text-green-800",
  ],
  [
    "Lyla Shane B.",
    "LS",
    5,
    "Linear Algebra",
    "Very clear explanations and real-life examples. Highly recommended!",
    "May 2, 2025",
    "May 1, 2025",
    "bg-amber-50 text-amber-600",
  ],
];
function Stars({ rating }) {
  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      className="inline-flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${value <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
        />
      ))}
    </span>
  );
}
export default function TutorReviews() {
  return (
    <section className="mx-auto max-w-[1500px] px-4 py-4 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
        Reviews &amp; Ratings
      </h1>
      <p className="mt-1 text-xs font-medium text-[#45516e]">
        See what your students are saying about your tutoring sessions.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [Star, "4.8", "Average Rating", "Excellent"],
          [MessageSquare, "96", "Total Reviews", "All time"],
          [ThumbsUp, "88", "Five Star Reviews", "92% of reviews"],
          [CalendarDays, "156", "Completed Sessions", "All time"],
        ].map(([Icon, value, label, detail], index) => (
          <article
            key={label}
            className="flex items-center gap-3 rounded-lg border border-[#e4e8ef] bg-white p-4"
          >
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${index % 2 ? "bg-amber-400" : "bg-[#00651e]"}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold text-[#101828]">{value}</p>
              <h2 className="mt-1 text-[11px] font-medium text-[#45516e]">
                {label}
              </h2>
              <p
                className={`mt-1 text-[10px] ${index === 0 ? "font-semibold text-green-800" : "text-[#727c99]"}`}
              >
                {detail}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(0,2.1fr)]">
        <section className="rounded-lg border border-[#e4e8ef] bg-white p-4">
          <h2 className="mt-2 text-sm font-bold">Rating Distribution</h2>
          <p className="mt-2 text-[11px] text-[#45516e]">
            Breakdown of your ratings
          </p>
          <div className="my-6 space-y-6">
            {[
              [5, 88, 92],
              [4, 6, 6],
              [3, 2, 2],
              [2, 0, 0],
              [1, 0, 0],
            ].map(([rating, count, percent]) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-[10px] font-semibold">
                  {rating} {rating === 1 ? "Star" : "Stars"}
                </span>
                <Stars rating={rating} />
                <div
                  role="meter"
                  aria-label={`${rating} star reviews`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  className="h-1.5 min-w-4 flex-1 overflow-hidden rounded-full bg-slate-50"
                >
                  <div
                    style={{ width: `${percent}%` }}
                    className="h-full rounded-full bg-green-800"
                  />
                </div>
                <span className="w-14 text-right text-[10px] font-medium text-[#45516e]">
                  {count} ({percent}%)
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 rounded-lg bg-[#f0f8f3] p-3">
            <Star className="h-5 w-5 shrink-0 text-green-800" />
            <div>
              <p className="text-[10px] font-semibold">
                Great job! You maintain an excellent rating.
              </p>
              <p className="mt-1 text-[10px] font-semibold text-green-800">
                Keep up the amazing work!
              </p>
            </div>
          </div>
        </section>
        <section className="min-w-0 rounded-lg border border-[#e4e8ef] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold">Student Reviews</h2>
            <div className="flex gap-2">
              <select
                aria-label="Filter reviews by rating"
                className="h-8 rounded-md border border-[#e4e8ef] bg-white px-3 text-[10px]"
              >
                <option>All Ratings</option>
              </select>
              <select
                aria-label="Sort student reviews"
                className="h-8 rounded-md border border-[#e4e8ef] bg-white px-3 text-[10px]"
              >
                <option>Most Recent</option>
              </select>
            </div>
          </div>
          <div className="mt-3 divide-y divide-slate-50">
            {reviews.map(
              ([
                name,
                initials,
                rating,
                subject,
                text,
                date,
                sessionDate,
                color,
              ]) => (
                <article key={name} className="flex gap-3 py-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-[#d4e1d8] text-xs font-semibold text-green-800">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h3 className="text-xs font-bold">{name}</h3>
                      <span className="flex items-center gap-1.5">
                        <Stars rating={rating} />
                        <span className="text-[10px] font-semibold">
                          {rating.toFixed(1)}
                        </span>
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-semibold ${color}`}
                      >
                        {subject}
                      </span>
                      <time className="ml-auto text-[10px] text-slate-600">
                        {date}
                      </time>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[#45516e]">
                      {text}
                    </p>
                    <p className="mt-1 text-[10px] text-[#45516e]">
                      Session on {sessionDate}
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
          <footer className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-[#45516e]">
              Showing 1 to 5 of 96 reviews
            </p>
            <nav aria-label="Review pages" className="flex gap-1.5">
              <button
                type="button"
                aria-label="Previous page"
                disabled
                className="grid h-7 w-7 place-items-center rounded border border-slate-100 text-slate-400"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              {[1, 2, 3, "…", 20].map((page) =>
                page === "…" ? (
                  <span key={page} className="px-1 text-slate-400">
                    {page}
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    aria-current={page === 1 ? "page" : undefined}
                    className={`h-7 w-7 rounded border text-[10px] font-semibold ${page === 1 ? "border-green-800 bg-green-800 text-white" : "border-slate-100"}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="Next page"
                className="grid h-7 w-7 place-items-center rounded border border-slate-100"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </nav>
          </footer>
        </section>
      </div>
    </section>
  );
}
