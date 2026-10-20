import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  Info,
  MapPin,
  MessageCircle,
  Monitor,
  NotebookPen,
  Trash2,
  X,
} from "lucide-react";
const sessions = [
  {
    id: 1,
    day: 0,
    hour: 11,
    duration: 1,
    title: "Calculus 1",
    student: "Maria Angela R.",
    initials: "MA",
    status: "Confirmed",
    mode: "Online",
    price: 350,
    notes:
      "I need help with limits and derivatives. Please explain with examples.",
  },
  {
    id: 2,
    day: 1,
    hour: 16,
    duration: 1,
    title: "Physics 1",
    student: "Mark Joseph P.",
    initials: "MJ",
    status: "Confirmed",
    mode: "Online",
    price: 400,
    notes: "Please help me understand Newton's laws.",
  },
  {
    id: 3,
    day: 2,
    hour: 10,
    duration: 1.5,
    title: "Statistics",
    student: "Lyla Shane B.",
    initials: "LS",
    status: "Pending",
    mode: "Online",
    price: 600,
    notes: "I would like to review probability distributions.",
  },
  {
    id: 4,
    day: 3,
    hour: 13,
    duration: 1,
    title: "Programming (Python)",
    student: "Allen Ezra M.",
    initials: "AE",
    status: "Confirmed",
    mode: "In-person",
    price: 450,
    notes: "I need help with Python loops and functions.",
  },
  {
    id: 5,
    day: 4,
    hour: 14,
    duration: 1,
    title: "Physics 1",
    student: "Rianne Kate L.",
    initials: "RK",
    status: "Completed",
    mode: "Online",
    price: 400,
    notes: "Review mechanics exercises.",
  },
];
const slots = [
  [0, 18, 2, "Online"],
  [2, 19, 2, "In-person"],
  [3, 18, 2, "Online"],
  [4, 19, 2, "Online"],
  [5, 10, 2, "Online"],
  [5, 13, 2, "In-person"],
  [6, 10, 2, "Online"],
  [6, 16, 2, "Online"],
  [6, 19, 2, "Online"],
];
const colors = {
  Confirmed: "border-green-300 bg-green-50 text-green-800",
  Pending: "border-amber-300 bg-amber-50 text-amber-700",
  Completed: "border-blue-300 bg-blue-50 text-blue-600",
  Cancelled: "border-red-400 bg-red-50 text-red-600",
  Unavailable: "border-slate-300 bg-slate-100 text-slate-600",
  "Class Conflict": "border-red-300 bg-red-50 text-red-600",
};
const button =
  "h-8 rounded-md border border-[#e4e8ef] bg-white px-3 text-[10px] font-semibold";
const time = (value) =>
  `${Math.floor(value) % 12 || 12}:${value % 1 ? "30" : "00"} ${value >= 12 ? "PM" : "AM"}`;
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function Badge({ status }) {
  return (
    <span
      className={`inline-block rounded px-2 py-1 text-[9px] font-semibold ${colors[status]}`}
    >
      {status}
    </span>
  );
}
export default function TutorSessionSchedule() {
  const [selected, setSelected] = useState(sessions[0]);
  return (
    <section className="mx-auto max-w-[1700px] px-4 py-4 lg:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
        Session Schedule
      </h1>
      <p className="mt-1 text-xs font-medium text-[#253455]">
        View and manage your tutoring sessions.
      </p>
      <div
        className={`mt-4 grid items-start gap-4 ${selected ? "2xl:grid-cols-[minmax(0,1fr)_260px]" : ""}`}
      >
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <div className="flex">
                <button
                  type="button"
                  aria-label="Previous week"
                  className={button}
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button type="button" aria-label="Next week" className={button}>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <button type="button" className={button}>
                Today
              </button>
            </div>
            <p className="text-[11px] font-semibold">May 12 – May 18, 2025</p>
            <div className="flex gap-2">
              <div className="flex">
                {["Week", "Month", "List"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    className={`${button} ${view === "Week" ? "bg-green-50 text-green-800" : ""}`}
                  >
                    {view}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`${button} flex items-center gap-2`}
              >
                <Filter className="h-3 w-3" />
                Filter
              </button>
            </div>
          </div>
          <div className="grid items-start gap-3 xl:grid-cols-[210px_minmax(0,1fr)]">
            <aside className="rounded-lg border border-[#e4e8ef] bg-white p-3">
              <div className="mb-2 flex justify-between">
                <h2 className="text-xs font-semibold">Upcoming Sessions</h2>
                <span className="text-[9px] font-semibold text-green-800">
                  View all
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelected(session)}
                    className="flex w-full gap-2 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="h-fit w-9 shrink-0 overflow-hidden rounded-md bg-slate-50 text-center">
                      <p className="bg-green-50 py-1 text-[8px] font-bold text-green-800">
                        MAY
                      </p>
                      <p className="text-lg">{12 + session.day}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] text-[#66718f]">
                        {time(session.hour)} -{" "}
                        {time(session.hour + session.duration)}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold">
                        {session.title}
                      </p>
                      <p className="mt-1 text-[9px] text-[#66718f]">
                        {session.student}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                        <span className="flex items-center gap-1 text-[8px]">
                          <Monitor className="h-2.5 w-2.5 text-green-700" />
                          {session.mode}
                        </span>
                        <Badge status={session.status} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`${button} mt-2 w-full border-green-600 text-green-800`}
              >
                View Full Schedule
              </button>
            </aside>
            <div className="min-w-0 rounded-lg border border-[#e4e8ef] bg-white">
              <div className="overflow-x-auto">
                <div className="min-w-[580px]">
                  <div className="grid grid-cols-[38px_repeat(7,minmax(0,1fr))] border-b border-slate-100">
                    <div />
                    {days.map((day, i) => (
                      <div
                        key={day}
                        className="border-l border-slate-100 py-2 text-center"
                      >
                        <p className="text-[10px] font-bold">{day}</p>
                        <p className="mt-1 text-[8px]">May {12 + i}</p>
                      </div>
                    ))}
                  </div>
                  <div className="relative grid h-[490px] grid-cols-[38px_repeat(7,minmax(0,1fr))]">
                    <div className="relative">
                      {Array.from({ length: 15 }, (_, i) => (
                        <span
                          key={i}
                          className="absolute left-1 text-[8px] text-[#66718f]"
                          style={{ top: `${(i / 15) * 100}%` }}
                        >
                          {time(i + 7).replace(":00", "")}
                        </span>
                      ))}
                    </div>
                    {days.map((day, index) => (
                      <div
                        key={day}
                        className="relative border-l border-slate-100 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(6.6667%-1px),#f3f5f7_calc(6.6667%-1px),#f3f5f7_6.6667%)]"
                      >
                        {sessions
                          .filter((s) => s.day === index)
                          .map((s) => (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => setSelected(s)}
                              className={`absolute inset-x-1 z-10 overflow-hidden rounded border-l-2 p-1 text-left ${colors[s.status]}`}
                              style={{
                                top: `${((s.hour - 7) / 15) * 100}%`,
                                height: `${(Math.max(s.duration, 1.8) / 15) * 100}%`,
                              }}
                            >
                              <p className="text-[7px] font-semibold">
                                {time(s.hour)} - {time(s.hour + s.duration)}
                              </p>
                              <p className="mt-0.5 text-[9px] font-bold">
                                {s.title}
                              </p>
                              <p className="text-[8px]">{s.student}</p>
                              <p className="text-[7px]">{s.mode}</p>
                            </button>
                          ))}
                        {slots
                          .filter((s) => s[0] === index)
                          .map(([, hour, duration, mode]) => (
                            <div
                              key={hour}
                              className="absolute inset-x-1 rounded border-l-2 border-green-300 bg-green-50 p-1 text-green-800"
                              style={{
                                top: `${((hour - 7) / 15) * 100}%`,
                                height: `${(duration / 15) * 100}%`,
                              }}
                            >
                              <p className="text-[7px]">
                                {time(hour)} - {time(hour + duration)}
                              </p>
                              <p className="mt-1 text-[9px] font-semibold">
                                Available
                              </p>
                              <p className="text-[8px]">{mode}</p>
                            </div>
                          ))}
                        {index === 0 && (
                          <div
                            className="absolute inset-x-1 rounded border-l-2 border-red-400 bg-red-50 p-1 text-red-600"
                            style={{
                              top: `${(8 / 15) * 100}%`,
                              height: `${(2 / 15) * 100}%`,
                            }}
                          >
                            <p className="text-[7px]">3:00 PM - 5:00 PM</p>
                            <p className="text-[9px] font-bold">
                              Class Conflict
                            </p>
                            <p className="text-[8px]">Data Structures</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 border-t border-slate-100 p-3">
                {Object.entries(colors).map(([status, color]) => (
                  <span
                    key={status}
                    className="flex items-center gap-1 text-[8px] text-[#66718f]"
                  >
                    <span className={`h-2 w-2 rounded-sm border ${color}`} />
                    {status}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-[10px] font-medium text-blue-900">
            <Info className="h-3.5 w-3.5 text-blue-600" />
            All times are displayed in (GMT+08:00) Asia/Manila
          </p>
        </div>
        {selected && (
          <aside className="rounded-lg border border-[#e4e8ef] bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Session Details</h2>
              <button
                type="button"
                aria-label="Close session details"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Badge status={selected.status} />
            <div className="my-4 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-green-800">
                {selected.initials}
              </span>
              <div>
                <h3 className="text-xs font-semibold">{selected.student}</h3>
                <p className="mt-1 text-[10px] leading-4 text-[#66718f]">
                  Student
                </p>
              </div>
            </div>
            <dl className="space-y-5">
              {[
                [CalendarDays, "Service / Subject", selected.title],
                [
                  CalendarDays,
                  "Date & Time",
                  `May ${12 + selected.day}, 2025 (${days[selected.day]}) · ${time(selected.hour)} - ${time(selected.hour + selected.duration)}`,
                ],
                [Clock3, "Duration", `${selected.duration * 60} minutes`],
                [Monitor, "Session Type", selected.mode],
                [
                  CreditCard,
                  "Payment Status",
                  `${selected.status === "Pending" ? "Pending" : "Paid"} · ₱${selected.price}`,
                ],
                [
                  NotebookPen,
                  "Booking ID",
                  `#BKG-2025-05${12 + selected.day}-00${selected.id}`,
                ],
              ].map(([Icon, label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[100px_minmax(0,1fr)] gap-2 text-[10px]"
                >
                  <dt className="flex items-start gap-1.5 text-[#66718f]">
                    <Icon className="h-3 w-3 shrink-0" />
                    {label}
                  </dt>
                  <dd className="break-words leading-4">{value}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-5 text-[10px] text-[#66718f]">Student Notes</h3>
            <p className="mt-2 text-[10px] leading-5 text-[#45516e]">
              {selected.notes}
            </p>
            <h3 className="mt-4 text-[10px] text-[#66718f]">Status</h3>
            <div className="mt-2">
              <Badge status={selected.status} />
            </div>
            <p className="mt-2 text-[10px] text-[#66718f]">
              Booked on May 10, 2025
            </p>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {[
                [MessageCircle, "Message Student"],
                [CalendarDays, "Reschedule"],
              ].map(([Icon, label]) => (
                <button
                  key={label}
                  type="button"
                  className={`${button} flex w-full items-center justify-center gap-2 ${label === "Cancel Session" ? "border-red-300 text-red-600" : "text-green-800"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
