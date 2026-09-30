import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  MailCheck,
  MessageSquare,
  Search,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import { Modal, button, primary } from "./ui.jsx";
import { notificationDestination } from "./notificationTargets.js";

const appearance = {
  "Booking Confirmed": [CalendarCheck, "bg-green-700"],
  "Payment Confirmed": [CreditCard, "bg-amber-400"],
  "Reschedule Request": [CalendarClock, "bg-orange-500"],
  "New Message": [MessageSquare, "bg-green-700"],
  "Session Reminder": [Bell, "bg-blue-500"],
  "Service Status Update": [ShieldAlert, "bg-red-500"],
  "New Rating/Review": [Star, "bg-amber-400"],
  "Incident Report Update": [FileCheck2, "bg-[#4b6b91]"],
};
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function timestamp(value) {
  const date = new Date(value?.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? { label: value || "", iso: undefined }
    : {
        label: `${dateFormat.format(date)} · ${timeFormat.format(date)}`,
        iso: date.toISOString(),
      };
}

function ReadBadge({ read }) {
  return (
    <span
      className={`inline-flex min-w-14 justify-center rounded px-2 py-1 text-[10px] font-semibold ${read ? "bg-[#eef1f6] text-[#455780]" : "bg-[#daf2e3] text-green-900"}`}
    >
      {read ? "Read" : "Unread"}
    </span>
  );
}

export default function Notifications({ data, update, go, args = {} }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("All");
  const [selectedId, setSelectedId] = useState(args.notificationId ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const listRef = useRef(null);
  const unreadCount = data.notifications.filter((n) => !n.read).length;
  const selected = data.notifications.find((n) => n.id === selectedId);
  const destination = selected ? notificationDestination(selected) : null;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = data.notifications.filter((n) => {
    const searchable = [
      n.title,
      n.text,
      n.detail,
      n.category,
      n.time,
      timestamp(n.time).label,
    ]
      .join(" ")
      .toLowerCase();
    return (
      terms.every((term) => searchable.includes(term)) &&
      (category === "All" || n.category === category) &&
      (tab === "All" || (tab === "Read" ? n.read : !n.read))
    );
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);

  // Reserve room for the toolbar, feedback, and pagination on short desktops.
  // Mobile keeps natural document scrolling so notification text stays readable.
  useLayoutEffect(() => {
    const measure = () => {
      const top = listRef.current.getBoundingClientRect().top;
      setPageSize(
        window.innerWidth >= 1024
          ? Math.max(
              1,
              Math.min(8, Math.floor((window.innerHeight - top - 48) / 56)),
            )
          : 8,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(listRef.current.parentElement);
    observer.observe(listRef.current.closest("main").firstElementChild);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  function markRead(id, read) {
    update((d) => ({
      ...d,
      notifications: d.notifications.map((n) =>
        n.id === id ? { ...n, read } : n,
      ),
    }));
  }

  function clearFilters() {
    setQuery("");
    setCategory("All");
    setTab("All");
    setPage(1);
  }

  return (
    <section
      className="space-y-2 pb-1 text-xs text-[#101828]"
      aria-labelledby="notifications-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1
            id="notifications-heading"
            className="text-2xl font-bold tracking-tight"
          >
            Notifications
          </h1>
          <p className="mt-0.5 text-xs text-[#001ca8]">
            Stay updated on your tutoring services, sessions, payments, and
            account activity.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-[#dce4f1] bg-white px-3 py-2 text-xs font-semibold text-[#001ca8] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:text-slate-400"
          disabled={unreadCount === 0}
          onClick={() =>
            update((d) => ({
              ...d,
              notifications: d.notifications.map((n) => ({ ...n, read: true })),
            }))
          }
        >
          <MailCheck className="h-4 w-4" />
          Mark all as read
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#001ca8]" />
          <input
            aria-label="Search notifications"
            placeholder="Search notifications..."
            className="h-9 w-full rounded-md border border-[#dce4f1] bg-white pl-9 pr-9 text-xs outline-none placeholder:text-[#455780] focus:border-green-700 focus:ring-1 focus:ring-green-700"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear notification search"
              className="absolute right-0 top-0 grid h-9 w-9 place-items-center text-[#455780]"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative min-w-40 flex-1 sm:max-w-52">
          <select
            aria-label="Notification category"
            className="h-9 w-full appearance-none rounded-md border border-[#dce4f1] bg-white pl-3 pr-8 text-xs font-medium focus-visible:outline-green-700"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Notifications</option>
            {[
              ...new Set(
                data.notifications.map((n) => n.category).filter(Boolean),
              ),
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#001ca8]" />
        </div>
        <div
          role="group"
          aria-label="Notification read status"
          className="flex gap-2"
        >
          {["All", "Unread", "Read"].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${tab === t ? "bg-green-800 text-white" : "bg-[#f0f3f7] hover:bg-slate-200"}`}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
            >
              {t}
              {t === "Unread" && (
                <span
                  className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] ${tab === t ? "bg-white/20" : "bg-[#dfe4ec]"}`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        className="overflow-hidden rounded-lg border border-[#dce4f1] bg-white"
      >
        <ul className="divide-y divide-[#e0e7f0]" aria-label="Notifications">
          {visibleRows.map((n) => {
            const [Icon, color] = appearance[n.title] || [Bell, "bg-blue-500"];
            const date = timestamp(n.time);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  aria-label={`Open ${n.title}: ${n.text}`}
                  className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 px-3 py-2 text-left transition-colors hover:bg-[#e8f4ed] focus-visible:relative focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-700 lg:h-14 lg:grid-cols-[36px_minmax(0,1.35fr)_minmax(0,1fr)_142px_56px] lg:py-1.5 ${n.read ? "bg-white" : "bg-[#eff8f3]"}`}
                  onClick={() => {
                    if (!n.read) markRead(n.id, true);
                    const target = notificationDestination(n);
                    if (target) go(target.view, target.args);
                    else setSelectedId(n.id);
                  }}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm ${color}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="relative min-w-0 pl-3">
                    {!n.read && (
                      <span
                        className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-green-700"
                        aria-label="Unread"
                      />
                    )}
                    <span className="block text-xs font-bold leading-4 lg:truncate">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[#344675] lg:line-clamp-2">
                      {n.text}
                    </span>
                  </span>
                  <span className="col-start-2 row-start-2 min-w-0 text-[11px] leading-4 text-[#344675] lg:col-auto lg:row-auto lg:line-clamp-2">
                    {n.detail}
                  </span>
                  <time
                    dateTime={date.iso}
                    className="col-start-2 row-start-3 text-[10px] leading-4 text-[#344675] lg:col-auto lg:row-auto lg:text-[11px]"
                  >
                    {date.label}
                  </time>
                  <span className="col-start-3 row-start-1 lg:col-auto lg:row-auto">
                    <ReadBadge read={n.read} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!rows.length && (
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <Bell className="h-7 w-7 text-slate-400" />
            <p className="text-sm font-semibold">
              {data.notifications.length
                ? "No matching notifications"
                : "You're all caught up"}
            </p>
            <p className="text-xs text-[#455780]">
              {data.notifications.length
                ? "Try a different search, category, or read status."
                : "New updates will appear here."}
            </p>
            {(query || category !== "All" || tab !== "All") && (
              <button type="button" className={button} onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2 text-[11px] text-[#455780]">
        <p role="status" aria-live="polite">
          {rows.length
            ? `Showing ${start + 1}–${Math.min(start + pageSize, rows.length)} of ${rows.length} notifications`
            : "0 notifications"}
        </p>
        {totalPages > 1 && (
          <nav
            aria-label="Notification pages"
            className="flex items-center gap-2"
          >
            <button
              type="button"
              aria-label="Previous notifications"
              className={`${button} inline-flex items-center gap-1`}
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              aria-label="Next notifications"
              className={`${button} inline-flex items-center gap-1`}
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </nav>
        )}
      </div>

      {selected && (
        <Modal title={selected.title} onClose={() => setSelectedId(null)}>
          <div className="space-y-4 p-1 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ReadBadge read={selected.read} />
              <time
                dateTime={timestamp(selected.time).iso}
                className="text-xs text-[#455780]"
              >
                {timestamp(selected.time).label}
              </time>
            </div>
            <p className="break-words leading-6">{selected.text}</p>
            <p className="break-words rounded-lg bg-slate-50 p-3 text-xs leading-5 text-[#344675]">
              {selected.detail}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={button}
                onClick={() => markRead(selected.id, !selected.read)}
              >
                {selected.read ? "Mark as unread" : "Mark as read"}
              </button>
              {destination && (
                <button
                  type="button"
                  className={`${primary} inline-flex items-center gap-2`}
                  onClick={() => go(destination.view, destination.args)}
                >
                  {destination.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
