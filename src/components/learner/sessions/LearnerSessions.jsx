import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { filterSessions } from "./sessionFilters.js";
import { listLearnerSessions } from "../../../services/learnerSessions.js";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
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
} from "lucide-react";

const tabs = ["Upcoming", "Ongoing", "Done"];

export default function LearnerSessions({ args = {} }) {
  const work = useLearnerWorkspace();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setLoadError("");
    try {
      const sessions = await listLearnerSessions();
      if (current === request.current) setRecords(sessions);
    } catch (error) {
      if (current === request.current)
        setLoadError(error.message || "Unable to load your sessions.");
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener("campustutor:sessions-changed", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      request.current++;
      window.clearInterval(timer);
      window.removeEventListener("campustutor:sessions-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  function act(kind, source) {
    work.open(kind, {
      ...source,
      subject: source.subject,
      time: source.time,
      link: source.link,
    });
  }
  const [activeTab, setActiveTab] = useState(
    args.tab === "Completed"
      ? "Done"
      : tabs.includes(args.tab)
        ? args.tab
        : "Upcoming",
  );
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const now = new Date();
  const lifecycleFor = (session) => {
    if (session.bookingStatus === "Completed") return "Completed";
    const start = new Date(session.startAt);
    const end = new Date(session.endAt);
    return now < start
      ? "Upcoming"
      : now < end
        ? "Ongoing"
        : "Awaiting Completion";
  };
  const liveRecords = records.map((session) => ({
    ...session,
    lifecycle: lifecycleFor(session),
  }));
  const visibleSessions = filterSessions(
    liveRecords,
    activeTab === "Done" ? "Completed" : activeTab,
    selectedDate,
    selectedStatus,
  );
  const tabCount = liveRecords.filter(
    (session) =>
      session.lifecycle === (activeTab === "Done" ? "Completed" : activeTab),
  ).length;
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        My Sessions
      </h1>
      <p className="mt-1 text-xs font-medium text-[#173a9b]">
        Manage your tutoring sessions and track your learning progress.
      </p>
      {loadError && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {loadError}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={refresh}
          >
            Retry
          </button>
        </p>
      )}
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
                liveRecords.filter(
                  (session) =>
                    session.lifecycle === (tab === "Done" ? "Completed" : tab),
                ).length
              }
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
              {[...new Set(records.map((session) => session.date))].map(
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
                ...new Set(records.map((session) => session.paymentStatus)),
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
      {loading ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#e0e7f0] bg-white p-6 text-center text-sm text-[#637191]"
        >
          Loading your booked sessions...
        </p>
      ) : (
        visibleSessions.length === 0 && (
          <div
            role="status"
            className="mt-2 rounded-xl border border-[#e0e7f0] bg-white p-6 text-center text-sm text-[#637191]"
          >
            {tabCount === 0
              ? `No ${activeTab.toLowerCase()} sessions yet.`
              : "No sessions match these filters. Try another date or status, or clear the filters."}
          </div>
        )
      )}
      <div className="mt-2 space-y-1">
        {visibleSessions.map(
          ({
            id,
            tutorUserId,
            lifecycle,
            paymentStatus,
            canManage,
            duration,
            link,
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
              key={id}
              className="grid grid-cols-2 items-center gap-3 rounded-xl border border-[#e0e7f0] bg-white p-2 text-xs [&>div]:min-w-0 [&>div]:break-words sm:grid-cols-3 lg:grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_55px_150px] lg:gap-2"
            >
              <div className="text-center font-bold text-[#087542]">
                <p className="text-xs">{month}</p>
                <p className="text-2xl text-[#101828]">{day}</p>
                <p className="text-xs">{weekday}</p>
                <p className="mt-1 text-xs text-[#637191]">{date.slice(-4)}</p>
              </div>
              <div className="flex items-center gap-2">
                <PortalAvatar
                  name={name}
                  userId={tutorUserId}
                  className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-base font-bold text-[#405276]"
                />
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
                  {duration} {Number(duration) === 1 ? "hour" : "hours"}
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
                {mode === "Online" && link && (
                  <p className="text-xs text-blue-600">
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      Open meeting link{" "}
                      <ExternalLink className="inline h-3.5 w-3.5" />
                    </a>
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-base font-bold">{price}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatus === "Paid" ? "bg-[#dff8e8] text-[#087542]" : "bg-[#e7f3ff] text-[#1675df]"}`}
                >
                  {paymentStatus}
                </span>
                {lifecycle === "Completed" && (
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    Done
                  </span>
                )}
              </div>
              <div className="col-span-2 border-t border-[#e1e7ef] pt-2 sm:col-span-3 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
                  {canManage && mode === "Online" && (
                    <button
                      onClick={() =>
                        act(
                          "meeting",
                          records.find((session) => session.id === id),
                        )
                      }
                      type="button"
                      className="min-h-6 px-1 py-0.5 rounded-md bg-[#075d34] text-xs font-semibold text-white"
                    >
                      {mode === "Online" && (
                        <Video className="mr-2 inline h-4 w-4" />
                      )}
                      Join Session <ExternalLink className="inline h-4 w-4" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() =>
                        work.message({
                          name,
                          bookingId: records.find(
                            (session) => session.id === id,
                          )?.bookingId,
                        })
                      }
                      type="button"
                      className="min-h-6 px-1 py-0.5 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
                    >
                      <MessageCircle className="mr-2 inline h-4 w-4" />
                      Message Tutor
                    </button>
                  )}
                  <button
                    onClick={() =>
                      act(
                        "details",
                        records.find((session) => session.id === id),
                      )
                    }
                    className="min-h-6 px-1 py-0.5 rounded-md border border-[#dfe5ed] text-xs font-semibold"
                  >
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
