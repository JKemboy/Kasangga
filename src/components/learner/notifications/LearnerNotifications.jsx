import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { useState } from "react";
import { filterNotifications } from "./notificationFilters.js";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import useBookingInbox from "../../../services/useBookingInbox.js";
import FollowUpEvidence from "../../shared/FollowUpEvidence.jsx";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Info,
  Mail,
  MessageCircle,
  Star,
} from "lucide-react";

const filters = [
  [Bell, "All Notifications"],
  [Mail, "Unread"],
  [CalendarDays, "Sessions"],
  [BriefcaseBusiness, "Payments"],
  [MessageCircle, "Messages"],
  [Star, "Reviews"],
  [Info, "System"],
];
export default function LearnerNotifications() {
  const work = useLearnerWorkspace();
  const auth = useAuth();
  const inbox = useBookingInbox("learner", auth?.user?.id);
  const items = inbox.notifications.map((notification) => ({
    ...notification,
    Icon: notification.kind === "message" ? MessageCircle : CalendarDays,
    color:
      notification.kind === "message"
        ? "bg-blue-100 text-blue-700"
        : "bg-green-100 text-green-700",
    unread: !notification.read,
  }));
  const [activeFilter, setActiveFilter] = useState("All Notifications");
  const [expandedId, setExpandedId] = useState(null);
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
      {inbox.error && (
        <p
          role="alert"
          className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {inbox.error}
        </p>
      )}
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
                    const notification = items.find((item) => item.id === id);
                    if (notification) inbox.markRead([notification]);
                    setExpandedId((current) => (current === id ? null : id));
                    if (notification?.view === "messages")
                      work.message({
                        name: notification.title.replace(
                          /^New message from /,
                          "",
                        ),
                        bookingId: notification.bookingId,
                      });
                    else work.go("sessions", notification?.args || {});
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
          {items.find((item) => item.id === expandedId)?.notificationType ===
            "case_evidence_requested" && (
            <FollowUpEvidence
              key={expandedId}
              caseId={items.find((item) => item.id === expandedId).entityId}
            />
          )}
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
                inbox.markRead(items.filter((item) => item.unread))
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
