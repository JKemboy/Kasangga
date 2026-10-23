import OsasNotifications from "./OsasNotifications.jsx";
// OSAS portal coordinator: loads the database snapshot, applies saved preferences, and routes clearance, case, policy, archive, and report sections.
import OsasCaseWorkspace from "./OsasCaseWorkspace.jsx";
import PortalAvatar from "../shared/PortalAvatar.jsx";
import { statusClass } from "../shared/statusColors.js";
import { OsasDatabaseProvider } from "./OsasDatabaseContext.jsx";
import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import { useAuth } from "../../auth/AuthProvider.jsx";
import CaseShortcut from "./CaseShortcut.jsx";
import ClearanceReview from "./ClearanceReview.jsx";
import UserExport from "../admin/UserExport.jsx";
import { reportHtml } from "../admin/reportExport.js";
import HeaderInbox from "../shared/HeaderInbox.jsx";
import { useLogout } from "../shared/LogoutProvider.jsx";
import OsasArchive from "./OsasArchive.jsx";
import OsasCases from "./OsasCases.jsx";
import OsasOverview from "./OsasOverview.jsx";
import OsasPolicies from "./OsasPolicies.jsx";
import OsasReports from "./OsasReports.jsx";
import OsasSettings, {
  filterOsasNotifications,
  loadSettings,
  normalizeSettings,
} from "./OsasSettings.jsx";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Download,
  FileText,
  Flag,
  IdCard,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  CheckCircle,
  X,
} from "lucide-react";
import {
  Modal,
  Field,
  button,
  primary,
  input,
} from "../tutor/workspace/ui.jsx";
import "./osas.css";

const statuses = [
  "Pending Review",
  "Cleared",
  "On Hold",
  "Requires Resolution",
];

const navigation = [
  ["Overview", LayoutDashboard],
  ["Case Review", FileText],
  ["Student Clearance Review", IdCard],
  ["Policies & Procedures", BookOpen],
  ["Case Archive", Archive],
  ["Reports & Analytics", ChartNoAxesCombined],
  ["Notifications", Bell],
  ["Settings", Settings],
];

const dateLabel = (v) =>
  v
    ? new Date(v + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
function Status({ value }) {
  return <span className={statusClass(value, "osas-badge")}>{value}</span>;
}
function csvCell(v) {
  return (
    '"' +
    String(/^[=+@\-\t\r]/.test(String(v)) ? `'${v}` : v).replaceAll('"', '""') +
    '"'
  );
}

export default function OsasDashboardPage() {
  return (
    <OsasDatabaseProvider>
      <OsasDashboardContent />
    </OsasDatabaseProvider>
  );
}
function OsasDashboardContent() {
  const auth = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenu = useRef(null);
  useEffect(() => {
    if (!accountOpen) return;
    const outside = (event) => {
      if (!accountMenu.current?.contains(event.target)) setAccountOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountMenu.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [accountOpen]);
  const database = useOsasDatabase();
  const rows = database.records?.clearance || [];
  const requestLogout = useLogout();

  const navigate = useNavigate();
  const [view, setView] = useState("Overview");
  useEffect(() => {
    const open = () => setView("Case Archive");
    window.addEventListener("campustutor:open-case-archive", open);
    return () =>
      window.removeEventListener("campustutor:open-case-archive", open);
  }, []);
  useEffect(() => {
    const open = () => setView("Case Review");
    window.addEventListener("campustutor:open-evidence-validation", open);
    return () =>
      window.removeEventListener("campustutor:open-evidence-validation", open);
  }, []);
  const [settings, setSettings] = useState(loadSettings);
  // Apply the latest server settings snapshot; local state is only a UI cache
  // and never a persistent settings store.
  useEffect(() => {
    if (database.records?.settings) {
      const next = normalizeSettings(database.records.settings);
      setSettings((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    }
  }, [database.records?.settings]);
  const notifications = filterOsasNotifications(
    database.records?.notifications || [],
    settings,
  );
  const pageSize = Number(settings.pageSize);
  const formatDate = (v) =>
    !v
      ? "—"
      : settings.dateFormat === "iso"
        ? v
        : new Date(v + "T12:00:00").toLocaleDateString(
            settings.language || "en-PH",
            {
              timeZone: settings.timezone || "Asia/Manila",
              month: settings.dateFormat === "short" ? "2-digit" : "short",
              day: "numeric",
              year: "numeric",
            },
          );
  const [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [global, setGlobal] = useState(""),
    [status, setStatus] = useState(""),
    [program, setProgram] = useState(""),
    [caseStatus, setCaseStatus] = useState(""),
    [requested, setRequested] = useState(""),
    [semester, setSemester] = useState(""),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null),
    [decision, setDecision] = useState(""),
    [basis, setBasis] = useState(""),
    [notes, setNotes] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const filtered = rows.filter(
    (r) =>
      (!status || r.status === status) &&
      (!program || r.program === program) &&
      (!caseStatus || r.caseStatus === caseStatus) &&
      (!requested || r.requested === requested) &&
      (!semester || r.term === semester) &&
      `${r.id} ${r.name} ${r.program} ${r.caseId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  function review(r) {
    setSelected(r);
    setDecision(r.status);
    setBasis("");
    setNotes("");
    setConfirmed(false);
    setError("");
    setModal("Review Clearance");
  }
  async function save(e) {
    e.preventDefault();
    try {
      await database.save("clearance", selected.clearanceDatabaseId, "review", {
        status: decision,
        notes: notes.trim(),
      });
      setModal(null);
    } catch (cause) {
      setError(cause.message);
    }
  }
  function exportCsv() {
    const headers = [
      "Student ID",
      "Student Name",
      "College / Program",
      "Academic Year / Semester",
      "Relevant Case",
      "Case Status",
      "Clearance Status",
      "Requested Date",
      "Reviewed Date",
    ];
    const csv = [
      headers,
      ...filtered.map((r) => [
        r.id,
        r.name,
        r.program,
        r.term,
        r.caseId,
        r.caseStatus,
        r.status,
        r.requested,
        r.reviewed,
      ]),
    ]
      .map((r) => r.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-clearance-review.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching records.`);
  }
  function change(setter, value) {
    setter(value);
    setPage(1);
  }
  function openNotification(notification) {
    if (notification.entityType === "cases") {
      const record = database.records?.cases?.find(
        (c) => String(c.caseDatabaseId) === String(notification.entityId),
      );
      if (record) {
        setSelected(record);
        setModal("Case Record");
        return;
      }
    }
    if (notification.entityType === "clearance_reviews") {
      setView("Student Clearance Review");
      return;
    }
    if (notification.entityType === "policies") {
      setView("Policies & Procedures");
      return;
    }
    if (["incident_reports", "cases"].includes(notification.entityType)) {
      setGlobal(
        notification.entityType === "incident_reports"
          ? `IR-${notification.entityId}`
          : String(notification.entityId),
      );
      setView("Case Review");
    }
  }
  function openNav(label) {
    if (label === "Messages") return;
    setGlobal("");
    setAccountOpen(false);
    setMobile(false);
    if (
      [
        "Student Clearance Review",
        "Settings",
        "Notifications",
        "Reports & Analytics",
        "Policies & Procedures",
        "Overview",
        "Incident Monitoring",
        "Case Review",
        "Case Archive",
        "Evidence Validation",
      ].includes(label)
    ) {
      setView(label);
      setModal(null);
      return;
    }
    setModal(label);
  }
  return (
    <div className="osas-app">
      {mobile && (
        <button
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`osas-sidebar ${mobile ? "is-open" : ""}`}>
        <div className="osas-brand">
          <img src="/images/kasangga-logo.png" alt="Kasangga" />
          <button
            aria-label="Close navigation"
            className="ml-auto md:hidden"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-4 pb-2 pt-4 text-[11px] font-bold text-yellow-300">
          OSAS PORTAL
        </p>
        <nav aria-label="OSAS navigation">
          {navigation.map(([label, Icon]) => (
            <button
              key={label}
              className={label === view ? "active" : ""}
              aria-current={label === view ? "page" : undefined}
              onClick={() => openNav(label)}
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
      <header className="osas-topbar">
        <button
          aria-label="Open navigation"
          className="md:hidden"
          onClick={() => setMobile(true)}
        >
          <Menu size={20} />
        </button>
        <form
          className="osas-global"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              ![
                "Case Review",
                "Policies & Procedures",
                "Case Archive",
              ].includes(view)
            )
              setView("Case Review");
            setPage(1);
            setNotice("Showing matching records.");
          }}
        >
          <Search size={16} />
          <input
            aria-label="Search OSAS records"
            placeholder="Search cases, reports, documents, or students..."
            value={global}
            onChange={(e) => setGlobal(e.target.value)}
          />
          <button aria-label="Search records">
            <Search size={17} />
          </button>
        </form>
        <div className="ml-auto flex items-center gap-4">
          <HeaderInbox
            role="osas"
            showMessages={false}
            notifications={notifications}
            onRead={database.markNotificationsRead}
            onNotification={openNotification}
          />
          <div className="relative" ref={accountMenu}>
            <button
              type="button"
              className="flex items-center gap-2 text-left"
              aria-label="Open account menu"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setAccountOpen((open) => !open)}
            >
              <PortalAvatar role="osas" />
              <span className="hidden sm:block">
                <b className="block text-xs text-slate-900">
                  {[auth?.profile?.first_name, auth?.profile?.last_name]
                    .filter(Boolean)
                    .join(" ") || "OSAS Officer"}
                </b>
                <small>OSAS Case Officer</small>
              </span>
              <ChevronDown size={14} />
            </button>
            {accountOpen && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg"
              >
                {["Profile", "Settings", "Help & Support", "Logout"].map(
                  (label) => (
                    <button
                      key={label}
                      type="button"
                      role="menuitem"
                      className={
                        "block w-full px-4 py-2 text-left text-sm hover:bg-green-50 " +
                        (label === "Logout" ? "text-red-700" : "text-slate-700")
                      }
                      onClick={() => {
                        setAccountOpen(false);
                        if (label === "Logout") requestLogout();
                        else if (label === "Settings") openNav("Settings");
                        else setModal(label);
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <main
        className={`osas-main ${settings.compact ? "" : "osas-comfortable"}`}
      >
        {database.error && (
          <p role="alert" className="osas-alert">
            {database.error}
            <button onClick={database.refresh}>Retry</button>
          </p>
        )}
        {database.loading && (
          <p role="status">Loading OSAS records from Supabase...</p>
        )}
        {/* OSAS section router: every child receives the snapshot records or
            settings it needs; mutations go through OsasDatabaseContext RPCs. */}
        {view === "Overview" ? (
          <OsasOverview
            onReports={() => setView("Reports & Analytics")}
            rows={rows}
            settings={settings}
            onCase={(r) => {
              setSelected(r);
              setModal("Case Record");
            }}
            onClearance={review}
          />
        ) : view === "Notifications" ? (
          <OsasNotifications
            rows={notifications}
            loading={database.loading}
            error={database.error}
            onRead={database.markNotificationsRead}
            onOpen={openNotification}
          />
        ) : view === "Settings" ? (
          <OsasSettings
            settings={settings}
            onSave={async (next) => {
              // Persist first; update the rendered preference cache only after
              // the RPC succeeds and its snapshot refresh completes.
              await database.save("settings", null, "settings", next);
              setSettings(next);
            }}
          />
        ) : view === "Reports & Analytics" ? (
          <OsasReports rows={rows} settings={settings} />
        ) : view === "Policies & Procedures" ? (
          <OsasPolicies
            settings={settings}
            searchQuery={global}
            onSearchChange={setGlobal}
            hideSearch
          />
        ) : [
            "Case Review",
            "Incident Monitoring",
            "Evidence Validation",
          ].includes(view) ? (
          <OsasCaseWorkspace
            settings={settings}
            searchQuery={global}
            onSearchChange={setGlobal}
          />
        ) : view === "Case Archive" ? (
          <OsasArchive
            settings={settings}
            searchQuery={global}
            onSearchChange={setGlobal}
          />
        ) : (
          <>
            <div className="text-[10px] text-slate-400">
              Supabase records · Authorized OSAS review
            </div>
            <div className="osas-heading">
              <div>
                <h1>
                  Student Clearance Review{" "}
                  <ShieldCheck size={23} className="text-green-800" />
                </h1>
                <p>
                  Review relevant Kasangga case records when determining student
                  clearance status under authorized institutional procedures.
                </p>
              </div>
              <select
                aria-label="Academic term"
                className={input}
                value={semester}
                onChange={(e) => change(setSemester, e.target.value)}
              >
                <option value="">All academic terms</option>
                {[...new Set(rows.map((r) => r.term))].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="osas-metrics">
              {[
                [
                  FileText,
                  "Pending Review",
                  "Pending Reviews",
                  "Awaiting review",
                  "gold",
                ],
                [
                  CheckCircle,
                  "Cleared",
                  "Cleared",
                  "Completed this semester",
                  "green",
                ],
                [Clock, "On Hold", "On Hold", "Authorized hold active", "blue"],
                [
                  Flag,
                  "Requires Resolution",
                  "Requires Resolution",
                  "Case resolution required",
                  "red",
                ],
              ].map(([Icon, value, label, hint, color]) => (
                <button
                  key={value}
                  aria-label={`Show ${label}`}
                  onClick={() =>
                    change(setStatus, status === value ? "" : value)
                  }
                  aria-pressed={status === value}
                >
                  <span className={`osas-metric-icon ${color}`}>
                    <Icon size={25} />
                  </span>
                  <span>
                    <strong>
                      {
                        rows.filter(
                          (r) =>
                            r.status === value &&
                            (!semester || r.term === semester),
                        ).length
                      }
                    </strong>
                    <b>{label}</b>
                    <small>{hint}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="osas-filters">
              <select
                className={input}
                aria-label="Clearance status"
                value={status}
                onChange={(e) => change(setStatus, e.target.value)}
              >
                <option value="">All Clearance Statuses</option>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                className={input}
                aria-label="College or program"
                value={program}
                onChange={(e) => change(setProgram, e.target.value)}
              >
                <option value="">All Colleges / Programs</option>
                {[...new Set(rows.map((r) => r.program))].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <select
                className={input}
                aria-label="Case status"
                value={caseStatus}
                onChange={(e) => change(setCaseStatus, e.target.value)}
              >
                <option value="">All Case Statuses</option>
                {[...new Set(rows.map((r) => r.caseStatus))].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                className={input}
                aria-label="Requested date"
                type="date"
                value={requested}
                onChange={(e) => change(setRequested, e.target.value)}
              />
              <button
                className={button}
                onClick={() => {
                  setStatus("");
                  setProgram("");
                  setCaseStatus("");
                  setRequested("");
                  setQuery("");
                  setGlobal("");
                  setSemester("");
                  setPage(1);
                }}
              >
                Reset filters
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="osas-search">
                <Search size={16} />
                <input
                  aria-label="Search students"
                  placeholder="Search student ID, name, program, or case number..."
                  value={query}
                  onChange={(e) => change(setQuery, e.target.value)}
                />
              </label>
              <UserExport
                rows={filtered}
                onCsv={exportCsv}
                onNotice={setNotice}
                renderSummary={(rows) =>
                  reportHtml([
                    ["Student ID", "Field", "Value"],
                    ...rows.flatMap((r) =>
                      [
                        ["Student", r.name],
                        ["Program", r.program],
                        ["Status", r.status],
                        ["Requested", r.requested],
                        ["Reviewed", r.reviewed],
                      ].map(([label, value]) => [
                        r.id,
                        label,
                        value || "Not recorded",
                      ]),
                    ),
                  ])
                    .replace(
                      /<p>Local demo records[\s\S]*?<\/p>/,
                      "<p>Student clearance records from the OSAS database.</p>",
                    )
                    .replaceAll(
                      "Reports &amp; Analytics",
                      "Student Clearance Review",
                    )
                    .replaceAll(
                      "Reports & Analytics",
                      "Student Clearance Review",
                    )
                }
              />
            </div>
            {notice && (
              <p role="status" className="text-xs text-green-800">
                {notice}
              </p>
            )}
            <section className="osas-table-panel">
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Student ID",
                        "Student Name",
                        "College / Program",
                        "Academic Year / Semester",
                        "Relevant Case(s)",
                        "Case Status",
                        "Clearance Status",
                        "Requested Date",
                        "Reviewed Date",
                        "Action",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r, i) => (
                      <tr key={r.id}>
                        <td>{(current - 1) * pageSize + i + 1}</td>
                        <td>{r.id}</td>
                        <td>{r.name}</td>
                        <td>{r.program}</td>
                        <td>{r.term}</td>
                        <td>
                          {r.caseId === "None" ? (
                            "None"
                          ) : (
                            <button
                              className="hover:underline"
                              onClick={() => {
                                setSelected(r);
                                setModal("Case Record");
                              }}
                            >
                              {r.caseId}
                            </button>
                          )}
                        </td>
                        <td>
                          <Status value={r.caseStatus} />
                        </td>
                        <td>
                          <Status value={r.status} />
                        </td>
                        <td>{formatDate(r.requested)}</td>
                        <td>{formatDate(r.reviewed)}</td>
                        <td>
                          <button
                            className={button + " whitespace-nowrap"}
                            aria-label={`Review ${r.name}`}
                            onClick={() => review(r)}
                          >
                            {r.status === "Cleared"
                              ? "View Review"
                              : "Review Clearance"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visible.length && (
                  <p className="p-8 text-center text-xs text-slate-500">
                    No matching clearance records. Try resetting your filters.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between p-3 text-xs">
                <span>
                  Showing {filtered.length ? (current - 1) * pageSize + 1 : 0}{" "}
                  to {Math.min(current * pageSize, filtered.length)} of{" "}
                  {filtered.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className={button}
                    aria-label="Previous page"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="rounded bg-green-800 px-3 py-1.5 text-white">
                    {current}
                  </span>
                  <button
                    className={button}
                    aria-label="Next page"
                    disabled={current === pages}
                    onClick={() => setPage(current + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </section>
            {settings.tips && (
              <footer className="osas-note">
                <Info size={20} className="shrink-0 text-blue-600" />
                <p>
                  An incident report alone does not block student clearance.
                  Clearance implications require an authorized OSAS case review,
                  applicable institutional basis, and a recorded decision.
                </p>
                <div>
                  {statuses.map((s) => (
                    <Status key={s} value={s} />
                  ))}
                </div>
              </footer>
            )}
          </>
        )}
      </main>
      {modal === "Review Clearance" && (
        <ClearanceReview
          record={rows.find((r) => r.id === selected.id) || selected}
          onClose={() => setModal(null)}
          onSave={async (updated) => {
            await database.save(
              "clearance",
              updated.clearanceDatabaseId,
              updated.clearanceDatabaseId ? "review" : "create_follow_up",
              updated.clearanceDatabaseId
                ? updated
                : {
                    ...updated,
                    academicYear: "Case follow-up",
                    semester: "Case follow-up",
                  },
            );
            setModal(null);
            return true;
          }}
        />
      )}
      {modal === "Case Record" &&
        database.records?.cases.find((c) => c.caseId === selected?.caseId) && (
          <CaseShortcut
            record={database.records.cases.find(
              (c) => c.caseId === selected.caseId,
            )}
            onSave={database.saveCase}
            onClose={() => setModal(null)}
          />
        )}
      {modal && !["Review Clearance", "Case Record"].includes(modal) && (
        <Modal title={modal} onClose={() => setModal(null)}>
          {modal === "Case Record" ? (
            <div className="space-y-3 text-xs">
              <p>
                <b>{selected.caseId}</b> · {selected.name}
              </p>
              <Status value={selected.caseStatus} />
              <p>
                Open Case Review for the complete database case record.
                Supporting evidence and official decisions have not been
                connected.
              </p>
              <button className={button} onClick={() => review(selected)}>
                Review Clearance
              </button>
            </div>
          ) : modal === "Logout" ? (
            <div className="space-y-3 text-xs">
              <p>
                Leave the OSAS portal? Saved database reviews will remain on
                this browser.
              </p>
              <button className={primary} onClick={() => navigate("/")}>
                Logout
              </button>
            </div>
          ) : modal === "Help & Support" ? (
            <div className="space-y-3 text-sm">
              <p>
                Use Case Review to assess referrals, inspect evidence and record
                case decisions. Review institutional guidance under Policies &
                Procedures.
              </p>
              <p>
                For account access or technical assistance, contact your
                authorized Kasangga administrator. Include the page and
                case/report reference; never share passwords or verification
                codes.
              </p>
              <button
                type="button"
                className={button}
                onClick={() => {
                  setModal(null);
                  openNav("Policies & Procedures");
                }}
              >
                Open Policies & Procedures
              </button>
            </div>
          ) : ["Profile", "Account", "Settings"].includes(modal) ? (
            <div className="space-y-3 text-xs">
              <p>
                <PortalAvatar
                  role="osas"
                  editable
                  className="mb-3 h-16 w-16 rounded-full"
                />
                <b>
                  {[auth?.profile?.first_name, auth?.profile?.last_name]
                    .filter(Boolean)
                    .join(" ") || "OSAS Officer"}
                </b>{" "}
                · OSAS Case Officer
              </p>
              <p>
                {auth?.user?.email}. Display preferences are available in
                Settings.
              </p>
              <button className={button} onClick={requestLogout}>
                Logout
              </button>
            </div>
          ) : modal === "Notifications" ? (
            <p className="p-3 text-xs text-slate-500">
              No {modal.toLowerCase()} are connected to this account yet.
            </p>
          ) : modal === "Overview" || modal === "Reports & Analytics" ? (
            <div className="space-y-3 text-xs">
              <p>
                Clearance summary for the {rows.length} available database
                records.
              </p>
              {statuses.map((s) => (
                <p key={s}>
                  {s}: <b>{rows.filter((r) => r.status === s).length}</b>
                </p>
              ))}
              <button className={button} onClick={exportCsv}>
                Export current clearance results
              </button>
            </div>
          ) : modal === "Policies & Procedures" ? (
            <p className="p-3 text-xs">
              An incident report alone does not block clearance. Review the
              relevant records and record the institutional basis for each
              decision. Official institutional policy documents are not
              connected yet.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              <p>
                This section currently shows case references from the clearance
                records. Full {modal.toLowerCase()} workflows are not connected
                yet.
              </p>
              {rows
                .filter(
                  (r) =>
                    r.caseId !== "None" &&
                    (modal !== "Case Archive" ||
                      r.caseStatus.startsWith("Resolved")),
                )
                .map((r) => (
                  <button
                    key={r.id}
                    className="flex w-full justify-between rounded border p-2 text-left"
                    onClick={() => {
                      setSelected(r);
                      setModal("Case Record");
                    }}
                  >
                    <span>
                      {r.caseId} · {r.name}
                    </span>
                    <Status value={r.caseStatus} />
                  </button>
                ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
