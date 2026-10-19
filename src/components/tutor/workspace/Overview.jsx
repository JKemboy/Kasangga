// Tutor dashboard overview: summarizes tutor activity and provides entry points into service, schedule, and session sections.
import { confirmedClasses } from "./scheduleReview.js";
import CreateService from "./CreateService.jsx";
import { useState } from "react";
import SessionDetails, { TransactionDetails } from "./SessionDetails.jsx";
import { notificationDestination } from "./notificationTargets.js";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import useBookingInbox from "../../../services/useBookingInbox.js";
import {
  ArrowRight,
  Bell,
  Box,
  CalendarDays,
  CalendarCheck,
  Check,
  ChevronRight,
  CreditCard,
  FileText,
  LockKeyhole,
  MessageCircle,
  Plus,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import { allocation, classes, hour, money, time } from "./data.js";
import {
  addDays,
  eventsForDate,
  isoDate,
  parseDate,
  weekStart,
} from "./schedule.js";

const panel = "min-w-0 rounded-lg border border-[#e0e7f0] bg-white p-2";
const dateLabel = (value) =>
  parseDate(value)?.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) || value;
function Badge({ value }) {
  return (
    <span
      className={`inline-block rounded px-2 py-1 text-[9px] font-medium ${["Confirmed", "Paid"].includes(value) ? "bg-[#e7f4ed] text-green-800" : value === "Pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
    >
      {value}
    </span>
  );
}
function Initials({ name }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-50 to-slate-200 text-[9px] font-semibold text-green-800"
    >
      {name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")}
    </span>
  );
}
export default function Overview({ data, go, update, saveService }) {
  const auth = useAuth();
  const inbox = useBookingInbox("tutor", auth?.user?.id);
  const activities = [
    ...inbox.notifications,
    ...data.notifications.filter(
      (item) => !inbox.notifications.some((n) => n.id === item.id),
    ),
  ];
  const [creating, setCreating] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const transaction = data.sessions.find(
    (s) => s.transaction === transactionId,
  );
  function openActivity(n) {
    const target = notificationDestination(n);
    if (
      target?.view === "sessions" &&
      data.sessions.some((s) => s.id === target.args.sessionId)
    )
      setSessionId(target.args.sessionId);
    else if (
      target?.view === "earnings" &&
      data.sessions.some((s) => s.transaction === target.args.transactionId)
    )
      setTransactionId(target.args.transactionId);
    else if (target) go(target.view, target.args);
    else go("notifications", { notificationId: n.id });
  }
  const totals = allocation(data.sessions);
  const upcoming = data.sessions
    .filter((s) => ["Pending", "Confirmed"].includes(s.status))
    .sort((a, b) =>
      `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`),
    );
  const ratings = data.services
    .filter((s) => s.rating > 0)
    .map((s) => s.rating);
  const rating =
    data.profile.rating ??
    (ratings.length
      ? (ratings.reduce((sum, v) => sum + v, 0) / ratings.length).toFixed(1)
      : "—");
  const now = new Date();
  const today = parseDate(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
  );
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const source = {
    classes: confirmedClasses(data),
    slots: data.slots,
    sessions: data.sessions,
  };
  const openFor = (date) => {
    const events = eventsForDate(date, source);
    return events.filter(
      (e) =>
        e.kind === "available" &&
        !e.conflict &&
        !events.some(
          (other) =>
            other.kind !== "available" &&
            e.start < other.end &&
            other.start < e.end,
        ),
    );
  };
  const openCount = Array.from(
    { length: 7 },
    (_, i) => openFor(addDays(weekStart(today), i)).length,
  ).reduce((sum, n) => sum + n, 0);
  let next = null;
  for (let i = 0; i < 14 && !next; i++) {
    const date = addDays(today, i);
    const event = openFor(date).find((slot) => i > 0 || slot.end > hour(clock));
    if (event)
      next = {
        date,
        start: i === 0 ? Math.max(event.start, hour(clock)) : event.start,
      };
  }
  const metrics = [
    [
      Box,
      data.services.filter((s) => s.status === "Active").length,
      "Active Services",
      "Currently active",
      "services",
      { status: "Active" },
      false,
    ],
    [
      CalendarDays,
      upcoming.length,
      "Upcoming Sessions",
      "Confirmed & pending",
      "sessions",
      { tab: "Upcoming" },
      true,
    ],
    [
      Check,
      data.sessions.filter((s) => s.status === "Completed").length,
      "Completed Sessions",
      "All completed sessions",
      "sessions",
      { tab: "Completed" },
      false,
    ],
    [
      Star,
      rating,
      "Average Rating",
      "View tutor profile",
      "profile",
      {},
      false,
    ],
    [
      Wallet,
      money(totals.tutor).replace(/\.00$/, ""),
      "Tutor Earnings",
      "90% tutor share",
      "earnings",
      {},
      true,
    ],
  ];
  return (
    <section
      className="space-y-2 pb-1 text-xs text-[#101828]"
      aria-labelledby="overview-heading"
    >
      <div>
        <h1
          id="overview-heading"
          className="text-2xl font-semibold tracking-tight"
        >
          Welcome back, {data.profile.name.split(" ")[0]}!{" "}
          <span aria-label="Waving hand" role="img">
            👋
          </span>
        </h1>
        <p className="mt-1 text-xs text-[#657599]">
          Here's a concise overview of your tutoring activity.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([Icon, value, label, hint, view, args, gold]) => (
          <button
            type="button"
            key={label}
            aria-label={`Open ${label}`}
            className={`flex min-w-0 items-center gap-2 rounded-lg border bg-white p-2 text-left hover:bg-green-50 focus-visible:outline-green-700 ${gold ? "border-amber-100" : "border-[#e0e7f0]"}`}
            onClick={() => (args.create ? setCreating(true) : go(view, args))}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${gold ? "bg-amber-400" : "bg-green-800"}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <b className="block text-lg tracking-tight">{value}</b>
              <span className="mt-0.5 block text-[11px] leading-4">
                {label}
              </span>
              <span className="mt-1 hidden text-[10px] leading-4 xl:block text-[#657599]">
                {hint}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,3fr)_minmax(190px,1fr)]">
        <section className={panel}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="h-4 w-4" />
              Upcoming Sessions
            </h2>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-green-800 hover:underline"
              onClick={() => go("sessions", { tab: "Upcoming" })}
            >
              View all sessions
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto rounded-md border border-[#e0e7f0]">
            <table
              aria-label="Upcoming sessions"
              className="w-full min-w-[580px] xl:min-w-0 table-fixed text-left text-[10px]"
            >
              <colgroup>
                {["16%", "16%", "13%", "12%", "11%", "12%", "10%", "10%"].map(
                  (width, i) => (
                    <col key={i} style={{ width }} />
                  ),
                )}
              </colgroup>
              <thead className="bg-[#f7f9fc]">
                <tr>
                  {[
                    "Learner",
                    "Service / Subject",
                    "Specific Topic",
                    "Date",
                    "Time",
                    "Session Type",
                    "Booking Status",
                    "Payment Status",
                  ].map((title) => (
                    <th
                      key={title}
                      className="px-1.5 py-2 text-[9px] font-semibold leading-3"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {upcoming.slice(0, 3).map((s) => (
                  <tr key={s.id} className="h-12">
                    <td className="px-1.5 py-2">
                      <button
                        type="button"
                        aria-label={`View session with ${s.learner}`}
                        className="flex items-center gap-1.5 text-left hover:text-green-800"
                        onClick={() => setSessionId(s.id)}
                      >
                        <Initials name={s.learner} />
                        <span className="break-words leading-[14px]">
                          {s.learner}
                        </span>
                      </button>
                    </td>
                    <td className="break-words px-1.5 py-2 leading-[14px]">
                      {s.service}
                    </td>
                    <td className="break-words px-1.5 py-2 leading-[14px] text-[#455780]">
                      {s.topic}
                    </td>
                    <td className="px-1.5 py-2 leading-[14px] text-[#455780]">
                      {dateLabel(s.date)}
                    </td>
                    <td className="px-1.5 py-2 leading-[14px] text-[#455780]">
                      {time(hour(s.start))} –<br />
                      {time(hour(s.end))}
                    </td>
                    <td className="px-1.5 py-2 leading-[14px] text-[#455780]">
                      {s.type}
                      {s.type === "Online" && (
                        <span className="block">{s.provider}</span>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      <Badge value={s.status} />
                    </td>
                    <td className="px-1 py-2">
                      <Badge value={s.payment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!upcoming.length && (
              <p className="p-6 text-center text-[#657599]">
                No upcoming sessions.
              </p>
            )}
          </div>
        </section>
        <section className={panel}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Zap className="h-4 w-4" />
            Quick Actions
          </h2>
          <div className="grid gap-2">
            {[
              [Plus, "Create Service", "services", { create: true }, false],
              [
                CalendarDays,
                "Manage Availability",
                "availability",
                { tab: "Tutoring Availability" },
                true,
              ],
              [
                CalendarDays,
                "View Class Schedule",
                "availability",
                { tab: "Class Schedule" },
                false,
              ],
            ].map(([Icon, label, view, args, gold]) => (
              <button
                type="button"
                key={label}
                className="flex min-h-11 items-center gap-3 rounded-md border border-[#e0e7f0] bg-[#fcfdfd] p-2 text-left text-xs font-medium hover:bg-green-50"
                onClick={() =>
                  args.create ? setCreating(true) : go(view, args)
                }
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-white ${gold ? "bg-amber-400" : "bg-green-800"}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{label}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[#657599]" />
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]">
        <section className={panel}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <CalendarDays className="h-4 w-4" />
            Availability Summary
          </h2>
          <button
            type="button"
            aria-label="View open availability"
            className="flex w-full items-center gap-2 pb-2 text-left hover:text-green-800"
            onClick={() =>
              go("availability", {
                tab: "Tutoring Availability",
                date: isoDate(next?.date || today),
              })
            }
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e7f4ed] text-green-800">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span>
              <b className="text-sm">{openCount} open slots this week</b>
              <span className="mt-1 block text-[11px] text-[#657599]">
                {next
                  ? `Next available: ${dateLabel(isoDate(next.date))}, ${time(next.start)}`
                  : "No available slots in the next two weeks"}
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="View confirmed class schedule"
            className="flex w-full items-center gap-2 border-t border-[#edf0f5] pt-2 text-left"
            onClick={() => go("availability", { tab: "Class Schedule" })}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100">
              <FileText className="h-5 w-5" />
            </span>
            <span className="text-[11px]">
              Class Schedule:{" "}
              <b className="text-green-800">Uploaded &amp; Confirmed</b>
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded bg-[#edf4f1] px-2 py-1.5 text-[10px]">
              <LockKeyhole className="h-3 w-3" />
              Confirmed
            </span>
          </button>
        </section>
        <section className={panel}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Bell className="h-4 w-4" />
            Recent Activity / Notifications
          </h2>
          <div className="divide-y divide-[#edf0f5]">
            {inbox.error && (
              <p role="alert" className="text-sm text-red-700">
                {inbox.error}
              </p>
            )}
            {[...activities]
              .sort((a, b) => String(b.time).localeCompare(String(a.time)))
              .slice(0, 5)
              .map((n) => {
                const Icon =
                  n.category === "Payments"
                    ? CreditCard
                    : n.category === "Messages"
                      ? MessageCircle
                      : CalendarCheck;
                return (
                  <button
                    type="button"
                    key={n.id}
                    aria-label={`Open notification: ${n.title}`}
                    className="flex w-full items-center gap-2 py-1 text-left hover:bg-green-50"
                    onClick={() => {
                      if (!n.read) void inbox.markRead([n]);
                      if (!n.read)
                        update((d) => ({
                          ...d,
                          notifications: d.notifications.map((v) =>
                            v.id === n.id ? { ...v, read: true } : v,
                          ),
                        }));
                      openActivity(n);
                    }}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#e7f4ed] text-green-800">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-[#657599]">
                        {n.text}
                      </span>
                    </span>
                    <time className="max-w-28 shrink-0 text-right text-[9px] leading-4 text-[#657599]">
                      {n.time}
                    </time>
                  </button>
                );
              })}
            {!activities.length && !inbox.error && (
              <p className="py-5 text-center text-[#657599]">
                No recent notifications.
              </p>
            )}
          </div>
        </section>
      </div>
      {sessionId && (
        <SessionDetails
          data={data}
          update={update}
          go={go}
          sessionId={sessionId}
          onClose={() => setSessionId(null)}
        />
      )}
      {transaction && (
        <TransactionDetails
          session={transaction}
          onClose={() => setTransactionId(null)}
          onSession={() => {
            setTransactionId(null);
            setSessionId(transaction.id);
          }}
        />
      )}
      {creating && (
        <CreateService
          data={data}
          saveService={saveService}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  );
}
