import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
import { useState } from "react";
import { filterSessions } from "./sessionFilters.js";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  MapPin,
  MessageCircle,
  Monitor,
  Star,
  Video,
  View,
  XCircle,
} from "lucide-react";

const sessions = [
  [
    "JAN",
    "14",
    "WED",
    "John Michael P.",
    "BS Mathematics",
    "4.9",
    "128 reviews",
    "Calculus",
    "Derivatives and Applications",
    "January 14, 2026",
    "(Wednesday)",
    "2:00 PM - 3:30 PM",
    "Online",
    "Google Meet",
    "₱400",
    "Paid",
    "JM",
  ],
  [
    "JAN",
    "17",
    "SAT",
    "Maria Angelica R.",
    "BS Physics",
    "4.8",
    "95 reviews",
    "Statistics",
    "Probability Distributions",
    "January 17, 2026",
    "(Saturday)",
    "10:00 AM - 11:30 AM",
    "Online",
    "Zoom",
    "₱350",
    "Pending",
    "MA",
  ],
  [
    "JAN",
    "20",
    "TUE",
    "Janine Claire T.",
    "BS English",
    "4.7",
    "82 reviews",
    "English",
    "Argumentative Essay",
    "January 20, 2026",
    "(Tuesday)",
    "1:00 PM - 2:30 PM",
    "On-Campus",
    "Main Library, CSU Study Room 3",
    "₱300",
    "Paid",
    "JC",
  ],
];

const sessionRecords = sessions.map((details, index) => ({
  id: index + 1,
  lifecycle: "Upcoming",
  date: details[9],
  paymentStatus: details[15],
  details,
}));
const tabs = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

export default function LearnerSessions() {
  const work=useLearnerWorkspace();
  const records=sessionRecords.map(s=>({...s,...work.data.sessions.find(x=>x.id===s.id)}));
  function act(kind,name,date){const source=records.find(s=>s.details[3]===name&&s.date===date);const d=source.details;work.open(kind,{...source,name,subject:d[7],time:d[11],link:source.link});}
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const visibleSessions = filterSessions(
    records,
    activeTab,
    selectedDate,
    selectedStatus,
  );
  const tabCount = records.filter(
    (session) => session.lifecycle === activeTab,
  ).length;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        My Sessions
      </h1>
      <p className="mt-1 text-xs font-medium text-[#173a9b]">
        Manage your tutoring sessions and track your learning progress.
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe5ed]">
        <nav
          aria-label="Session status"
          className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#637191]"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-2 ${activeTab === tab ? "border-[#087542] text-[#087542]" : "border-transparent hover:text-[#087542]"}`}
            >
              {tab} (
              {
                sessionRecords.filter((session) => session.lifecycle === tab)
                  .length
              }
              )
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2 pb-2">
          <label>
            <span className="sr-only">Filter by session date</span>
            <select
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-8 rounded-md border border-[#dfe5ed] bg-white px-3 text-xs"
            >
              <option value="all">All Dates</option>
              {[...new Set(sessionRecords.map((session) => session.date))].map(
                (date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by payment status</span>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="h-8 rounded-md border border-[#dfe5ed] bg-white px-3 text-xs"
            >
              <option value="all">All Status</option>
              {[
                ...new Set(
                  sessionRecords.map((session) => session.paymentStatus),
                ),
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          {(selectedDate !== "all" || selectedStatus !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate("all");
                setSelectedStatus("all");
              }}
              className="px-2 text-xs font-semibold text-[#087542]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      <h2 className="mt-3 text-base font-bold">{activeTab} Sessions</h2>
      {visibleSessions.length === 0 && (
        <div
          role="status"
          className="mt-2 rounded-xl border border-[#e0e7f0] bg-white p-6 text-center text-sm text-[#637191]"
        >
          {tabCount === 0
            ? `No ${activeTab.toLowerCase()} sessions yet.`
            : "No sessions match these filters. Try another date or status, or clear the filters."}
        </div>
      )}
      <div className="mt-2 space-y-1">
        {visibleSessions.map(
          ({
            id,
            details: [
              month,
              day,
              weekday,
              name,
              course,
              rating,
              reviews,
              subject,
              topic,
              date,
              dateDay,
              time,
              mode,
              venue,
              price,
              status,
              initials,
            ],
          }) => (
            <article
              key={date}
              className="grid grid-cols-2 items-center gap-3 rounded-xl border border-[#e0e7f0] bg-white p-2 text-xs [&>div]:min-w-0 [&>div]:break-words sm:grid-cols-3 lg:grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_55px_150px] lg:gap-2"
            >
              <div className="text-center font-bold text-[#087542]">
                <p className="text-xs">{month}</p>
                <p className="text-2xl text-[#101828]">{day}</p>
                <p className="text-xs">{weekday}</p>
                <p className="mt-1 text-xs text-[#637191]">2026</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 text-base font-bold text-[#405276]">
                  {initials}
                </span>
                <div>
                  <h3 className="font-bold">{name}</h3>
                  <p className="mt-1 text-xs text-blue-600">{course}</p>
                  <p className="mt-1 text-xs">
                    <Star className="mr-1 inline h-4 w-4 fill-[#ffb800] text-[#ffb800]" />
                    {rating} <span className="text-blue-600">({reviews})</span>
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-[#405276]">
                <p className="font-bold text-[#101828]">
                  <GraduationCap className="mr-1 inline h-3.5 w-3.5" />
                  {subject}
                </p>
                <p>
                  <View className="mr-1 inline h-3.5 w-3.5" />
                  Topic: {topic}
                </p>
                <p>
                  <FileText className="mr-1 inline h-3.5 w-3.5" />
                  1.5 hours
                </p>
              </div>
              <div className="space-y-1 text-xs text-[#405276]">
                <p>
                  <CalendarDays className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                  {date}
                  <br />
                  <span className="ml-5">{dateDay}</span>
                </p>
                <p>
                  <Clock3 className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                  {time}
                </p>
              </div>
              <div className="space-y-1 text-xs text-[#405276]">
                <p className="font-medium text-[#101828]">
                  <Monitor className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                  {mode}
                </p>
                <p>
                  <MapPin className="mr-1 inline h-3.5 w-3.5 text-[#087542]" />
                  {venue}
                </p>
                {mode === "Online" && (
                  <p className="text-xs text-blue-600">
                    meet.google.com/abc-defg-hij{" "}
                    <ExternalLink className="inline h-3.5 w-3.5" />
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-base font-bold">{price}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${status === "Paid" ? "bg-[#dff8e8] text-[#087542]" : "bg-[#e7f3ff] text-[#1675df]"}`}
                >
                  {status}
                </span>
              </div>
              <div className="col-span-2 border-t border-[#e1e7ef] pt-2 sm:col-span-3 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
                  <button onClick={()=>act("meeting",name,date)}
                    type="button"
                    className="min-h-6 px-1 py-0.5 rounded-md bg-[#075d34] text-xs font-semibold text-white"
                  >
                    {mode === "Online" && (
                      <Video className="mr-2 inline h-4 w-4" />
                    )}
                    Join Session <ExternalLink className="inline h-4 w-4" />
                  </button>
                  <button onClick={()=>work.message({name})}
                    type="button"
                    className="min-h-6 px-1 py-0.5 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
                  >
                    <MessageCircle className="mr-2 inline h-4 w-4" />
                    Message Tutor
                  </button>
                  <div className="grid grid-cols-[1.4fr_1fr] gap-1">
                    <button onClick={()=>act("reschedule",name,date)} className="min-h-6 px-1 py-0.5 rounded-md border border-[#f2a400] text-xs font-semibold text-[#d98d00]">
                      Reschedule
                    </button>
                    <button onClick={()=>act("cancel",name,date)} className="min-h-6 px-1 py-0.5 rounded-md border border-red-500 text-xs font-semibold text-red-600">
                      <XCircle className="mr-1 inline h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                  <button onClick={()=>act("details",name,date)} className="min-h-6 px-1 py-0.5 rounded-md border border-[#dfe5ed] text-xs font-semibold">
                    <View className="mr-2 inline h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
            </article>
          ),
        )}
      </div>
      <p className="mt-3 text-xs text-[#566584]">
        Showing {visibleSessions.length} of {tabCount} {activeTab.toLowerCase()}{" "}
        sessions
      </p>
    </section>
  );
}
