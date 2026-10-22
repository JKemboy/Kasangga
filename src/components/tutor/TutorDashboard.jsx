import MyReports from "./workspace/MyReports.jsx";
import AccountSettings from "../shared/AccountSettings.jsx";
// Tutor portal coordinator: loads tutor profile, services, availability, class schedule, and sessions, then routes to each tutor section.
import { tutorScheduleReady } from "./workspace/scheduleAccess.js";
import {
  loadTutorInformation,
  saveTutorInformation,
} from "../../services/tutorInformation.js";
import { listTutorSessions } from "../../services/tutorSessions.js";
import { sessionLifecycle } from "../../services/sessionLifecycle.js";
import {
  listTutorServices,
  saveTutorService,
  setTutorServiceStatus,
} from "../../services/tutorServices.js";
import {
  deactivateTutorAvailability,
  listTutorAvailability,
  saveTutorAvailability,
} from "../../services/tutorAvailability.js";
import {
  listTutorClassSchedule,
  saveTutorClassSchedule,
} from "../../services/tutorSchedule.js";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { workspaceProfile } from "../../services/authAccount.js";
import { TutorModalContext } from "./workspace/ui.jsx";
import StudentShell from "../shared/StudentShell.jsx";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Home,
  Boxes,
  CalendarDays,
  CalendarClock,
  Flag,
  MessageCircle,
  Wallet,
  Bell,
  UserRound,
  ShieldQuestion,
  X,
  Search,
} from "lucide-react";
import { seed } from "./workspace/data.js";
import Services from "./workspace/Services.jsx";
import Availability from "./workspace/Availability.jsx";
import { Overview, Sessions, Earnings } from "./workspace/SessionPages.jsx";
import { Messages, Notifications, Profile } from "./workspace/AccountPages.jsx";
import Help from "./workspace/Help.jsx";
import { input, matches } from "./workspace/ui.jsx";
const nav = [
  ["dashboard", "Dashboard", Home],
  ["services", "My Services", Boxes],
  ["availability", "Availability & Schedule", CalendarClock],
  ["sessions", "My Sessions", CalendarDays],
  ["messages", "Messages", MessageCircle],
  ["earnings", "Earnings", Wallet],
  ["notifications", "Notifications", Bell],
  ["profile", "Profile", UserRound],
  ["reports", "My Reports", Flag],
  ["help", "Help & Safety", ShieldQuestion],
];
export default function TutorDashboardPage() {
  const auth = useAuth();
  const [data, setData] = useState(() => ({
      ...structuredClone(seed),
      services: [],
      profile: {
        ...seed.profile,
        ...workspaceProfile(auth.profile, auth.user),
      },
    })),
    [view, setView] = useState("dashboard"),
    [args, setArgs] = useState({}),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [searching, setSearching] = useState(false),
    [revision, setRevision] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true),
    [tutorProfileError, setTutorProfileError] = useState("");
  const profileRequest = useRef(0);
  const refreshTutorInformation = useCallback(async () => {
    const current = ++profileRequest.current;
    setProfileLoading(true);
    try {
      const info = await loadTutorInformation();
      if (current === profileRequest.current) {
        setData((previous) => ({
          ...previous,
          profile: { ...previous.profile, ...info },
        }));
        setTutorProfileError("");
      }
    } catch (error) {
      if (current === profileRequest.current)
        setTutorProfileError(error.message);
    } finally {
      if (current === profileRequest.current) setProfileLoading(false);
    }
  }, [auth.user.id]);
  useEffect(() => {
    refreshTutorInformation();
    window.addEventListener("focus", refreshTutorInformation);
    return () => {
      profileRequest.current++;
      window.removeEventListener("focus", refreshTutorInformation);
    };
  }, [refreshTutorInformation]);
  async function persistTutorInformation(values) {
    // Each section calls these dashboard callbacks so account data is saved
    // once through the matching Supabase service and then refreshed in memory.
    requireSchedule();
    const info = await saveTutorInformation(values);
    profileRequest.current++;
    setData((previous) => ({
      ...previous,
      profile: { ...previous.profile, ...info },
    }));
    setProfileLoading(false);
    setTutorProfileError("");
    setNotice("Tutor information saved.");
    return info;
  }
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const request = useRef(0);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const availabilityRequest = useRef(0);
  const [classScheduleLoading, setClassScheduleLoading] = useState(true);
  const [classScheduleError, setClassScheduleError] = useState("");
  const classScheduleRequest = useRef(0);
  const scheduleLocked = !tutorScheduleReady(
    data,
    classScheduleLoading,
    classScheduleError,
  );
  function requireSchedule() {
    if (scheduleLocked)
      throw new Error(
        "Upload and confirm your class schedule to unlock Tutor sections.",
      );
  }
  useEffect(() => {
    if (scheduleLocked && !["dashboard", "availability"].includes(view)) {
      setView("dashboard");
      setArgs({});
    }
  }, [scheduleLocked, view]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState("");
  const sessionsRequest = useRef(0);
  const refreshSessions = useCallback(async () => {
    const current = ++sessionsRequest.current;
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const sessions = await listTutorSessions();
      if (current === sessionsRequest.current)
        setData((d) => ({ ...d, sessions }));
    } catch (error) {
      if (current === sessionsRequest.current) setSessionsError(error.message);
    } finally {
      if (current === sessionsRequest.current) setSessionsLoading(false);
    }
  }, [auth.user.id]);
  useEffect(() => {
    refreshSessions();
    window.addEventListener("focus", refreshSessions);
    const timer = window.setInterval(refreshSessions, 15000);
    window.addEventListener("campustutor:sessions-changed", refreshSessions);
    return () => {
      sessionsRequest.current++;
      window.clearInterval(timer);
      window.removeEventListener(
        "campustutor:sessions-changed",
        refreshSessions,
      );
      window.removeEventListener("focus", refreshSessions);
    };
  }, [refreshSessions, view]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setData((current) => ({
        ...current,
        sessions: current.sessions.map((session) => ({
          ...session,
          lifecycle: sessionLifecycle(session),
        })),
      }));
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);
  const refreshServices = useCallback(async () => {
    const current = ++request.current;
    setServicesLoading(true);
    setServicesError("");
    try {
      const services = await listTutorServices();
      if (current === request.current) setData((d) => ({ ...d, services }));
    } catch (error) {
      if (current === request.current) setServicesError(error.message);
    } finally {
      if (current === request.current) setServicesLoading(false);
    }
  }, [auth.user.id]);
  const refreshAvailability = useCallback(async () => {
    const current = ++availabilityRequest.current;
    setAvailabilityLoading(true);
    setAvailabilityError("");
    try {
      const slots = await listTutorAvailability(undefined, data.services);
      if (current === availabilityRequest.current)
        setData((d) => ({ ...d, slots }));
    } catch (error) {
      if (current === availabilityRequest.current)
        setAvailabilityError(error.message);
    } finally {
      if (current === availabilityRequest.current)
        setAvailabilityLoading(false);
    }
  }, [auth.user.id, data.services]);
  const refreshClassSchedule = useCallback(async () => {
    const current = ++classScheduleRequest.current;
    setClassScheduleLoading(true);
    setClassScheduleError("");
    try {
      const classSchedule = await listTutorClassSchedule();
      if (current === classScheduleRequest.current)
        setData((d) => ({ ...d, classSchedule }));
    } catch (error) {
      if (current === classScheduleRequest.current)
        setClassScheduleError(error.message);
    } finally {
      if (current === classScheduleRequest.current)
        setClassScheduleLoading(false);
    }
  }, [auth.user.id]);
  useEffect(() => {
    refreshServices();
    window.addEventListener("focus", refreshServices);
    return () => {
      request.current++;
      window.removeEventListener("focus", refreshServices);
    };
  }, [refreshServices]);
  useEffect(() => {
    refreshAvailability();
    window.addEventListener("focus", refreshAvailability);
    return () => {
      availabilityRequest.current++;
      window.removeEventListener("focus", refreshAvailability);
    };
  }, [refreshAvailability]);
  useEffect(() => {
    refreshClassSchedule();
    window.addEventListener("focus", refreshClassSchedule);
    return () => {
      classScheduleRequest.current++;
      window.removeEventListener("focus", refreshClassSchedule);
    };
  }, [refreshClassSchedule]);
  async function persistService(values, id) {
    requireSchedule();
    const service = await saveTutorService(values, id);
    window.dispatchEvent(new Event("campustutor:services-changed"));
    request.current++;
    setServicesLoading(false);
    setServicesError("");
    setData((d) => ({
      ...d,
      services: [service, ...d.services.filter((s) => s.id !== service.id)],
    }));
    setNotice(
      values.availability?.length
        ? "Service and availability saved."
        : "Service saved to Supabase.",
    );
  }
  async function changeServiceStatus(id, status) {
    requireSchedule();
    const service = await setTutorServiceStatus(id, status);
    request.current++;
    setServicesLoading(false);
    setData((d) => ({
      ...d,
      services: d.services.map((s) => (s.id === service.id ? service : s)),
    }));
    setServicesError("");
    setNotice("Service status updated in Supabase.");
  }
  async function persistAvailability(slot) {
    requireSchedule();
    const saved = await saveTutorAvailability(
      slot,
      slot.id || null,
      undefined,
      data.services,
    );
    availabilityRequest.current++;
    const slots = await listTutorAvailability(undefined, data.services);
    setData((d) => ({
      ...d,
      slots,
    }));
    setAvailabilityLoading(false);
    setAvailabilityError("");
    setNotice("Tutoring availability saved to Supabase.");
    return saved;
  }
  async function removeAvailability(slot) {
    requireSchedule();
    await deactivateTutorAvailability(slot.id);
    availabilityRequest.current++;
    setData((d) => ({
      ...d,
      slots: d.slots.filter((existing) => existing.id !== slot.id),
    }));
    setAvailabilityLoading(false);
    setAvailabilityError("");
    setNotice("Tutoring availability removed in Supabase.");
  }
  async function persistClassSchedule(draft) {
    const classSchedule = await saveTutorClassSchedule(draft);
    classScheduleRequest.current++;
    setData((d) => ({ ...d, classSchedule }));
    setClassScheduleLoading(false);
    setClassScheduleError("");
    setNotice("Class schedule saved to Supabase.");
    return classSchedule;
  }
  function update() {
    setNotice(
      "This action is not connected to the database yet. Nothing was saved.",
    );
    return false;
  }
  // All tutor sidebar and cross-section links pass through this gate so a
  // missing confirmed class schedule cannot open protected Tutor sections.
  function go(next, options = {}) {
    if (scheduleLocked && !["dashboard", "availability"].includes(next)) {
      setNotice(
        "Upload and confirm your class schedule to unlock this section.",
      );
      return;
    }
    if (scheduleLocked && next === "availability")
      options = { ...options, tab: "Class Schedule" };
    setView(next);
    setArgs(options);
    setRevision((n) => n + 1);
    setSearch("");
    setSearching(false);
    setNotice("");
  }
  const props = {
    profileLoading,
    tutorProfileError,
    refreshTutorInformation,
    saveTutorInformation: persistTutorInformation,
    sessionsLoading,
    sessionsError,
    refreshSessions,
    data: {
      ...data,
      services: data.services.map((service) => ({
        ...service,
        completed:
          sessionsLoading || sessionsError
            ? null
            : data.sessions.filter(
                (s) => s.serviceId === service.id && s.status === "Completed",
              ).length,
      })),
    },
    update,
    go,
    args,
    availabilityLoading,
    availabilityError,
    refreshAvailability,
    saveAvailability: persistAvailability,
    removeAvailability,
    scheduleRequired: scheduleLocked,
    classScheduleLoading,
    classScheduleError,
    refreshClassSchedule,
    saveClassSchedule: persistClassSchedule,
  };
  const results = [
    ...data.services.map((s) => ({ label: s.name, view: "services" })),
    ...data.sessions.slice(0, 8).map((s) => ({
      label: `${s.learner} · ${s.service} · ${s.date}`,
      view: "sessions",
    })),
    ...nav.map(([v, label]) => ({ label, view: v })),
  ].filter((r) => matches(r.label, search));
  return (
    <TutorModalContext.Provider value={true}>
      <div className="min-h-screen bg-[#fbfcfe] text-[#101828]">
        <StudentShell
          role="tutor"
          tutorScheduleRestricted={scheduleLocked}
          nav={nav}
          view={view}
          go={go}
          name={data.profile.name}
          searchContent={
            <>
              {" "}
              <form
                className="relative w-full max-w-lg"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearching(true);
                }}
              >
                <input
                  aria-label="Search tutor workspace"
                  placeholder="Search students, subjects, or sessions..."
                  className={`${input} pr-10`}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearching(true);
                  }}
                />
                <button aria-label="Search" className="absolute right-3 top-2">
                  <Search className="h-4 w-4" />
                </button>
                {searching && search.trim() && (
                  <div className="absolute mt-1 max-h-72 w-full overflow-y-auto rounded border bg-white p-2 shadow-lg">
                    {results.length ? (
                      results.slice(0, 12).map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          className="block w-full p-2 text-left text-xs hover:bg-green-50"
                          onClick={() => go(r.view)}
                        >
                          {r.label}
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-xs">No matching results.</p>
                    )}
                  </div>
                )}
              </form>
            </>
          }
        />
        <main className="min-h-screen px-4 pb-2 pt-[72px] md:ml-[230px] lg:px-6">
          <div className="mx-auto max-w-[1600px]">
            {scheduleLocked && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p>
                  {classScheduleLoading
                    ? "Checking your class schedule..."
                    : "Upload and confirm your class schedule to unlock Tutor sections. Dashboard is read-only."}
                </p>
                {classScheduleError && <p role="alert">{classScheduleError}</p>}
                <button
                  className="mt-2 font-semibold text-green-800 underline"
                  onClick={() => go("availability", { tab: "Class Schedule" })}
                >
                  Upload Class Schedule
                </button>
              </div>
            )}
            {view === "settings" && <AccountSettings />}
            {notice && (
              <div
                role="status"
                className="mb-3 flex justify-between rounded bg-green-50 p-2 text-xs"
              >
                {notice}
                <button
                  aria-label="Dismiss status"
                  onClick={() => setNotice("")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {servicesLoading && view === "services" && (
              <p role="status">Loading services...</p>
            )}
            {servicesError && (
              <p role="alert" className="mb-3 text-sm text-red-700">
                {servicesError}{" "}
                <button onClick={refreshServices} className="underline">
                  Retry
                </button>
              </p>
            )}
            {sessionsLoading && (
              <p role="status" className="mb-3 text-sm">
                Loading sessions...
              </p>
            )}
            {sessionsError && (
              <p role="alert" className="mb-3 text-sm text-red-700">
                {sessionsError}{" "}
                <button onClick={refreshSessions} className="underline">
                  Retry sessions
                </button>
              </p>
            )}
            {/* Keep one section mounted at a time; shared props carry the
                loaded records and their database-backed save callbacks. */}
            <div key={`${view}-${revision}`}>
              {view === "dashboard" && (
                <fieldset disabled={scheduleLocked} className="contents">
                  <Overview {...props} saveService={persistService} />
                </fieldset>
              )}
              {view === "services" && (
                <Services
                  {...props}
                  openCreate={args.create}
                  saveService={persistService}
                  changeServiceStatus={changeServiceStatus}
                />
              )}
              {view === "availability" && <Availability {...props} />}
              {view === "sessions" && <Sessions {...props} />}
              {view === "messages" && <Messages {...props} />}
              {view === "earnings" && <Earnings {...props} />}
              {view === "notifications" && <Notifications {...props} />}
              {view === "profile" && <Profile {...props} />}
              {view === "help" && <Help {...props} />}
              {view === "reports" && <MyReports {...props} />}
            </div>
          </div>
        </main>
      </div>
    </TutorModalContext.Provider>
  );
}
