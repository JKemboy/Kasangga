import {useLogout} from "../shared/LogoutProvider.jsx";
import AdminAudit from "./AdminAudit.jsx";
import AdminBookings from "./AdminBookings.jsx";
import AdminIncidents from "./AdminIncidents.jsx";
import AdminOverview from "./AdminOverview.jsx";
import AdminPayments from "./AdminPayments.jsx";
import AdminCatalog from "./AdminCatalog.jsx";
import AdminSettings from "./AdminSettings.jsx";
import AdminReports from "./AdminReports.jsx";
import {
  applications,
  adminServices,
  loadCollection,
  loadConfig,
} from "./adminData.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  ShieldCheck,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  TriangleAlert,
  ChartNoAxesCombined,
  ClipboardList,
  Settings,
  GraduationCap,
  LogOut,
  Search,
  Bell,
  MessageCircle,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Modal, button, primary } from "../tutor/workspace/ui.jsx";
import AdminUsers, { loadAdminUsers } from "./AdminUsers.jsx";
import "../osas/osas.css";
import "./admin.css";
const navigation = [
  ["Overview", Home],
  ["User Management", Users],
  ["Tutor Verification", ShieldCheck],
  ["Service Management", BriefcaseBusiness],
  ["Bookings Monitoring", CalendarDays],
  ["Payments & Transactions", CreditCard],
  ["Incident Reports", TriangleAlert],
  ["Reports & Analytics", ChartNoAxesCombined],
  ["Audit Logs", ClipboardList],
  ["Settings", Settings],
];
export default function AdminDashboardPage() {
 const requestLogout = useLogout();

  const navigate = useNavigate();
  const [view, setView] = useState("Overview"),
    [config, setConfig] = useState(loadConfig),
    [apps, setApps] = useState(() =>
      loadCollection("campustutor:admin-applications:v1", applications),
    ),
    [services, setServices] = useState(() =>
      loadCollection("campustutor:admin-services:v1", adminServices),
    );
  function persist(kind, next) {
    try {
      localStorage.setItem(
        `campustutor:admin-${kind}:v1`,
        JSON.stringify(next),
      );
      (kind === "applications" ? setApps : setServices)(next);
      return true;
    } catch {
      return false;
    }
  }
  const [rows, setRows] = useState(loadAdminUsers),
    [open, setOpen] = useState(false),
    [modal, setModal] = useState(null),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const logs = [...rows, ...apps, ...services]
    .flatMap((r) =>
      r.history.map((h) => ({ ...h, user: r.name || r.title, id: r.id })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  function go(label) {
    setOpen(false);
    if (
      [
        "User Management",
        "Tutor Verification",
        "Service Management",
        "Reports & Analytics",
        "Payments & Transactions",
        "Incident Reports",
        "Bookings Monitoring",
        "Audit Logs",
        "Overview",
        "Settings",
      ].includes(label)
    ) {
      setView(label);
      setModal(null);
    } else setModal(label);
  }
  return (
    <div className="osas-app admin-app">
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`osas-sidebar ${open ? "is-open" : ""}`}>
        <div className="osas-brand">
          <GraduationCap size={32} />
          <span>
            Campus<span>Tutor</span>
          </span>
          <button
            className="ml-auto md:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-4 pb-2 pt-4 text-[11px] font-bold text-yellow-300">
          ADMIN PORTAL
        </p>
        <nav aria-label="Admin navigation">
          {navigation.map(([label, Icon]) => (
            <button
              key={label}
              className={label === view ? "active" : ""}
              aria-current={label === view ? "page" : undefined}
              onClick={() => go(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="osas-logout" onClick={requestLogout}>
          <LogOut size={18} />
          Logout
        </button>
        <div className="osas-campus">
          <img src="/images/csubuilding.jpg" alt="Caraga State University" />
          <div>
            <strong>Caraga State University</strong>
            <p>Excellence. Service. Commitment.</p>
          </div>
        </div>
      </aside>
      <header className="osas-topbar" aria-label="Admin top navigation">
        <button
          className="md:hidden"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
        <form
          className="osas-global"
          onSubmit={(e) => {
            e.preventDefault();
            setModal(null);
            setView("User Management");
            setQuery(search);
          }}
        >
          <Search size={16} />
          <input
            aria-label="Search admin records"
            placeholder="Search users, tutors, bookings, reports, or settings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button aria-label="Search records">
            <Search size={16} />
          </button>
        </form>
        <div className="ml-auto flex items-center gap-4">
          <button
            aria-label="Notifications"
            onClick={() => setModal("Notifications")}
          >
            <Bell size={21} />
          </button>
          <button aria-label="Messages" onClick={() => setModal("Messages")}>
            <MessageCircle size={21} />
          </button>
          <button
            className="flex items-center gap-2 text-left"
            aria-label="Admin account"
            onClick={() => setModal("Account")}
          >
            <span className="osas-avatar">AD</span>
            <span className="hidden sm:block">
              <b className="block text-xs text-slate-900">{config.name}</b>
              <small>Administrator</small>
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>
      <main className="osas-main">
        {view === "Overview" ? (
          <AdminOverview
            users={rows}
            applications={apps}
            services={services}
            config={config}
            go={go}
          />
        ) : view === "Settings" ? (
          <AdminSettings config={config} onSave={setConfig} />
        ) : view === "Tutor Verification" ? (
          <AdminCatalog
            key="applications"
            kind="applications"
            rows={apps}
            onUpdate={(next) => persist("applications", next)}
            config={config}
          />
        ) : view === "Service Management" ? (
          <AdminCatalog
            key="services"
            users={rows}
            applications={apps}
            onUserSave={updated => { const next = rows.map(u=>u.id===updated.id?updated:u); try {localStorage.setItem("campustutor:admin-users:v1",JSON.stringify(next));setRows(next);return true;} catch {return false;} }}
            onApplicationSave={updated=>persist("applications",apps.map(a=>a.id===updated.id?updated:a))}
            kind="services"
            rows={services}
            onUpdate={(next) => persist("services", next)}
            config={config}
          />
        ) : view === "Audit Logs" ? (
          <AdminAudit
            users={rows}
            applications={apps}
            services={services}
            config={config}
          />
        ) : view === "Bookings Monitoring" ? (
          <AdminBookings />
        ) : view === "Incident Reports" ? (
          <AdminIncidents />
        ) : view === "Payments & Transactions" ? (
          <AdminPayments />
        ) : view === "Reports & Analytics" ? (
          <AdminReports users={rows} services={services} go={go} />
        ) : (
          <AdminUsers
            applications={apps}
            services={services}
            config={config}
            onServiceSave={updated => persist("services", services.map(s => s.id === updated.id ? updated : s))}
            onApplicationSave={updated => persist("applications", apps.map(a => a.id === updated.id ? updated : a))}
            rows={rows}
            onUpdate={setRows}
            query={query}
            setQuery={setQuery}
          />
        )}
      </main>
      {modal && (
        <Modal title={modal} onClose={() => setModal(null)}>
          <div className="space-y-3 text-xs">
            {modal === "Logout" ? (
              <>
                <p>
                  Leave the Admin portal? Saved demo changes remain on this
                  browser.
                </p>
                <button className={primary} onClick={() => navigate("/")}>
                  Logout
                </button>
              </>
            ) : modal === "Account" || modal === "Settings" ? (
              <>
                <p>
                  <b>Admin User</b> · Administrator
                </p>
                <p>
                  Institutional profile and security settings are not connected
                  in this demo.
                </p>
                <button className={button} onClick={requestLogout}>
                  Logout
                </button>
              </>
            ) : modal === "Audit Logs" ? (
              <>
                {logs.length ? (
                  logs.map((h, i) => (
                    <div className="rounded border p-3" key={i}>
                      <b>{h.user}</b> · {h.id}
                      <p>
                        {h.from} → {h.to}
                      </p>
                      <p>{h.reason}</p>
                      <p>
                        {h.by} ·{" "}
                        {new Date(h.at).toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No admin changes recorded on this browser.</p>
                )}
              </>
            ) : modal === "Overview" || modal === "Reports & Analytics" ? (
              <>
                <p>Summary of the {rows.length} available demo accounts.</p>
                {["Active", "Suspended", "Restricted"].map((s) => (
                  <p key={s}>
                    {s}: <b>{rows.filter((r) => r.status === s).length}</b>
                  </p>
                ))}
                <button className={button} onClick={() => setModal(null)}>
                  Open User Management
                </button>
              </>
            ) : modal === "Tutor Verification" ? (
              <>
                <p>
                  Verified tutor references in this demo. Verification documents
                  and approval workflows are not connected yet.
                </p>
                {rows
                  .filter((r) => r.tutor)
                  .map((r) => (
                    <p className="rounded border p-2" key={r.id}>
                      {r.name} · {r.id}
                    </p>
                  ))}
              </>
            ) : modal === "Notifications" || modal === "Messages" ? (
              <p>
                No {modal.toLowerCase()} are connected to this demo account.
              </p>
            ) : (
              <p>
                The {modal.toLowerCase()} workflow is not connected yet. User
                Management and local account audit history are available.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
