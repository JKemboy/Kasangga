import AdminCatalog from "./AdminCatalog.jsx";
import PortalAvatar from "../shared/PortalAvatar.jsx";
import { saveAdminRecord } from "../../services/adminDatabase.js";
import useAdminRecords from "./useAdminRecords.js";
import { AdminDatabaseContext } from "./AdminDatabaseContext.jsx";
import HeaderInbox from "../shared/HeaderInbox.jsx";
import { adminAlerts, adminThreads } from "../shared/headerInboxData.js";
import { useLogout } from "../shared/LogoutProvider.jsx";
import AdminBookings from "./AdminBookings.jsx";
import AdminIncidents from "./AdminIncidents.jsx";
import AdminOverview from "./AdminOverview.jsx";
import AdminPayments from "./AdminPayments.jsx";
import AdminSettings from "./AdminSettings.jsx";
import AdminReports from "./AdminReports.jsx";
import { loadConfig } from "./adminData.js";
import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { downloadTutorApplicationDocument } from "../../services/tutorApplicationStorage.js";
import { saveTutorApplicationReview } from "../../services/tutorApplications.js";
import {
  Home,
  Users,
  ShieldCheck,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  TriangleAlert,
  ChartNoAxesCombined,
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
import AdminUsers from "./AdminUsers.jsx";
import AdminSupportInbox from "./AdminSupportInbox.jsx";
import "../osas/osas.css";
import "./admin.css";
const navigation = [
  ["Overview", Home],
  ["User Management", Users],
  ["Tutor Verification", ShieldCheck],
  ["Service Management", BriefcaseBusiness],
  ["Bookings Monitoring", CalendarDays],
  ["Messages", MessageCircle],
  ["Payments & Transactions", CreditCard],
  ["Incident Reports", TriangleAlert],
  ["Reports & Analytics", ChartNoAxesCombined],
  ["Settings", Settings],
];
export default function AdminDashboardPage() {
  const requestLogout = useLogout();
  const auth = useAuth();

  const [view, setView] = useState("Overview");
  const {
    database,
    applications: apps,
    error: databaseError,
    applicationsError: appsError,
    refreshing,
    refresh: refreshDatabase,
  } = useAdminRecords(auth.user.id, view);
  const rows = database?.users || [],
    services = database?.services || [],
    config = database?.config || loadConfig();
  const appsLoading = !database && refreshing;
  const [verificationChecks, setVerificationChecks] = useState({}),
    [verificationError, setVerificationError] = useState("");
  async function updateApplication(record, status = null) {
    await saveTutorApplicationReview(record, status);
    await refreshDatabase();
  }
  function updateVerificationCheck(applicationId, next) {
    const updated = { ...verificationChecks, [applicationId]: next };
    setVerificationError("");
    setVerificationChecks(updated);
  }
  async function loadApplicationDocument(doc) {
    return downloadTutorApplicationDocument(doc.storagePath, auth.user.id);
  }
  async function saveRecord(kind, record) {
    await saveAdminRecord(kind, record);
    await refreshDatabase();
    return true;
  }
  async function persist(kind, next) {
    const updated = next.find((r) => r !== services.find((s) => s.id === r.id));
    return updated ? saveRecord(kind, updated) : true;
  }
  const [open, setOpen] = useState(false),
    [modal, setModal] = useState(null),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
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
        "Messages",
        "Overview",
        "Settings",
      ].includes(label)
    ) {
      setView(label);
      setModal(null);
    } else setModal(label);
  }
  return (
    <AdminDatabaseContext.Provider
      value={{
        database,
        saveRecord,
        refresh: refreshDatabase,
        refreshing,
        error: databaseError,
      }}
    >
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
            <HeaderInbox
              role="admin"
              notifications={adminAlerts}
              threads={adminThreads}
              onNavigate={go}
            />
            <button
              className="flex items-center gap-2 text-left"
              aria-label="Admin account"
              onClick={() => setModal("Account")}
            >
              <PortalAvatar role="admin" editable />
              <span className="hidden sm:block">
                <b className="block text-xs text-slate-900">{config.name}</b>
                <small>Administrator</small>
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <main className="osas-main">
          {databaseError && (
            <p role="alert" className="m-4 text-red-700">
              {databaseError}
            </p>
          )}
          {!database && !databaseError && (
            <p role="status" className="m-4">
              Loading admin records...
            </p>
          )}
          {appsError && (
            <p
              className="m-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {appsError}
            </p>
          )}
          {verificationError && (
            <p
              className="m-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
              role="alert"
            >
              {verificationError}
            </p>
          )}
          {appsLoading && (
            <p className="m-4 text-sm text-slate-600" role="status">
              Loading tutor applications…
            </p>
          )}
          {!database ? (
            <p className="m-4 text-sm text-slate-600">
              {databaseError
                ? "Admin records could not be loaded. Reload the page to retry."
                : "Loading Admin records - "}
            </p>
          ) : view === "Overview" ? (
            <AdminOverview
              users={rows}
              applications={apps}
              onUpdateApplications={updateApplication}
              onDocument={loadApplicationDocument}
              services={services}
              config={config}
              go={go}
            />
          ) : view === "Settings" ? (
            <AdminSettings
              config={config}
              onSave={(next) => saveRecord("settings", next)}
            />
          ) : view === "Tutor Verification" ? (
            <AdminCatalog
              key="applications"
              kind="applications"
              rows={apps}
              onUpdate={updateApplication}
              onDocument={loadApplicationDocument}
              verificationChecks={verificationChecks}
              onVerificationCheckChange={updateVerificationCheck}
              config={config}
            />
          ) : view === "Service Management" ? (
            <AdminCatalog
              key="services"
              users={rows}
              applications={apps}
              onUserSave={(updated) => saveRecord("users", updated)}
              onApplicationSave={(updated, status) =>
                updateApplication(updated, status)
              }
              onDocument={loadApplicationDocument}
              kind="services"
              rows={services}
              onUpdate={(next) => persist("services", next)}
              config={config}
            />
          ) : view === "Bookings Monitoring" ? (
            <AdminBookings />
          ) : view === "Messages" ? (
            <AdminSupportInbox />
          ) : view === "Incident Reports" ? (
            <AdminIncidents
              users={rows}
              applications={apps}
              services={services}
              config={config}
              onUserSave={(updated) => saveRecord("users", updated)}
              onServiceSave={(updated) =>
                persist(
                  "services",
                  services.map((s) => (s.id === updated.id ? updated : s)),
                )
              }
              onApplicationSave={(updated, status) =>
                updateApplication(updated, status)
              }
              onDocument={loadApplicationDocument}
            />
          ) : view === "Payments & Transactions" ? (
            <AdminPayments />
          ) : view === "Reports & Analytics" ? (
            <AdminReports users={rows} services={services} go={go} />
          ) : (
            <AdminUsers
              applications={apps}
              services={services}
              config={config}
              onServiceSave={(updated) =>
                persist(
                  "services",
                  services.map((s) => (s.id === updated.id ? updated : s)),
                )
              }
              onApplicationSave={(updated, status) =>
                updateApplication(updated, status)
              }
              onDocument={loadApplicationDocument}
              rows={rows}
              onUpdate={(updated) => saveRecord("users", updated)}
              query={query}
              setQuery={setQuery}
            />
          )}
        </main>
        {modal && (
          <Modal title="Administrator account" onClose={() => setModal(null)}>
            <div className="space-y-3 text-xs">
              <p>
                <b>{config.name}</b>
              </p>
              <p>{auth.profile?.csu_email || auth.user?.email}</p>
              <button className={button} onClick={() => go("Settings")}>
                Open Settings
              </button>
              <button className={button} onClick={requestLogout}>
                Logout
              </button>
            </div>
          </Modal>
        )}
      </div>
    </AdminDatabaseContext.Provider>
  );
}
