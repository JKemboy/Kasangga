import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  MapPin,
  Monitor,
  SquareCheck,
  X,
} from "lucide-react";
const requests = [
  {
    name: "Jasmine Nicole D.",
    initials: "JN",
    degree: "BS Information Technology",
    year: "2nd Year",
    service: "Calculus 1 - Derivatives",
    category: "Mathematics",
    date: "May 20, 2025 (Tue)",
    time: "2:00 PM - 3:00 PM",
    duration: 60,
    mode: "Online",
    message: "I need help understanding derivatives and their applications.",
    earnings: 350,
    status: "New",
  },
  {
    name: "Mark Joseph P.",
    initials: "MJ",
    degree: "BS Physics",
    year: "3rd Year",
    service: "Physics 1 - Mechanics",
    category: "Physics",
    date: "May 20, 2025 (Tue)",
    time: "4:00 PM - 5:00 PM",
    duration: 60,
    mode: "Online",
    message: "Need assistance with Newton's laws and problem solving.",
    earnings: 400,
    status: "Pending",
  },
  {
    name: "Rianne Kate L.",
    initials: "RK",
    degree: "BS Information Technology",
    year: "2nd Year",
    service: "Programming (Python)",
    category: "Computer Science",
    date: "May 21, 2025 (Wed)",
    time: "1:00 PM - 2:30 PM",
    duration: 90,
    mode: "In-person",
    message: "I need help with Python loops, functions, and debugging code.",
    earnings: 675,
    status: "New",
  },
  {
    name: "Allen Ezra M.",
    initials: "AE",
    degree: "BS Information Technology",
    year: "3rd Year",
    service: "Statistics - Probability",
    category: "Mathematics",
    date: "May 21, 2025 (Wed)",
    time: "3:00 PM - 4:00 PM",
    duration: 60,
    mode: "Online",
    message: "Help me understand probability distributions and calculations.",
    earnings: 400,
    status: "Pending",
  },
  {
    name: "Lyla Shane B.",
    initials: "LS",
    degree: "BS Mathematics",
    year: "2nd Year",
    service: "Linear Algebra",
    category: "Mathematics",
    date: "May 22, 2025 (Thu)",
    time: "10:00 AM - 11:30 AM",
    duration: 90,
    mode: "Online",
    message: "Need help with matrix operations and vector spaces.",
    earnings: 675,
    status: "Accepted",
  },
];
const tabs = [
  ["All", 28],
  ["New", 8],
  ["Pending", 5],
  ["Accepted", 12],
  ["Declined", 3],
];
function Label({ children }) {
  return (
    <p className="mb-1.5 text-[9px] font-medium text-[#7b839d]">{children}</p>
  );
}
export default function TutorStudentRequests() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-4 text-[#15213f] lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
            Student Requests
          </h1>
          <p className="mt-1 text-xs font-medium">
            Review and respond to student tutoring requests.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-md border border-[#e4e8ef] bg-white px-3 text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Filter<span className="ml-3 text-[#738098]">⌄</span>
          </button>
          <select
            aria-label="Filter requests by service"
            className="h-9 w-44 rounded-md border border-[#e4e8ef] bg-white px-3 text-xs"
          >
            <option>All Services</option>
          </select>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            FileText,
            8,
            "New Requests",
            "Needs your response",
            "bg-blue-50 text-blue-500",
          ],
          [
            Clock3,
            5,
            "Pending",
            "Awaiting your response",
            "bg-amber-50 text-amber-500",
          ],
          [Check, 12, "Accepted", "This month", "bg-green-50 text-green-700"],
          [X, 3, "Declined", "This month", "bg-red-50 text-red-500"],
        ].map(([Icon, count, title, detail, color]) => (
          <article
            key={title}
            className="flex items-center gap-3 rounded-lg border border-[#e6eaf0] bg-white px-4 py-3"
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold text-[#101828]">{count}</p>
              <h2 className="text-[11px] font-medium">{title}</h2>
              <p className="mt-1 text-[10px] text-[#7b839d]">{detail}</p>
            </div>
          </article>
        ))}
      </div>
      <nav
        aria-label="Request status"
        className="mt-5 flex flex-wrap gap-1 border-b border-[#eef1f5]"
      >
        {tabs.map(([label, count], index) => (
          <button
            key={label}
            type="button"
            className={`rounded-md px-4 py-2.5 text-[11px] font-semibold ${index === 0 ? "border border-green-100 bg-white text-green-800" : "text-[#626b86]"}`}
          >
            {label} ({count})
          </button>
        ))}
      </nav>
      <div className="mt-2 space-y-2">
        {requests.map((request) => (
          <article
            key={request.name}
            className="grid items-start gap-4 rounded-lg border border-[#edf0f4] bg-white p-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[1.4fr_1.05fr_1fr_.85fr_1.1fr_.55fr_.6fr_140px] 2xl:border-transparent 2xl:py-5"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#e9eee9] to-[#cad8d0] text-sm font-semibold text-[#087542]"
              >
                {request.initials}
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#101828]">
                  {request.name}
                </h2>
                <p className="mt-1 text-[10px] text-[#727c99]">
                  {request.degree}
                </p>
                <p className="mt-1 text-[10px] font-semibold">{request.year}</p>
              </div>
            </div>
            <div>
              <Label>Requested Service</Label>
              <h3 className="text-xs font-bold text-[#101828]">
                {request.service}
              </h3>
              <span
                className={`mt-1.5 inline-block rounded px-2 py-1 text-[9px] font-semibold ${request.category === "Physics" ? "bg-amber-50 text-amber-600" : request.category === "Computer Science" ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-800"}`}
              >
                {request.category}
              </span>
            </div>
            <div>
              <Label>Date &amp; Time</Label>
              <p className="flex items-start gap-1 text-[10px] font-medium">
                <CalendarDays className="h-3 w-3 shrink-0 text-[#7b839d]" />
                {request.date}
              </p>
              <p className="mt-2 flex items-start gap-1 text-[10px] font-medium">
                <Clock3 className="h-3 w-3 shrink-0 text-[#7b839d]" />
                {request.time}
              </p>
            </div>
            <div>
              <Label>Duration</Label>
              <p className="flex items-center gap-1 text-[10px]">
                <Clock3 className="h-3 w-3 text-[#7b839d]" />
                {request.duration} minutes
              </p>
              <p className="mt-2 flex items-center gap-1 text-[10px]">
                {request.mode === "Online" ? (
                  <Monitor className="h-3 w-3 text-[#7b839d]" />
                ) : (
                  <MapPin className="h-3 w-3 text-[#7b839d]" />
                )}
                {request.mode}
              </p>
            </div>
            <div>
              <Label>Objective / Message</Label>
              <p className="text-[10px] font-medium leading-5">
                {request.message}
              </p>
            </div>
            <div>
              <Label>Est. Earnings</Label>
              <p className="text-sm font-bold text-[#087542]">
                ₱{request.earnings}
              </p>
            </div>
            <div>
              <Label>Request Status</Label>
              <span
                className={`inline-block rounded px-2 py-1 text-[9px] font-semibold ${request.status === "New" ? "bg-blue-50 text-blue-600" : request.status === "Pending" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"}`}
              >
                {request.status}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={request.status === "Accepted"}
                  className="h-7 rounded border border-green-600/50 text-[10px] font-semibold text-green-800 disabled:border-slate-200 disabled:text-slate-300"
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="h-7 rounded border border-red-300 text-[10px] font-semibold text-red-500"
                >
                  Decline
                </button>
              </div>
              <button
                type="button"
                className="flex h-7 w-full items-center justify-center gap-2 rounded border border-[#e4e8ef] text-[10px] font-semibold"
              >
                <SquareCheck className="h-3 w-3 text-green-800" />
                View Details
              </button>
            </div>
          </article>
        ))}
      </div>
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#727c99]">
          Showing 1 to 5 of 28 requests
        </p>
        <nav aria-label="Request pages" className="flex gap-1.5">
          <button
            type="button"
            aria-label="Previous page"
            disabled
            className="grid h-7 w-7 place-items-center rounded border border-slate-100 text-slate-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[1, 2, 3, "…", 6].map((page) =>
            page === "…" ? (
              <span key={page} className="px-2 text-slate-400">
                {page}
              </span>
            ) : (
              <button
                type="button"
                key={page}
                aria-current={page === 1 ? "page" : undefined}
                className={`h-7 w-7 rounded border text-[11px] font-semibold ${page === 1 ? "border-green-800 bg-green-800 text-white" : "border-slate-100 bg-white"}`}
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
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </footer>
    </section>
  );
}
