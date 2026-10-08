import {
  listTutorServices,
  saveTutorService,
  setTutorServiceStatus,
} from "../../services/tutorServices.js";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { workspaceProfile } from "../../services/authAccount.js";
import { TutorModalContext } from "./workspace/ui.jsx";
import StudentShell from "../shared/StudentShell.jsx";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Home,
  Boxes,
  CalendarDays,
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
  ["availability", "Availability & Schedule", CalendarDays],
  ["sessions", "My Sessions", CalendarDays],
  ["messages", "Messages", MessageCircle],
  ["earnings", "Earnings", Wallet],
  ["notifications", "Notifications", Bell],
  ["profile", "Profile", UserRound],
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
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const request = useRef(0);
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
  useEffect(() => {
    refreshServices();
    window.addEventListener("focus", refreshServices);
    return () => {
      request.current++;
      window.removeEventListener("focus", refreshServices);
    };
  }, [refreshServices]);
  async function persistService(values, id) {
    const service = await saveTutorService(values, id);
    request.current++;
    setServicesLoading(false);
    setServicesError("");
    setData((d) => ({
      ...d,
      services: [service, ...d.services.filter((s) => s.id !== service.id)],
    }));
    setNotice("Service saved to Supabase.");
  }
  async function changeServiceStatus(id, status) {
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
  function update() {
    setNotice(
      "This action is not connected to the database yet. Nothing was saved.",
    );
    return false;
  }
  function go(next, options = {}) {
    setView(next);
    setArgs(options);
    setRevision((n) => n + 1);
    setSearch("");
    setSearching(false);
    setNotice("");
  }
  const props = { data, update, go, args };
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
          inboxData={data}
          onInboxRead={(ids) =>
            update((d) => ({
              ...d,
              notifications: d.notifications.map((n) =>
                ids.includes(n.id) ? { ...n, read: true } : n,
              ),
            }))
          }
          role="tutor"
          nav={nav}
          view={view}
          go={go}
          name={data.profile.name}
          unread={data.notifications.filter((n) => !n.read).length}
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
            <div key={`${view}-${revision}`}>
              {view === "dashboard" && (
                <Overview {...props} saveService={persistService} />
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
            </div>
          </div>
        </main>
      </div>
    </TutorModalContext.Provider>
  );
}
