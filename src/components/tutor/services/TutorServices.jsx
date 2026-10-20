import {
  ArrowRight,
  Atom,
  Bookmark,
  CalendarDays,
  ChartNoAxesCombined,
  CodeXml,
  Info,
  MoreVertical,
  Plus,
  Sigma,
  Star,
  ThumbsUp,
  Wallet,
  GraduationCap,
} from "lucide-react";
const services = [
  [Sigma, "Calculus 1", "College Level", 350, "bg-[#087542]"],
  [Atom, "Physics 1", "College Level", 400, "bg-amber-500"],
  [CodeXml, "Programming (Python)", "All Levels", 450, "bg-[#087542]"],
  [ChartNoAxesCombined, "Statistics", "College Level", 400, "bg-purple-600"],
];
const sessions = [
  [
    "13",
    "Today • 2:00 PM - 3:30 PM",
    "Calculus 1 - Derivatives",
    "Maria Angela R.",
    "Confirmed",
  ],
  [
    "13",
    "Today • 4:00 PM - 5:00 PM",
    "Basic Programming (Python)",
    "Allen Ezra M.",
    "Confirmed",
  ],
  [
    "14",
    "May 14 • 10:00 AM - 11:30 AM",
    "Statistics - Probability",
    "Lyla Shane B.",
    "Confirmed",
  ],
  [
    "15",
    "May 15 • 1:00 PM - 2:30 PM",
    "Physics 1 - Mechanics",
    "Mark Joseph P.",
    "Pending",
  ],
];
const requests = [
  ["JN", "Jasmine Nicole D.", "College Algebra", "May 13, 2025 • 2:15 PM"],
  ["MJ", "Mark Joseph P.", "Physics 1 - Mechanics", "May 13, 2025 • 1:45 PM"],
  ["RK", "Rianne Kate L.", "IT 13 - Web Development", "May 12, 2025 • 6:30 PM"],
  ["JM", "John Michael P.", "Statistics", "May 12, 2025 • 4:10 PM"],
];
const panel = "rounded-xl border border-[#e5e9ed] bg-white p-3";
function Heading({ title, link }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-[#171c23]">{title}</h2>
      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#087542]">
        {link}
        <ArrowRight className="h-3 w-3" />
      </span>
    </div>
  );
}
export default function TutorServices() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Welcome back, Juan!{" "}
        <span role="img" aria-label="Waving hand">
          👋
        </span>
      </h1>
      <p className="mt-1 text-xs text-[#738098]">
        Here's an overview of your tutoring activity.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {[
          [GraduationCap, "28", "Total Sessions", "This month"],
          [CalendarDays, "16", "Confirmed Bookings", "This week"],
          [Bookmark, "12", "Active Students", "This month"],
          [Wallet, "₱18,450", "Total Earnings", "This month"],
          [Star, "4.8", "Average Rating", "View reviews"],
          [ThumbsUp, "96%", "Response Rate", "This month"],
        ].map(([Icon, value, label, detail], i) => (
          <div
            key={label}
            className={`${panel} flex items-start gap-3 ${i % 2 ? "border-amber-100" : ""}`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${i % 2 ? "bg-amber-500" : "bg-[#087542]"}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-semibold">{value}</p>
              <p className="mt-1 text-[10px]">{label}</p>
              <p className="mt-2 text-[10px] text-[#738098]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid items-start gap-3 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <section className={panel}>
              <Heading title="Upcoming Sessions" link="View full schedule" />
              <div className="divide-y divide-slate-100">
                {sessions.map(([day, time, title, name, status]) => (
                  <div key={title} className="flex items-center gap-3 py-3">
                    <div className="w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50 text-center">
                      <p className="bg-green-50 py-1 text-[9px] font-semibold text-green-800">
                        MAY
                      </p>
                      <p className="py-1 text-xl">{day}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-[#738098]">{time}</p>
                      <h3 className="mt-1 text-xs font-semibold">{title}</h3>
                      <p className="mt-1 text-[10px] text-[#637191]">
                        with {name}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-[9px] ${status === "Confirmed" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-700"}`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className={panel}>
              <Heading title="Student Requests" link="View all requests" />
              <div className="divide-y divide-slate-100">
                {requests.map(([initials, name, subject, time]) => (
                  <div
                    key={name}
                    className="flex flex-wrap items-center gap-2 py-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8ede9] text-xs font-semibold text-green-800">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] font-semibold">{name}</h3>
                      <p className="mt-1 text-[10px] text-[#738098]">
                        {subject}
                      </p>
                      <p className="mt-1 text-[10px] text-[#738098]">{time}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="rounded border border-green-600 px-2 py-1.5 text-[9px] font-semibold text-green-800">
                        Accept
                      </button>
                      <button className="rounded border border-red-300 px-2 py-1.5 text-[9px] font-semibold text-red-500">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className={panel}>
            <Heading title="My Services" link="Manage services" />
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-[repeat(4,minmax(0,1fr))_90px]">
              {services.map(([Icon, name, level, rate, color]) => (
                <article
                  key={name}
                  className="relative flex gap-2 rounded-lg border border-[#e7ebf0] p-3"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white ${color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 pr-2">
                    <h3 className="text-[10px] font-semibold">{name}</h3>
                    <p className="mt-1 text-[9px] text-[#738098]">{level}</p>
                    <p className="mt-2 text-[10px]">
                      <b className="text-[#087542]">₱{rate}</b> / hour
                    </p>
                    <p className="mt-3 text-[9px] text-[#087542]">● Active</p>
                  </div>
                  <button
                    aria-label={`Manage ${name}`}
                    className="absolute right-1 top-3 text-[#738098]"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>
                </article>
              ))}
              <button className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#e0e7ef] text-xs text-[#738098]">
                <Plus className="h-6 w-6" />
                <span>
                  Add New
                  <br />
                  Service
                </span>
              </button>
            </div>
          </section>
        </div>
        <div className="space-y-3">
          <section className={panel}>
            <Heading title="Earnings Overview" link="View all earnings" />
            <div className="grid grid-cols-3 gap-2">
              {[
                ["₱18,450", "Total Earnings", "This month"],
                ["₱6,200", "Pending Payout", "Will be released soon"],
                ["₱12,250", "Paid Earnings", "This month"],
              ].map(([amount, label, detail], i) => (
                <div key={label} className={i === 2 ? "text-green-700" : ""}>
                  <p className="text-base font-semibold">{amount}</p>
                  <p className="mt-1 text-[10px]">{label}</p>
                  <p className="mt-1 text-[9px] text-[#738098]">{detail}</p>
                </div>
              ))}
            </div>
            <div
              role="img"
              aria-label="Daily earnings from May 7 to May 13: 2800, 4200, 2800, 4700, 3800, 3000, and 6700 pesos"
              className="mt-5 flex h-44 gap-2"
            >
              <div className="flex flex-col justify-between pb-5 text-[9px] text-[#738098]">
                {["₱8K", "₱6K", "₱4K", "₱2K", "₱0"].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="flex flex-1 items-end justify-around border-b border-slate-100 bg-[repeating-linear-gradient(to_top,transparent_0,transparent_24%,#f3f5f7_25%)]">
                {[2800, 4200, 2800, 4700, 3800, 3000, 6700].map((value, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className="w-3 rounded-t-sm bg-gradient-to-t from-[#087542] to-[#004b2b]"
                      style={{ height: `${(value / 8000) * 85}%` }}
                    />
                    <span className="mt-2 text-[9px] text-[#738098]">
                      May {i + 7}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-[10px] text-slate-600">
              <Info className="h-4 w-4 text-green-700" />
              Next payout: May 20, 2025
            </p>
          </section>
          <section className={panel}>
            <Heading title="Recent Reviews" link="View all reviews" />
            {[
              [
                "MA",
                "Maria Angela R.",
                "Great tutor! Explains concepts clearly and makes lessons easy to understand.",
                "May 12, 2025",
              ],
              [
                "AE",
                "Allen Ezra M.",
                "Very patient and knowledgeable. Helped me a lot with Python basics!",
                "May 10, 2025",
              ],
            ].map(([initials, name, review, date]) => (
              <article
                key={name}
                className="flex gap-2 border-b border-slate-100 py-2 last:border-0"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-1">
                    <h3 className="text-[11px] font-semibold">{name}</h3>
                    <span className="text-[10px] text-amber-500">
                      ★★★★★ 5.0
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-[#738098]">
                    {review}
                  </p>
                  <p className="mt-1 text-[9px] text-[#738098]">{date}</p>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}
