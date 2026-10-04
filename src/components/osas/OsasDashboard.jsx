import ClearanceReview from './ClearanceReview.jsx';
import UserExport from '../admin/UserExport.jsx';
import {reportHtml} from '../admin/reportExport.js';
import HeaderInbox from '../shared/HeaderInbox.jsx';
import {useLogout} from "../shared/LogoutProvider.jsx";
import OsasEvidence from "./OsasEvidence.jsx";
import OsasArchive from "./OsasArchive.jsx";
import OsasCases from "./OsasCases.jsx";
import OsasIncidents from "./OsasIncidents.jsx";
import OsasOverview from "./OsasOverview.jsx";
import OsasPolicies from "./OsasPolicies.jsx";
import OsasReports from "./OsasReports.jsx";
import OsasSettings, { loadSettings } from "./OsasSettings.jsx";
import { useState } from "react";
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
  GraduationCap,
  IdCard,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
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

const storageKey = "campustutor:osas-clearance:v1";
const term = "AY 2026–2027 · 1st Semester";
const statuses = [
  "Pending Review",
  "Cleared",
  "On Hold",
  "Requires Resolution",
];
const initial = [];
const navigation = [
  ["Overview", LayoutDashboard],
  ["Case Review", FileText],
  ["Evidence Validation", ShieldCheck],
  ["Incident Monitoring", CircleAlert],
  ["Student Clearance Review", IdCard],
  ["Policies & Procedures", BookOpen],
  ["Case Archive", Archive],
  ["Reports & Analytics", ChartNoAxesCombined],
  ["Settings", Settings],
];
function load() {
  try {
    const rows = JSON.parse(localStorage.getItem(storageKey));
    if (
      Array.isArray(rows) &&
      rows.every(
        (r) =>
          typeof r.id === "string" &&
          statuses.includes(r.status) &&
          Array.isArray(r.history),
      )
    )
      return rows;
  } catch {}
  return structuredClone(initial);
}
const dateLabel = (v) =>
  v
    ? new Date(v + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
function Status({ value }) {
  return (
    <span
      className={`osas-badge ${value === "Cleared" ? "green" : value === "On Hold" || value === "Awaiting Evidence" ? "blue" : value === "Requires Resolution" ? "red" : value === "Pending Review" || value === "Under Review" ? "gold" : "gray"}`}
    >
      {value}
    </span>
  );
}
function csvCell(v) {
  return (
    '"' +
    String(/^[=+@\-\t\r]/.test(String(v)) ? `'${v}` : v).replaceAll('"', '""') +
    '"'
  );
}

export default function OsasDashboardPage() {
 const requestLogout = useLogout();

  const navigate = useNavigate();
  const [view, setView] = useState("Overview");
  const [settings, setSettings] = useState(loadSettings);
  const pageSize = Number(settings.pageSize);
  const formatDate = (v) =>
    !v
      ? "—"
      : settings.dateFormat === "iso"
        ? v
        : new Date(v + "T12:00:00").toLocaleDateString("en-US", {
            month: settings.dateFormat === "short" ? "2-digit" : "short",
            day: "numeric",
            year: "numeric",
          });
  const [rows, setRows] = useState(load),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [global, setGlobal] = useState(""),
    [status, setStatus] = useState(""),
    [program, setProgram] = useState(""),
    [caseStatus, setCaseStatus] = useState(""),
    [requested, setRequested] = useState(""),
    [semester, setSemester] = useState(term),
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
      r.term === semester &&
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
  function save(e) {
    e.preventDefault();
    if (!basis.trim() || !notes.trim() || !confirmed) {
      setError(
        "Enter the institutional basis and review notes, then confirm the review.",
      );
      return;
    }
    const reviewed = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const next = rows.map((r) =>
      r.id === selected.id
        ? {
            ...r,
            status: decision,
            reviewed,
            history: [
              ...r.history,
              {
                status: decision,
                basis: basis.trim(),
                notes: notes.trim(),
                reviewed,
                officer: "OSAS Officer",
              },
            ],
          }
        : r,
    );
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRows(next);
      setModal(null);
      setNotice("Review saved on this browser.");
    } catch {
      setError(
        "Could not save the review. Browser storage is unavailable or full.",
      );
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
  function openNav(label) {
    setMobile(false);
    if (
      [
        "Student Clearance Review",
        "Settings",
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
          <GraduationCap size={32} />
          <span>
            Campus<span>Tutor</span>
          </span>
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
            setView("Student Clearance Review");
            setQuery(global);
            setPage(1);
            setNotice("Showing matching student and case records.");
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
          <HeaderInbox role="osas" notifications={rows.map(r=>({id:r.id,title:"Case record update",text:`${r.name || r.id}: ${r.status}`,kind:"incident",time:r.updatedAt || r.date || "",record:r}))} onNotification={n=>{setSelected(n.record);setModal("Case Record");}}/>
          <button
            className="flex items-center gap-2 text-left"
            aria-label="Open account menu"
            onClick={() => setModal("Account")}
          >
            <span className="osas-avatar">OS</span>
            <span className="hidden sm:block">
              <b className="block text-xs text-slate-900">OSAS Officer</b>
              <small>OSAS Case Officer</small>
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>
      <main
        className={`osas-main ${settings.compact ? "" : "osas-comfortable"}`}
      >
        {view === "Overview" ? (
          <OsasOverview
            onReports={()=>setView("Reports & Analytics")}
            rows={rows}
            settings={settings}
            onCase={(r) => {
              setSelected(r);
              setModal("Case Record");
            }}
            onClearance={review}
          />
        ) : view === "Settings" ? (
          <OsasSettings settings={settings} onSave={setSettings} />
        ) : view === "Reports & Analytics" ? (
          <OsasReports rows={rows} settings={settings} />
        ) : view === "Policies & Procedures" ? (
          <OsasPolicies settings={settings} />
        ) : view === "Incident Monitoring" ? (
          <OsasIncidents settings={settings} />
        ) : view === "Case Review" ? (
          <OsasCases settings={settings} />
        ) : view === "Case Archive" ? (
          <OsasArchive settings={settings} />
        ) : view === "Evidence Validation" ? (
          <OsasEvidence settings={settings} />
        ) : (
          <>
            <div className="text-[10px] text-slate-400">
              Local demo · Reviews stay on this browser
            </div>
            <div className="osas-heading">
              <div>
                <h1>
                  Student Clearance Review{" "}
                  <ShieldCheck size={23} className="text-green-800" />
                </h1>
                <p>
                  Review relevant CampusTutor case records when determining
                  student clearance status under authorized institutional
                  procedures.
                </p>
              </div>
              <select
                aria-label="Academic term"
                className={input}
                value={semester}
                onChange={(e) => change(setSemester, e.target.value)}
              >
                <option>{term}</option>
                <option>AY 2025–2026 · 2nd Semester</option>
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
                          (r) => r.status === value && r.term === semester,
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
                  setSemester(term);
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
              <UserExport rows={filtered} onCsv={exportCsv} onNotice={setNotice} renderSummary={rows=>reportHtml([['Student ID','Field','Value'],...rows.flatMap(r=>[['Student',r.name],['Program',r.program],['Status',r.status],['Requested',r.requested],['Reviewed',r.reviewed]].map(([label,value])=>[r.id,label,value||'Not recorded']))]).replace(/<p>Local demo records[\s\S]*?<\/p>/, '<p>Filtered local student clearance records.</p>').replaceAll('Reports &amp; Analytics','Student Clearance Review').replaceAll('Reports & Analytics','Student Clearance Review')}/>
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
      {modal === "Review Clearance" && <ClearanceReview record={rows.find(r=>r.id===selected.id)||selected} onClose={()=>setModal(null)} onSave={updated=>{try{const next=rows.map(r=>r.id===updated.id?updated:r);localStorage.setItem(storageKey,JSON.stringify(next));setRows(next);return true;}catch{return false;}}}/>}
      {modal && modal !== "Review Clearance" && (
        <Modal title={modal} onClose={() => setModal(null)}>
          {modal === "Case Record" ? (
            <div className="space-y-3 text-xs">
              <p>
                <b>{selected.caseId}</b> · {selected.name}
              </p>
              <Status value={selected.caseStatus} />
              <p>
                Only the case reference and status are available in this demo.
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
                Leave the OSAS portal? Saved local reviews will remain on this
                browser.
              </p>
              <button className={primary} onClick={requestLogout}>
                Logout
              </button>
            </div>
          ) : modal === "Account" || modal === "Settings" ? (
            <div className="space-y-3 text-xs">
              <p>
                <b>OSAS Officer</b> · OSAS Case Officer
              </p>
              <p>
                Demo account. Institutional account settings are not connected
                yet.
              </p>
              <button className={button} onClick={requestLogout}>
                Logout
              </button>
            </div>
          ) : modal === "Notifications" || modal === "Messages" ? (
            <p className="p-3 text-xs text-slate-500">
              No {modal.toLowerCase()} are connected to this demo account yet.
            </p>
          ) : modal === "Overview" || modal === "Reports & Analytics" ? (
            <div className="space-y-3 text-xs">
              <p>
                Clearance summary for the {rows.length} available demo records.
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
