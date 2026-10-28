import { listMyReports } from "../../../services/myReports.js";
import "./sessions.css";
// My Sessions: loads the signed-in learner's paid sessions and groups them by their time-based lifecycle.
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
  Flag,
  XCircle,
} from "lucide-react";

const tabs = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

export default function LearnerSessions({ args = {} }) {
  const work = useLearnerWorkspace();
  const [records, setRecords] = useState([]);
  const [filedReports, setFiledReports] = useState([]);
  const [reportsError, setReportsError] = useState("");
  useEffect(() => {
    let active = true;
    async function loadReports() {
      try {
        const snapshot = await listMyReports();
        if (active) {
          setFiledReports(snapshot.created || []);
          setReportsError("");
        }
      } catch {
        if (active)
          setReportsError("Report links are temporarily unavailable.");
      }
    }
    loadReports();
    window.addEventListener("focus", loadReports);
    window.addEventListener("campustutor:sessions-changed", loadReports);
    return () => {
      active = false;
      window.removeEventListener("focus", loadReports);
      window.removeEventListener("campustutor:sessions-changed", loadReports);
    };
  }, []);
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
    args.tab === "Done"
      ? "Completed"
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
    if (
      session.bookingStatus === "Cancelled" ||
      session.bookingStatus === "Canceled"
    )
      return "Cancelled";
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
    activeTab,
    selectedDate,
    selectedStatus,
  );
  const tabCount = liveRecords.filter(
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
                liveRecords.filter((session) => session.lifecycle === tab)
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
            completedAt,
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
            <article key={id} className="learner-session-card">
              <div className="text-center font-bold text-[#087542]">
                <p className="text-xs">{month}</p>
                <p className="text-2xl text-[#101828]">{day}</p>
                <p className="whitespace-nowrap text-xs">{weekday}</p>
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
              </div>
              <div className="text-center">
                <p className="whitespace-nowrap text-base font-bold">{price}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatus === "Paid" ? "bg-[#dff8e8] text-[#087542]" : "bg-[#e7f3ff] text-[#1675df]"}`}
                >
                  {paymentStatus}
                </span>
                {lifecycle === "Completed" && (
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    Completed
                  </span>
                )}
              </div>
              <div className="learner-session-actions">
                <div className="grid grid-cols-2 gap-2">
                  {canManage && mode === "Online" && (
                    <button
                      onClick={() =>
                        act(
                          "meeting",
                          records.find((session) => session.id === id),
                        )
                      }
                      type="button"
                      className="col-span-2 min-h-8 px-2 py-1 rounded-md bg-[#075d34] text-xs font-semibold text-white"
                    >
                      {mode === "Online" && (
                        <Video className="mr-2 inline h-4 w-4" />
                      )}
                      Open External Meeting{" "}
                      <ExternalLink className="inline h-4 w-4" />
                    </button>
                  )}
                  {(canManage || lifecycle === "Completed") && (
                    <button
                      disabled={
                        lifecycle === "Completed" &&
                        (!completedAt ||
                          now.getTime() >=
                            new Date(completedAt).getTime() +
                              24 * 60 * 60 * 1000)
                      }
                      title={
                        lifecycle === "Completed"
                          ? "Messaging is available for 24 hours after session completion."
                          : undefined
                      }
                      onClick={() =>
                        work.message({
                          name,
                          bookingId: records.find(
                            (session) => session.id === id,
                          )?.bookingId,
                        })
                      }
                      type="button"
                      className="col-span-2 min-h-8 px-2 py-1 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
                    >
                      <MessageCircle className="mr-2 inline h-4 w-4" />
                      Message Tutor
                    </button>
                  )}
                  {canManage && lifecycle === "Upcoming" && (
                    <button
                      type="button"
                      onClick={() =>
                        act(
                          "cancel",
                          records.find((session) => session.id === id),
                        )
                      }
                      className="min-h-8 rounded-md border border-red-200 px-1 py-0.5 text-xs font-semibold text-red-700"
                    >
                      <XCircle className="mr-2 inline h-4 w-4" />
                      Cancel Session
                    </button>
                  )}
                  {lifecycle !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() =>
                        act(
                          "report",
                          records.find((session) => session.id === id),
                        )
                      }
                      className="report-issue-button min-h-8 rounded-md border border-[#dfe5ed] px-1 py-0.5 text-xs font-semibold"
                    >
                      <Flag className="mr-2 inline h-4 w-4" />
                      Report an Issue
                    </button>
                  )}
                  {filedReports
                    .filter((report) => String(report.booking_id) === id)
                    .map((report) => (
                      <button
                        key={report.report_id}
                        type="button"
                        className="col-span-2 min-h-8 rounded-md border border-[#15924f] px-2 py-1 text-xs font-semibold text-[#087542]"
                        onClick={() =>
                          work.go("reports", {
                            tab: "created",
                            reportId: String(report.report_id),
                          })
                        }
                      >
                        <Flag className="h-4 w-4" /> Report filed (IR-
                        {report.report_id})
                      </button>
                    ))}
                  {lifecycle === "Cancelled" && reportsError && (
                    <p
                      role="status"
                      className="col-span-2 text-xs text-slate-500"
                    >
                      {reportsError}
                    </p>
                  )}
                  {lifecycle === "Completed" && (
                    <button
                      type="button"
                      className="col-span-2 min-h-8 rounded-md border border-[#15924f] px-2 py-1 text-xs font-semibold text-[#087542]"
                      onClick={() =>
                        act(
                          "review",
                          records.find((session) => session.id === id),
                        )
                      }
                    >
                      <Star className="h-4 w-4" />
                      {work.data.reviews.some(
                        (review) => review.sessionId === id,
                      )
                        ? "Edit Review"
                        : "Rate & Review Tutor"}
                    </button>
                  )}

                  <button
                    onClick={() =>
                      act(
                        "details",
                        records.find((session) => session.id === id),
                      )
                    }
                    className="col-span-2 min-h-8 px-2 py-1 rounded-md border border-[#dfe5ed] text-xs font-semibold"
                  >
                    <View className="mr-2 inline h-4 w-4" />
                    View Session
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
