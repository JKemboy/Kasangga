import {useInteractions} from "../shared/InteractionProvider.jsx";
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
export default function AdminCatalog({ kind, rows, onUpdate, config }) {
  const {confirm}=useInteractions();

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
    setAction(verification ? r.status : "");
    setReason("");
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Enter review notes or a moderation reason.");
      return;
    }
    if(!await confirm({title:`${action}?`,message:reason.trim(),accept:action,danger:["Rejected","Suspended"].includes(action), acknowledgement:verification&&action==="Approved"?"I understand this records a local prototype decision. OCR does not establish document authenticity.":undefined}))return;
    const next = rows.map((r) =>
      r.id === selected.id
        ? {
            ...r,
            status: action === "Request Changes" ? r.status : action,
            history: [
              ...r.history,
              {
                from: r.status,
                to: action,
                reason: reason.trim(),
                at: new Date().toISOString(),
                by: "Admin User",
              },
            ],
          }
        : r,
    );
    if (onUpdate(next)) {
      setSelected(null);
      setNotice(
        verification
          ? "Application review saved locally."
          : "Moderation action recorded locally.",
      );
    } else setError("Could not save. Browser storage is unavailable or full.");
  }
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
          <button
            className={primary}
            onClick={() => downloadData("admin-services.json", filtered)}
          >
            <Download size={14} />
            Export
          </button>
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
          Minimum OCR threshold: {config.threshold}% ·{" "}
          {config.ocr
            ? "OCR extraction enabled in configuration."
            : "OCR extraction disabled in configuration."}{" "}
          Confidence and matching do not verify authenticity. Final approval
          requires an Admin decision.
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
                      "OCR Confidence",
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
                      <td
                        className={
                          r.confidence < config.threshold
                            ? "text-red-600"
                            : "text-green-800"
                        }
                      >
                        <b>{r.confidence}%</b>
                      </td>
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
                        <button
                          className={button}
                          aria-label={`Moderate ${r.id}`}
                          onClick={() => open(r)}
                        >
                          <MoreHorizontal size={14} />
                        </button>
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
          ? "Demo application metadata. Source documents and actual OCR processing are not attached."
          : "Tutor-owned content is read-only. Moderation and change requests are recorded locally; no message is sent."}
      </p>
      {selected && (
        <Modal
          title={
            verification
              ? `Application · ${selected.id}`
              : `Service · ${selected.id}`
          }
          onClose={() => setSelected(null)}
        >
          <form onSubmit={save} className="space-y-3 text-xs">
            <p>
              <b>{verification ? selected.name : selected.title}</b> ·{" "}
              {verification ? selected.studentId : selected.tutor}
            </p>
            {verification ? (
              <p>
                Documents: {selected.documents} · OCR: {selected.confidence}% ·{" "}
                {selected.match}. Original files are not connected. Decisions here affect only this local prototype.
              </p>
            ) : (
              <p>
                {selected.subject} · {selected.category} · ₱{selected.rate}/hr ·{" "}
                {selected.type}
              </p>
            )}
            {selected.history.length > 0 && (
              <details>
                <summary>Review history ({selected.history.length})</summary>
                {selected.history.map((h, i) => (
                  <p className="rounded border p-2 mt-2" key={i}>
                    {h.from} → {h.to}: {h.reason}
                  </p>
                ))}
              </details>
            )}
            {verification &&
            ["Approved", "Rejected"].includes(selected.status) ? (
              <p>Final demo decision: {selected.status}. Read-only.</p>
            ) : (
              <>
                <label className="block">
                  {verification ? "Review decision" : "Moderation action"}
                  <select
                    className={input}
                    aria-label="Catalog decision"
                    required
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                  >
                    <option value="">Choose action</option>
                    {(verification
                      ? statuses
                      : ["Suspended", "Active", "Archived", "Request Changes"]
                    ).map((s) => (
                      <option
                        key={s}
                        disabled={false}
                      >
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  {verification ? "Review notes" : "Reason / requested changes"}
                  <textarea
                    className={input}
                    aria-label="Catalog review notes"
                    rows={3}
                    required
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {error && (
                  <p role="alert" className="text-red-600">
                    {error}
                  </p>
                )}
                <button className={primary}>Save Review</button>
              </>
            )}
          </form>
        </Modal>
      )}
    </section>
  );
}
