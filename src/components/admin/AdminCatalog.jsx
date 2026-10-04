import ServiceDetails from "./ServiceDetails.jsx";
import ServiceMenu from "./ServiceMenu.jsx";
import UserDetails from "./UserDetails.jsx";
import UserExport from "./UserExport.jsx";
import {serviceCsv} from "./serviceActions.js";
import {useInteractions} from "../shared/InteractionProvider.jsx";
import ApplicationReview from "./ApplicationReview.jsx";
import { useState } from "react";
import {
  ShieldCheck,
  BriefcaseBusiness,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import { dateLabel, downloadData } from "./adminData.js";
export default function AdminCatalog({ kind, rows, onUpdate, config, users = [], onUserSave, applications = [], onApplicationSave }) {
  const [serviceAction,setServiceAction]=useState("");
  const [userId,setUserId]=useState(null);

  const verification = kind === "applications",
    title = verification ? "Tutor Verification" : "Service Management";
  const statuses = verification
    ? [
        "Pending",
        "Under Review",
        "Resubmission Required",
        "Approved",
        "Rejected",
      ]
    : ["Active", "Inactive", "Suspended", "Archived"];
  const [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(false),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [action, setAction] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const filtered = rows.filter(
    (r) =>
      (!status ||
        (status === "inactiveGroup"
          ? ["Inactive", "Archived"].includes(r.status)
          : r.status === status)) &&
      (!category || (verification ? r.college : r.category) === category) &&
      Object.values(r)
        .filter((v) => typeof v !== "object")
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 7, current * 7);
  function open(r) {
    setSelected(r);
    setServiceAction("");
    setAction(verification ? r.status : "");
    setReason("");
    setError("");
  }
  function serviceOption(r, action) {
    if(action === "account") {const user=users.find(u=>u.name===r.tutor);if(user)setUserId(user.id);else setNotice("No matching tutor account in the available records.");return;}
    setServiceAction(action);setSelected(r);
  }
  function exportServices() {const url=URL.createObjectURL(new Blob(['\uFEFF'+serviceCsv(filtered)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='admin-services.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Exported '+filtered.length+' matching services.');}
  const pill = (v) => (
    <span
      className={`au-status ${["Active", "Approved", "Complete", "Matched"].includes(v) ? "active" : ["Rejected", "Suspended", "Invalid File", "Incomplete", "Not Matched"].includes(v) ? "suspended" : "restricted"}`}
    >
      {v}
    </span>
  );
  const metrics = verification
    ? statuses.map((s) => [s, rows.filter((r) => r.status === s).length, s])
    : [
        ["Total Services", rows.length, ""],
        [
          "Active Services",
          rows.filter((r) => r.status === "Active").length,
          "Active",
        ],
        [
          "Suspended Services",
          rows.filter((r) => r.status === "Suspended").length,
          "Suspended",
        ],
        [
          "Inactive / Archived",
          rows.filter((r) => ["Inactive", "Archived"].includes(r.status))
            .length,
          "inactiveGroup",
        ],
      ];
  return (
    <section className="ad-page">
      <div className="osas-heading">
        <div>
          <h1>
            {title}{" "}
            {verification ? (
              <ShieldCheck size={22} />
            ) : (
              <BriefcaseBusiness size={22} />
            )}
          </h1>
          <p>
            {verification
              ? "Review Tutor applications and supporting documents before activating Tutor capability."
              : "Monitor and moderate Tutor-created services for platform compliance."}
          </p>
        </div>
      </div>
      <div className={`ad-cards ${verification ? "five" : ""}`}>
        {metrics.map(([label, n, value], i) => (
          <button
            key={label}
            onClick={() => {
              setStatus(value);
              setQuery("");
              setCategory("");
              setPage(1);
            }}
          >
            <span
              style={{
                background: [
                  "#006439",
                  "#087bff",
                  "#ef243d",
                  "#ffb800",
                  "#7825d9",
                ][i],
              }}
            >
              {verification ? (
                <ShieldCheck size={23} />
              ) : (
                <BriefcaseBusiness size={23} />
              )}
            </span>
            <div>
              <b>{n}</b>
              <small>{label}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="ad-toolbar">
        <div className="au-tabs">
          {["", ...statuses].map((s) => (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s || (verification ? "All Applications" : "All Services")}
            </button>
          ))}
        </div>
        <label className="osas-search">
          <Search size={15} />
          <input
            aria-label={`Search ${kind}`}
            placeholder={
              verification
                ? "Search application ID, name, or student ID..."
                : "Search services, subject, or tutor..."
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          className={button}
          aria-expanded={filter}
          onClick={() => setFilter(!filter)}
        >
          <Filter size={14} />
          Filter
        </button>
        {!verification && (
          <UserExport kind="services" rows={filtered} onCsv={exportServices} onNotice={setNotice} />
        )}
      </div>
      {filter && (
        <div className="ad-filter-row">
          <label>
            {verification ? "College" : "Category"}
            <select
              className={input}
              aria-label="Catalog category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {[
                ...new Set(
                  rows.map((r) => (verification ? r.college : r.category)),
                ),
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            className={button}
            onClick={() => {
              setStatus("");
              setCategory("");
              setQuery("");
              setPage(1);
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      {verification && (
        <p className="ad-banner">
          Documents require manual review and an Admin decision.
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      <div className="ad-table">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {(verification
                  ? [
                      "Application ID",
                      "Applicant",
                      "Student ID",
                      "College / Program",
                      "Submitted Date",
                      "Document Status",
                      "Information Match",
                      "Application Status",
                      "Action",
                    ]
                  : [
                      "Service ID",
                      "Tutor",
                      "Service Title",
                      "Subject",
                      "Category",
                      "Hourly Rate",
                      "Session Type",
                      "Created Date",
                      "Service Status",
                      "Actions",
                    ]
                ).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <div className="au-person">
                      <Avatar name={verification ? r.name : r.tutor} />
                      <span>{verification ? r.name : r.tutor}</span>
                    </div>
                  </td>
                  {verification ? (
                    <>
                      <td>{r.studentId}</td>
                      <td>
                        {r.college}
                        <br />
                        {r.program}
                      </td>
                      <td>{dateLabel(r.date)}</td>
                      <td>{pill(r.documents)}</td>
                      <td>{pill(r.match)}</td>
                    </>
                  ) : (
                    <>
                      <td>{r.title}</td>
                      <td>{r.subject}</td>
                      <td>{pill(r.category)}</td>
                      <td>₱{r.rate}/hr</td>
                      <td>{r.type}</td>
                      <td>{dateLabel(r.date)}</td>
                    </>
                  )}
                  <td>{pill(r.status)}</td>
                  <td>
                    <div className="ad-actions">
                      <button
                        className={
                          verification &&
                          !["Approved", "Rejected"].includes(r.status)
                            ? primary
                            : button
                        }
                        aria-label={`Open ${r.id}`}
                        onClick={() => open(r)}
                      >
                        {verification ? (
                          ["Approved", "Rejected"].includes(r.status) ? (
                            "View Application"
                          ) : (
                            "Review Application"
                          )
                        ) : (
                          <>
                            <Eye size={12} />
                            View Service
                          </>
                        )}
                      </button>
                      {!verification && (
                        <ServiceMenu service={r} onSelect={action=>serviceOption(r,action)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-6 text-center text-xs">No matching records.</p>
          )}
        </div>
        <div className="op-pagination p-3">
          <span>
            Showing {filtered.length ? (current - 1) * 7 + 1 : 0} to{" "}
            {Math.min(current * 7, filtered.length)} of {filtered.length}{" "}
            entries
          </span>
          <div>
            <button
              className={button}
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              aria-label="Previous catalog page"
            >
              ‹
            </button>
            <span>{current}</span>
            <button
              className={button}
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
              aria-label="Next catalog page"
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <p className="ad-help">
        {verification
          ? "Supporting documents require manual review."
          : "Tutor-owned content is read-only. Moderation and change requests are recorded locally; no message is sent."}
      </p>
      {selected && verification && (
        <ApplicationReview
          application={rows.find(r => r.id === selected.id) || selected}
          config={config}
          onSave={updated => onUpdate(rows.map(r => r.id === updated.id ? updated : r))}
          onClose={() => setSelected(null)}
        />
      )}
      {selected && !verification && <ServiceDetails key={selected.id+serviceAction} service={rows.find(r=>r.id===selected.id)||selected} initialAction={['Request Changes','Suspend Service','Lift Suspension'].includes(serviceAction)?serviceAction:''} showBookings={serviceAction==='bookings'} onTutor={()=>serviceOption(selected,'account')} onSave={updated=>onUpdate(rows.map(r=>r.id===updated.id?updated:r))} onClose={()=>setSelected(null)} />}
      {userId && <UserDetails user={users.find(u=>u.id===userId)} services={rows} applications={applications} config={config} onSave={onUserSave} onApplicationSave={onApplicationSave} onServiceSave={updated=>onUpdate(rows.map(r=>r.id===updated.id?updated:r))} onClose={()=>setUserId(null)} />}
    </section>
  );
}
