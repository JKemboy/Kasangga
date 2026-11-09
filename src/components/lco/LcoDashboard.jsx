import RecordSearch from "../shared/RecordSearch.jsx";
import useSectionNavigation from "../shared/useSectionNavigation.js";
import LcoPolicies from "./LcoPolicies.jsx";
import LcoNotifications from "./LcoNotifications.jsx";
import { lcoNotificationDestination } from "../../services/staffNotificationTargets.js";
// LCO portal coordinator: loads the role-authorized Supabase snapshot, maintains the LCO inbox, and routes to each LCO section.
import LcoCatalog from "./LcoCatalog.jsx";
import PortalAvatar from "../shared/PortalAvatar.jsx";
import { saveLcoRecord } from "../../services/lcoDatabase.js";
import useLcoRecords from "./useLcoRecords.js";
import { LcoDatabaseContext } from "./LcoDatabaseContext.jsx";
import HeaderInbox from "../shared/HeaderInbox.jsx";
import CountBadge from "../shared/CountBadge.jsx";
import { listSupportConversations } from "../../services/supportInbox.js";
import { useLogout } from "../shared/LogoutProvider.jsx";
import LcoBookings from "./LcoBookings.jsx";
import LcoIncidents from "./LcoIncidents.jsx";
import LcoOverview from "./LcoOverview.jsx";
import LcoPayments from "./LcoPayments.jsx";
import LcoSettings from "./LcoSettings.jsx";
import LcoReports from "./LcoReports.jsx";
import { loadConfig } from "./lcoData.js";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  filterLcoNotifications,
  loadLcoNotifications,
  markLcoNotificationsRead,
} from "../../services/lcoNotifications.js";
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
  LogOut,
  Search,
  Bell,
  MessageCircle,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Modal, button, primary } from "../shared/staffUi.jsx";
import LcoUsers from "./LcoUsers.jsx";
import LcoSupportInbox from "./LcoSupportInbox.jsx";
import "../oswe/oswe.css";
import "./lco.css";
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
  ["Policies & Procedures", ShieldCheck],
  ["Notifications", Bell],
  ["Settings", Settings],
];
const lcoSections = navigation.map(([label]) => label);
export default function LcoDashboardPage() {
  const requestLogout = useLogout();
  const auth = useAuth();

  const [view, setView] = useSectionNavigation(lcoSections, "Overview");
  const [lcoNotifications, setLcoNotifications] = useState([]);
  const [supportThreads, setSupportThreads] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const {
    database,
    applications: apps,
    policies,
    error: databaseError,
    applicationsError: appsError,
    refreshing,
    refresh: refreshDatabase,
  } = useLcoRecords(auth.user.id, view);
  const rows = database?.users || [],
    services = database?.services || [],
    config = database?.config || loadConfig();
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const next = await loadLcoNotifications(auth.user.id);
        if (alive) {
          setLcoNotifications(next);
          setNotificationError("");
        }
      } catch (cause) {
        if (alive) setNotificationError(cause.message);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [auth.user.id]);
  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const rows = await listSupportConversations();
        if (alive) setSupportThreads(rows);
      } catch {
        /* The Messages section reports support loading errors. */
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [auth.user.id]);
  const visibleLcoNotifications = filterLcoNotifications(
    lcoNotifications,
    config,
  );
  const appsLoading = !database && refreshing;
  const navigationCounts = {
    Notifications: visibleLcoNotifications.filter((n) => !n.read).length,
    Messages: supportThreads.filter((t) => t.status === "open").length,
    "Tutor Verification": apps.filter((a) =>
      ["Pending", "Under Review"].includes(a.status),
    ).length,
    "Payments & Transactions": (database?.payments || []).filter(
      (p) => p.paymentStatus === "paid" && !p.transferredAt,
    ).length,
  };
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
    // Section components submit edits here; saveLcoRecord writes them via
    // the LCO RPC and refreshDatabase reloads the authorized snapshot.
    await saveLcoRecord(kind, record);
    await refreshDatabase();
    return true;
  }
  const [open, setOpen] = useState(false),
    [modal, setModal] = useState(null),
    [query, setQuery] = useState(""),
    [sectionSearch, setSectionSearch] = useState({});
  const search = sectionSearch[view] || "";
  const setSearch = (value) =>
    setSectionSearch((current) => ({ ...current, [view]: value }));
  const [notificationTarget, setNotificationTarget] = useState(null);
  function go(label, notification = null) {
    setNotificationTarget(notification);
    if (notification)
      setSectionSearch((current) => ({ ...current, [label]: "" }));
    if (notification && label === "User Management") setQuery("");
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
        "Notifications",
        "Policies & Procedures",
      ].includes(label)
    ) {
      setView(label);
      setModal(null);
    } else setModal(label);
  }
  async function readNotifications(ids) {
    try {
      await markLcoNotificationsRead(auth.user.id, ids);
      setLcoNotifications((current) =>
        current.map((item) =>
          ids.includes(item.id) ? { ...item, read: true } : item,
        ),
      );
      return true;
    } catch (cause) {
      setNotificationError(cause.message);
      return false;
    }
  }
  function openNotification(row) {
    const destination = lcoNotificationDestination(row, database || {});
    if (!destination) return false;
    go(destination.view, destination.target);
    return true;
  }
  return (
    <LcoDatabaseContext.Provider
      value={{
        database,
        saveRecord,
        refresh: refreshDatabase,
        refreshing,
        error: databaseError,
      }}
    >
      <div className="oswe-app lco-app">
        {open && (
          <button
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
        )}
        <aside className={`oswe-sidebar ${open ? "is-open" : ""}`}>
          <div className="oswe-brand">
            <img src="/images/kasangga-logo.png" alt="Kasangga" />
            <button
              className="ml-auto md:hidden"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <p className="px-4 pb-2 pt-4 text-[11px] font-bold text-yellow-300">
            LCO PORTAL
          </p>
          <nav aria-label="LCO navigation">
            {navigation.map(([label, Icon]) => (
              <button
                key={label}
                className={label === view ? "active" : ""}
                aria-current={label === view ? "page" : undefined}
                onClick={() => go(label)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {navigationCounts[label] !== undefined && (
                  <CountBadge
                    count={navigationCounts[label]}
                    label={
                      label === "Messages"
                        ? "open support conversations"
                        : label === "Tutor Verification"
                          ? "applications awaiting review"
                          : label === "Payments & Transactions"
                            ? "payments awaiting transfer or review"
                            : "unread notifications"
                    }
                  />
                )}
              </button>
            ))}
          </nav>
          <button className="oswe-logout" onClick={requestLogout}>
            <LogOut size={18} />
            Logout
          </button>
          <div className="oswe-campus">
            <img src="/images/csubuilding.jpg" alt="Caraga State University" />
            <div>
              <strong>Caraga State University</strong>
              <p>Excellence. Service. Commitment.</p>
            </div>
          </div>
        </aside>
        <header className="oswe-topbar" aria-label="LCO top navigation">
          <button
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <RecordSearch
            label="Search users, applications, services, bookings, payments and reports..."
            groups={[
              ["User Management", rows],
              ["Tutor Verification", apps || []],
              ["Service Management", services],
              ["Bookings Monitoring", database?.sessions || []],
              ["Payments & Transactions", database?.payments || []],
              ["Incident Reports", database?.incidents || []],
              ["Policies & Procedures", policies],
            ]}
            onSelect={(section, row) => {
              go(section);
              setSectionSearch((current) => ({
                ...current,
                [section]: String(row.id || row.name || row.title || ""),
              }));
              if (section === "User Management")
                setQuery(String(row.id || row.name || ""));
            }}
          />

          <div className="ml-auto flex items-center gap-4">
            <HeaderInbox
              role="lco"
              notifications={visibleLcoNotifications}
              threads={supportThreads.map((thread) => ({
                ...thread,
                name: thread.subject,
                last_message: thread.category,
              }))}
              inboxError={notificationError}
              onRead={readNotifications}
              onNotification={openNotification}
              onNavigate={go}
            />
            <button
              className="flex items-center gap-2 text-left"
              aria-label="LCO account"
              onClick={() => setModal("Account")}
            >
              <PortalAvatar role="lco" editable />
              <span className="hidden sm:block">
                <b className="block text-xs text-slate-900">
                  {auth.profile?.first_name
                    ? [auth.profile.first_name, auth.profile.last_name]
                        .filter(Boolean)
                        .join(" ")
                    : config.name}
                </b>
                <small>LCO</small>
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <main className="oswe-main">
          {databaseError && (
            <p role="alert" className="m-4 text-red-700">
              {databaseError}
            </p>
          )}
          {!database && !databaseError && (
            <p role="status" className="m-4">
              Loading LCO records...
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
                ? "LCO records could not be loaded. Reload the page to retry."
                : "Loading LCO records - "}
            </p>
          ) : view === "Overview" ? (
            <LcoOverview
              users={rows}
              applications={apps}
              onUpdateApplications={updateApplication}
              onDocument={loadApplicationDocument}
              services={services}
              config={config}
              go={go}
            />
          ) : // The view switch is the LCO section router. Section components
          // receive only the records and callbacks needed for their workflow.
          view === "Policies & Procedures" ? (
            <LcoPolicies searchQuery={search} onSearchChange={setSearch} />
          ) : view === "Notifications" ? (
            <LcoNotifications
              rows={lcoNotifications}
              error={notificationError}
              onRead={readNotifications}
              onOpen={openNotification}
            />
          ) : view === "Settings" ? (
            <LcoSettings
              config={config}
              onSave={(next) => saveRecord("settings", next)}
            />
          ) : view === "Tutor Verification" ? (
            <LcoCatalog
              key={"applications-" + (notificationTarget?.id || "")}
              notificationTarget={notificationTarget}
              searchQuery={search}
              onQueryChange={setSearch}
              kind="applications"
              rows={apps}
              onUpdate={updateApplication}
              onDocument={loadApplicationDocument}
              verificationChecks={verificationChecks}
              onVerificationCheckChange={updateVerificationCheck}
              config={config}
            />
          ) : view === "Service Management" ? (
            <LcoCatalog
              key={"services-" + (notificationTarget?.id || "")}
              notificationTarget={notificationTarget}
              users={rows}
              applications={apps}
              onUserSave={(updated) => saveRecord("users", updated)}
              onApplicationSave={(updated, status) =>
                updateApplication(updated, status)
              }
              onDocument={loadApplicationDocument}
              searchQuery={search}
              onQueryChange={setSearch}
              kind="services"
              rows={services}
              onUpdate={(record) => saveRecord("services", record)}
              config={config}
            />
          ) : view === "Bookings Monitoring" ? (
            <LcoBookings
              key={notificationTarget?.id || "bookings"}
              notificationTarget={notificationTarget}
              searchQuery={search}
              onQueryChange={setSearch}
            />
          ) : view === "Messages" ? (
            <LcoSupportInbox
              key={notificationTarget?.id || "messages"}
              notificationTarget={notificationTarget}
            />
          ) : view === "Incident Reports" ? (
            <LcoIncidents
              key={notificationTarget?.id || "incidents"}
              notificationTarget={notificationTarget}
              searchQuery={search}
              onQueryChange={setSearch}
              users={rows}
              applications={apps}
              services={services}
              config={config}
              onUserSave={(updated) => saveRecord("users", updated)}
              onServiceSave={(updated) => saveRecord("services", updated)}
              onApplicationSave={(updated, status) =>
                updateApplication(updated, status)
              }
              onDocument={loadApplicationDocument}
            />
          ) : view === "Payments & Transactions" ? (
            <LcoPayments
              key={notificationTarget?.id || "payments"}
              notificationTarget={notificationTarget}
              searchQuery={search}
              onQueryChange={setSearch}
            />
          ) : view === "Reports & Analytics" ? (
            <LcoReports users={rows} services={services} go={go} />
          ) : (
            <LcoUsers
              key={notificationTarget?.id || "users"}
              notificationTarget={notificationTarget}
              applications={apps}
              services={services}
              config={config}
              onServiceSave={(updated) => saveRecord("services", updated)}
              onApplicationSave={(updated, status) =>
                updateApplication(updated, status)
              }
              onDocument={loadApplicationDocument}
              rows={rows}
              onUpdate={(updated) => saveRecord("users", updated)}
              query={query}
              setQuery={(value) => {
                setQuery(value);
                setSearch(value);
              }}
            />
          )}
        </main>
        {modal && (
          <Modal title="LCO account" onClose={() => setModal(null)}>
            <div className="space-y-3 text-xs">
              <p>
                <b>
                  {auth.profile?.first_name
                    ? [auth.profile.first_name, auth.profile.last_name]
                        .filter(Boolean)
                        .join(" ")
                    : config.name}
                </b>
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
    </LcoDatabaseContext.Provider>
  );
}
