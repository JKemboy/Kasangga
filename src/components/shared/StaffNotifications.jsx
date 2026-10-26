import { useState } from "react";
import {
  Bell,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { button } from "../tutor/workspace/ui.jsx";

const groups = {
  tutor_applications: ["Tutor Verification", ShieldCheck, "bg-violet-600"],
  payments: ["Payments", CreditCard, "bg-amber-500"],
  refunds: ["Payments", CreditCard, "bg-amber-500"],
  bookings: ["Bookings & Sessions", CalendarDays, "bg-green-700"],
  services: ["Services", FileText, "bg-blue-500"],
  incident_reports: ["Safety and Reports", ShieldCheck, "bg-red-500"],
  cases: ["Cases", ShieldCheck, "bg-violet-600"],
  incident_evidence: ["Evidence", FileText, "bg-blue-500"],
  clearance_reviews: ["Clearance", ShieldCheck, "bg-green-700"],
  policies: ["Policies", FileText, "bg-blue-500"],
  support_conversations: ["Support", Bell, "bg-blue-500"],
};
const appearance = (row) =>
  groups[row.entityType] || [row.category || "System", Bell, "bg-blue-500"];
const timestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};

export default function StaffNotifications({
  rows = [],
  subtitle,
  error,
  loading,
  onRead,
  onOpen,
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const unread = rows.filter((row) => !row.read).length;
  const categories = [...new Set(rows.map((row) => appearance(row)[0]))].sort();
  const filtered = rows
    .filter(
      (row) =>
        (tab === "All" || (tab === "Read" ? row.read : !row.read)) &&
        (category === "All" || appearance(row)[0] === category) &&
        `${row.title} ${row.text} ${row.detail || ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  const start = (current - 1) * 10;
  const visible = filtered.slice(start, start + 10);
  const change = (setter, value) => {
    setter(value);
    setPage(1);
  };
  async function open(row) {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (!row.read && (await onRead([row.id])) === false) return;
      onOpen?.(row);
    } catch (cause) {
      setActionError(cause.message || "Could not open this notification.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-2 pb-1 text-xs text-[#101828]"
      aria-label="Notifications"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-0.5 text-xs text-[#001ca8]">{subtitle}</p>
      </div>
      {(error || actionError) && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {actionError || error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#001ca8]" />
          <input
            aria-label="Search notifications"
            placeholder="Search notifications..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
            className="h-9 w-full rounded-md border border-[#dce4f1] bg-white pl-9 pr-9 text-xs outline-none placeholder:text-[#455780] focus:border-green-700 focus:ring-1 focus:ring-green-700"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear notification search"
              onClick={() => change(setQuery, "")}
              className="absolute right-0 top-0 grid h-9 w-9 place-items-center text-[#455780]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="relative min-w-40 flex-1 sm:max-w-52">
          <select
            aria-label="Notification category"
            value={category}
            onChange={(e) => change(setCategory, e.target.value)}
            className="h-9 w-full appearance-none rounded-md border border-[#dce4f1] bg-white pl-3 pr-8 text-xs font-medium focus-visible:outline-green-700"
          >
            <option value="All">All Notifications</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
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
              onClick={() => change(setTab, t)}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold focus-visible:outline-green-700 ${tab === t ? "bg-green-800 text-white" : "bg-[#f0f3f7] hover:bg-slate-200"}`}
            >
              {t}
              {t === "Unread" && (
                <span
                  className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] ${tab === t ? "bg-white/20" : "bg-[#dfe4ec]"}`}
                >
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#dce4f1] bg-white">
        <ul className="divide-y divide-[#e0e7f0]" aria-label="Notifications">
          {visible.map((row) => {
            const [group, Icon, color] = appearance(row);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => open(row)}
                  aria-label={`Open ${row.title}: ${row.text}`}
                  className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 px-3 py-2 text-left transition-colors hover:bg-[#e8f4ed] focus-visible:relative focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-700 lg:min-h-14 lg:grid-cols-[36px_minmax(0,1.35fr)_minmax(0,1fr)_142px_56px] lg:py-1.5 ${row.read ? "bg-white" : "bg-[#eff8f3]"}`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm ${color}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="relative min-w-0 pl-3">
                    {!row.read && (
                      <span
                        aria-label="Unread"
                        className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-green-700"
                      />
                    )}
                    <span className="block text-xs font-bold leading-4 lg:truncate">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[#344675] lg:line-clamp-2">
                      {row.text}
                    </span>
                  </span>
                  <span className="col-start-2 row-start-2 min-w-0 text-[11px] leading-4 text-[#344675] lg:col-auto lg:row-auto lg:line-clamp-2">
                    {row.detail || group}
                  </span>
                  <time
                    dateTime={row.time}
                    className="col-start-2 row-start-3 text-[10px] leading-4 text-[#344675] lg:col-auto lg:row-auto lg:text-[11px]"
                  >
                    {timestamp(row.time)}
                  </time>
                  <span
                    className={`col-start-3 row-start-1 rounded-full px-2 py-1 text-center text-[10px] font-semibold lg:col-auto lg:row-auto ${row.read ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-800"}`}
                  >
                    {row.read ? "Read" : "Unread"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!visible.length && (
          <div
            role="status"
            className="grid justify-items-center gap-2 px-4 py-10 text-center"
          >
            <Bell className="h-7 w-7 text-slate-400" />
            <p className="text-sm font-semibold">
              {loading
                ? "Loading notifications..."
                : rows.length
                  ? "No matching notifications"
                  : "You're all caught up"}
            </p>
            <p className="text-xs text-[#455780]">
              {rows.length
                ? "Try a different search, category, or read status."
                : "New updates will appear here."}
            </p>
          </div>
        )}
      </div>
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2 text-[11px] text-[#455780]">
        <p role="status" aria-live="polite">
          {filtered.length
            ? `Showing ${start + 1}-${Math.min(start + 10, filtered.length)} of ${filtered.length} notifications`
            : "0 notifications"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={button}
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {current} / {pages}
          </span>
          <button
            type="button"
            className={button}
            aria-label="Next page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
