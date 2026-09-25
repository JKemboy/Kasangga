import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
import { useEffect, useState } from "react";
import {
  filterNotifications,
  markNotificationsRead,
} from "./notificationFilters.js";
import {
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  GraduationCap,
  Info,
  Mail,
  MessageCircle,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";

const notifications = [
  [
    CalendarCheck,
    "Booking Confirmed",
    "Your tutoring session with Maria Angelica R. for Calculus 1 - Derivatives on May 20, 2026 at 2:00 PM has been confirmed.",
    "10:24 AM",
    "bg-[#e5f8ec] text-[#087542]",
    true,
  ],
  [
    MessageCircle,
    "New Message",
    "Maria Angelica R. sent you a new message.",
    "9:15 AM",
    "bg-[#e7f3ff] text-[#1675df]",
    true,
  ],
  [
    BriefcaseBusiness,
    "Payment Successful",
    "Your payment of ₱400.00 for your session with Maria Angelica R. was successful.",
    "Yesterday, 8:32 PM",
    "bg-[#fff1d6] text-[#e99d00]",
    true,
  ],
  [
    CalendarDays,
    "Upcoming Session Reminder",
    "You have an upcoming session with John Michael P. for Statistics - Probability on May 22, 2026 at 10:00 AM.",
    "May 21, 2026, 7:00 PM",
    "bg-[#f0eaff] text-[#713de0]",
  ],
  [
    UserRound,
    "Booking Request Accepted",
    "John Michael P. accepted your booking request for Statistics - Probability.",
    "May 21, 2026, 4:18 PM",
    "bg-[#fff1d6] text-[#e99d00]",
  ],
  [
    Star,
    "Review Reminder",
    "Don't forget to leave a review for your completed session with Janine Claire T.",
    "May 20, 2026, 6:30 PM",
    "bg-[#fde9f8] text-[#e545bb]",
  ],
  [
    GraduationCap,
    "Tutor Application Update",
    "Your tutor application is under review. We'll notify you once there's an update.",
    "May 18, 2026, 11:12 AM",
    "bg-[#e5f8ec] text-[#087542]",
  ],
  [
    ShieldCheck,
    "System Notification",
    "Scheduled maintenance will occur on May 25, 2026 from 12:00 AM to 2:00 AM.",
    "May 17, 2026, 9:00 AM",
    "bg-[#f0f1f3] text-[#64748b]",
  ],
  [
    CircleAlert,
    "Incident Report Update",
    "Your report #IR-2026-001 has been received and is now under review by OSAS.",
    "May 16, 2026, 3:45 PM",
    "bg-[#ffebeb] text-red-600",
  ],
];
const filters = [
  [Bell, "All Notifications"],
  [Mail, "Unread"],
  [CalendarDays, "Sessions"],
  [BriefcaseBusiness, "Payments"],
  [MessageCircle, "Messages"],
  [Star, "Reviews"],
  [Info, "System"],
];
const categories = [
  "Sessions",
  "Messages",
  "Payments",
  "Sessions",
  "Sessions",
  "Reviews",
  "System",
  "System",
  "System",
];
const initialNotifications = notifications.map(
  ([Icon, title, text, time, color, unread], index) => ({
    id: title,
    Icon,
    title,
    text,
    time,
    color,
    unread: Boolean(unread),
    category: categories[index],
  }),
);
const storageKey = "campustutor:learner:sample-notification-read-ids";

export default function LearnerNotifications({ onOpenSettings }) {
 const work=useLearnerWorkspace();
  const [items, setItems] = useState(() => {
    try {
      const readIds = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      return Array.isArray(readIds)
        ? initialNotifications.map((item) =>
            readIds.includes(item.id) ? { ...item, unread: false } : item,
          )
        : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });
  const [activeFilter, setActiveFilter] = useState("All Notifications");
  const [expandedId, setExpandedId] = useState(null);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify(
          items.filter((item) => !item.unread).map((item) => item.id),
        ),
      );
    } catch {
      /* Keep in-memory state when storage is unavailable. */
    }
  }, [items]);
  const visibleItems = filterNotifications(items, activeFilter);
  const unreadCount = filterNotifications(items, "Unread").length;
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Notifications
      </h1>
      <p className="mt-1 text-xs font-medium text-[#566aa3]">
        Stay updated with your sessions, messages, and account activity.
      </p>
      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="min-w-0">
          <nav
            aria-label="Notification categories"
            className="flex flex-wrap gap-x-4 gap-y-1 border-b border-[#dfe5ed] text-xs font-semibold text-[#637191]"
          >
            {filters.map(([, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={activeFilter === label}
                onClick={() => setActiveFilter(label)}
                className={`border-b-2 pb-2 ${activeFilter === label ? "border-[#087542] text-[#087542]" : "border-transparent"}`}
              >
                {label === "All Notifications" ? "All" : label} (
                {filterNotifications(items, label).length})
              </button>
            ))}
          </nav>
          {visibleItems.length === 0 && (
            <p
              role="status"
              className="mt-2 rounded-xl border border-[#e0e7f0] bg-white p-6 text-center text-sm text-[#637191]"
            >
              {activeFilter === "Unread"
                ? "You're all caught up. No unread notifications."
                : "No notifications in this category."}
            </p>
          )}
          <div className="mt-2 overflow-hidden rounded-xl border border-[#e0e7f0] bg-white">
            {visibleItems.map(
              ({ id, Icon, title, text, time, color, unread }) => (
                <button
                  key={id}
                  type="button"
                  aria-expanded={expandedId === id}
                  aria-label={`${title}, ${unread ? "unread" : "read"}`}
                  onClick={() => {
                    setItems((current) => markNotificationsRead(current, id));
                    setExpandedId((current) => (current === id ? null : id));
                    if(title==="New Message")work.message({name:"Maria Angelica R."});
                    else if(title.includes("Application"))work.open("application");
                    else if(title.includes("Review"))work.go("reviews");
                    else if(title.includes("Booking")||title.includes("Session")||title.includes("Payment"))work.go("sessions");
                    else work.open("article",{title,body:text});
                  }}
                  className={`flex w-full items-center gap-2 border-b border-[#e7edf3] px-3 py-2 text-left last:border-b-0 ${unread ? "bg-[#f3fbf6]" : ""}`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[#101828]">
                      {title}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs text-[#566584] ${expandedId === id ? "whitespace-normal break-words" : "truncate"}`}
                    >
                      {text}
                    </span>
                  </span>
                  <span className="w-20 shrink-0 text-right text-[11px] leading-4 xl:w-32 text-[#637191]">
                    {time}
                  </span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${unread ? "bg-[#087542]" : "bg-slate-300"}`}
                  />
                </button>
              ),
            )}
          </div>
          <p
            aria-live="polite"
            className="mt-2 text-center text-xs text-[#637191]"
          >
            Showing {visibleItems.length} of {items.length} notifications
          </p>
        </div>
        <aside className="space-y-2">
          <section className="rounded-lg bg-[linear-gradient(145deg,#effaf3,#e6f6ee)] p-3 text-center">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white text-[#087542]">
              <Bell className="h-4 w-4 fill-[#087542]" />
            </span>
            <h2 className="mt-2 text-sm font-bold">Stay Informed</h2>
            <p className="mt-2 text-xs leading-4 text-[#566584]">
              Enable notifications to never miss important updates about your
              sessions, payments, and messages.
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-2 h-8 w-full rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
            >
              Notification Settings
            </button>
          </section>
          <section className="rounded-lg border border-[#e1e7ef] bg-white p-3">
            <h2 className="text-sm font-bold">Notification Filters</h2>
            <div className="mt-2 space-y-1">
              {filters.map(([Icon, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={activeFilter === label}
                  onClick={() => setActiveFilter(label)}
                  className={`flex h-7 w-full items-center gap-2 rounded-md px-3 text-xs font-medium ${activeFilter === label ? "bg-[#effaf3] text-[#087542]" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <span className="ml-auto">
                    {filterNotifications(items, label).length}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-[#e1e7ef] bg-white p-3">
            <h2 className="text-sm font-bold">Mark as Read</h2>
            <p className="mt-2 text-xs text-[#637191]">
              Mark all notifications as read.
            </p>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() =>
                setItems((current) => markNotificationsRead(current))
              }
              className="disabled:cursor-not-allowed disabled:opacity-50 mt-2 flex h-7 w-full items-center justify-center gap-2 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
            >
              <Mail className="h-4 w-4" />
              Mark All as Read
            </button>
          </section>
        </aside>
      </div>
    </section>
  );
}
