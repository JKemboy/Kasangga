import { TutorModalContext } from "./workspace/ui.jsx";
import StudentShell from "../shared/StudentShell.jsx";
﻿import { useState } from "react";
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
import {
  Overview,
  Sessions,
  Earnings,
} from "./workspace/SessionPages.jsx";
import {
  Messages,
  Notifications,
  Profile,
} from "./workspace/AccountPages.jsx";
import Help from "./workspace/Help.jsx";
import {
  input,
  matches,
} from "./workspace/ui.jsx";
const key = "campustutor:tutor-workspace:v2";
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
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(key));
    if (
      d &&
      Array.isArray(d.services) &&
      Array.isArray(d.sessions) &&
      Array.isArray(d.slots) &&
      Array.isArray(d.notifications) &&
      Array.isArray(d.threads) &&
      d.profile &&
      Array.isArray(d.reports) &&
      Array.isArray(d.uploads)
    )
      return d;
  } catch {}
  return structuredClone(seed);
}
export default function TutorDashboardPage() {
  const [data, setData] = useState(load),
    [view, setView] = useState("dashboard"),
    [args, setArgs] = useState({}),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [searching, setSearching] = useState(false),
    [revision, setRevision] = useState(0);
  function update(change) {
    const next = change(data);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setData(next);
      setNotice("Saved on this browser.");
      return true;
    } catch {
      setNotice("Could not save: browser storage is unavailable or full.");
      return false;
    }
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
    <TutorModalContext.Provider value={true}><div className="min-h-screen bg-[#fbfcfe] text-[#101828]">
      <StudentShell inboxData={data} onInboxRead={ids=>update(d=>({...d,notifications:d.notifications.map(n=>ids.includes(n.id)?{...n,read:true}:n)}))} role="tutor" nav={nav} view={view} go={go} name={data.profile.name} unread={data.notifications.filter(n=>!n.read).length} searchContent={<>        <form
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
</>} />
      <main className="min-h-screen px-4 pb-2 pt-[72px] md:ml-[230px] lg:px-6">
        <div className="mx-auto max-w-[1600px]">
          <p className="mb-2 text-[10px] text-slate-400">
            Local demo · changes stay on this browser
          </p>
          {notice && (
            <div
              role="status"
              className="mb-3 flex justify-between rounded bg-green-50 p-2 text-xs"
            >
              {notice}
              <button aria-label="Dismiss status" onClick={() => setNotice("")}>
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div key={`${view}-${revision}`}>
            {view === "dashboard" && <Overview {...props} />}
            {view === "services" && (
              <Services {...props} openCreate={args.create} />
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
    </div></TutorModalContext.Provider>
  );
}
