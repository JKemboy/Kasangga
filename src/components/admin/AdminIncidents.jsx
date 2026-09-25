import {useInteractions} from "../shared/InteractionProvider.jsx";
import { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Clock,
  Laptop,
  Users,
  Check,
  Search,
  Download,
  MoreHorizontal,
  Info,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import { dateLabel, loadCollection } from "./adminData.js";
const key = "campustutor:admin-incidents:v1";
const initial = [
  [
    "0142",
    "1842",
    "Juan Dela Cruz",
    "Maria Angelica Reyes",
    "Platform / Technical",
    "Meeting link inaccessible",
    "Medium",
    "2026-09-17",
    "Under Admin Review",
    "Not Required",
  ],
  [
    "0141",
    "1835",
    "Karl Jhon Dimaano",
    "Maria Angelica Reyes",
    "Institutional Conduct",
    "Inappropriate conduct",
    "High",
    "2026-09-16",
    "Admin Screening Complete",
    "Referred to OSAS",
  ],
  [
    "0140",
    "1839",
    "Renalyn Laurente",
    "Ella Mae Santos",
    "Platform / Technical",
    "Notification failure",
    "Low",
    "2026-09-16",
    "Resolved by Admin",
    "Not Required",
  ],
  [
    "0139",
    "1818",
    "Ella Mae Santos",
    "Adrian Paul Flores",
    "Platform / Technical",
    "Service access concern",
    "Medium",
    "2026-09-15",
    "Resolved by Admin",
    "Not Required",
  ],
  [
    "0138",
    "1824",
    "John Michael Perez",
    "Mark Joseph Paloma",
    "Institutional Conduct",
    "Harassment allegation",
    "High",
    "2026-09-15",
    "Pending Review",
    "Not Yet Referred",
  ],
  [
    "0137",
    "",
    "Mark Joseph Paloma",
    "Karl Jhon Dimaano",
    "Platform / Technical",
    "Account access",
    "Medium",
    "2026-09-14",
    "Under Admin Review",
    "Not Required",
  ],
  [
    "0136",
    "1827",
    "Adrian Paul Flores",
    "Ella Mae Santos",
    "Institutional Conduct",
    "Misconduct allegation",
    "High",
    "2026-09-14",
    "Admin Screening Complete",
    "Referred to OSAS",
  ],
].map(
  ([
    id,
    booking,
    reporter,
    reported,
    type,
    issue,
    priority,
    date,
    status,
    referral,
  ]) => ({
    id: `IR-2026-${id}`,
    booking: booking ? `BK-2026-${booking}` : "",
    reporter,
    reported,
    type,
    issue,
    priority,
    date,
    status,
    referral,
    history: [],
  }),
);
export default function AdminIncidents() {
  const {confirm}=useInteractions();

  const [rows, setRows] = useState(() => loadCollection(key, initial)),
    [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [referral, setReferral] = useState(""),
    [priority, setPriority] = useState(""),
    [start, setStart] = useState("2026-05-01"),
    [end, setEnd] = useState("2026-09-30"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [decision, setDecision] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const invalid = start && end && start > end;
  const period = invalid
    ? []
    : rows.filter(
        (r) => (!start || r.date >= start) && (!end || r.date <= end),
      );
  const filtered = period.filter(
    (r) =>
      (!type || r.type === type) &&
      (!status ||
        (status === "pendingGroup"
          ? ["Pending Review", "Under Admin Review"].includes(r.status)
          : r.status === status)) &&
      (!referral || r.referral === referral) &&
      (!priority || r.priority === priority) &&
      [r.id, r.booking, r.reporter, r.reported, r.type, r.issue]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 7, current * 7);
  function change(setter, v) {
    setter(v);
    setPage(1);
  }
  function clear() {
    setType("");
    setStatus("");
    setReferral("");
    setPriority("");
    setQuery("");
    setPage(1);
  }
  function open(r) {
    setSelected(r);
    setDecision("Under Admin Review");
    setNotes("");
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Enter review notes before saving.");
      return;
    }
    const allowed =
      selected.type === "Platform / Technical"
        ? ["Under Admin Review", "Resolved by Admin"]
        : ["Under Admin Review", "Referred to OSAS"];
    if (!allowed.includes(decision)) {
      setError("Choose an action appropriate for this report.");
      return;
    }
    if(decision!=="Under Admin Review"&&!await confirm({title:decision==="Referred to OSAS"?"Refer this report to OSAS?":"Mark this issue resolved?",message:notes,accept:decision}))return;
    const next = rows.map((r) =>
      r.id === selected.id
        ? {
            ...r,
            status:
              decision === "Referred to OSAS"
                ? "Admin Screening Complete"
                : decision,
            referral: decision === "Referred to OSAS" ? decision : r.referral,
            history: [
              ...r.history,
              {
                action: decision,
                notes: notes.trim(),
                at: new Date().toISOString(),
                by: "Admin User",
              },
            ],
          }
        : r,
    );
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setRows(next);
      setSelected(null);
      setNotice(
        decision === "Referred to OSAS"
          ? "Referral recorded locally. No external notification was sent."
          : "Admin review saved on this browser.",
      );
    } catch {
      setError("Could not save. Browser storage is unavailable or full.");
    }
  }
  function exportCsv() {
    const fields = [
      "id",
      "booking",
      "reporter",
      "reported",
      "type",
      "issue",
      "priority",
      "date",
      "status",
      "referral",
    ];
    const csv = [fields, ...filtered.map((r) => fields.map((f) => r[f]))]
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-incident-reports.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} reports.`);
  }
  const pill = (v) => (
    <span
      className={`ai-pill ${["High", "Institutional Conduct"].includes(v) ? "red" : ["Resolved by Admin", "Admin Screening Complete"].includes(v) ? "green" : v === "Referred to OSAS" ? "purple" : v === "Not Required" ? "gray" : v === "Platform / Technical" || v === "Low" ? "blue" : "gold"}`}
    >
      {v}
    </span>
  );
  function select(label, value, setter, options) {
    return (
      <select
        className={input}
        aria-label={label}
        value={value}
        onChange={(e) => change(setter, e.target.value)}
      >
        <option value="">{label}</option>
        {options.map((v) => (
          <option key={v} value={v}>{v === "pendingGroup" ? "Pending / Under Review" : v}</option>
        ))}
      </select>
    );
  }
  return (
    <section className="ad-page ai-incidents">
      <div className="osas-heading">
        <div>
          <h1>
            Incident Reports <ShieldCheck size={22} />
          </h1>
          <p>
            Monitor submitted incidents, resolve authorized platform issues, and
            refer institutional conduct matters to OSAS.
          </p>
        </div>
      </div>
      <div className="ad-cards five">
        {[
          [FileText, "Total Reports", period.length, () => {}],
          [
            Clock,
            "Pending Review",
            period.filter((r) =>
              ["Pending Review", "Under Admin Review"].includes(r.status),
            ).length,
            () => setStatus("pendingGroup"),
          ],
          [
            Laptop,
            "Platform / Technical Issues",
            period.filter((r) => r.type === "Platform / Technical").length,
            () => setType("Platform / Technical"),
          ],
          [
            Users,
            "Referred to OSAS",
            period.filter((r) => r.referral === "Referred to OSAS").length,
            () => setReferral("Referred to OSAS"),
          ],
          [
            Check,
            "Resolved Administrative Issues",
            period.filter((r) => r.status === "Resolved by Admin").length,
            () => setStatus("Resolved by Admin"),
          ],
        ].map(([Icon, label, n, action], i) => (
          <button
            key={label}
            onClick={() => {
              clear();
              action();
            }}
          >
            <span
              style={{
                background: [
                  "#ef1736",
                  "#ffa800",
                  "#0878ff",
                  "#ec202d",
                  "#00853a",
                ][i],
              }}
            >
              <Icon size={22} />
            </span>
            <div>
              <b>{n}</b>
              <small>{label}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="ai-filters">
        {select("All Incident Types", type, setType, [
          "Platform / Technical",
          "Institutional Conduct",
        ])}
        {select("All Review Statuses", status, setStatus, [
          "Pending Review",
          "Under Admin Review",
          "Admin Screening Complete",
          "Resolved by Admin",
          ...(status === "pendingGroup" ? ["pendingGroup"] : []),
        ])}
        {select("All Referral Statuses", referral, setReferral, [
          "Not Required",
          "Not Yet Referred",
          "Referred to OSAS",
        ])}
        {select("All Priorities", priority, setPriority, [
          "High",
          "Medium",
          "Low",
        ])}
        <label>
          From
          <input
            aria-label="Incident start date"
            className={input}
            type="date"
            value={start}
            onChange={(e) => change(setStart, e.target.value)}
          />
        </label>
        <label>
          To
          <input
            aria-label="Incident end date"
            className={input}
            type="date"
            value={end}
            onChange={(e) => change(setEnd, e.target.value)}
          />
        </label>
      </div>
      <div className="ad-toolbar">
        <label className="osas-search">
          <Search size={15} />
          <input
            aria-label="Search admin incidents"
            placeholder="Search report ID, booking ID, reporter, reported user, or incident type..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
        <button
          className={button}
          onClick={() => {
            clear();
            setStart("2026-05-01");
            setEnd("2026-09-30");
          }}
        >
          Reset filters
        </button>
        <button className={primary} onClick={exportCsv}>
          <Download size={14} />
          Export
        </button>
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-red-600">
          End date must be on or after start date.
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      <p className="ad-banner flex items-center gap-2">
        <Info size={16} />
        Submitting a report does not prove misconduct or create an automatic
        sanction. Formal conduct decisions are handled by OSAS.
      </p>
      <div className="ai-table">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {[
                  "Incident Report ID",
                  "Related Booking ID",
                  "Reporter",
                  "Reported User",
                  "Incident Type",
                  "Priority",
                  "Submitted Date",
                  "Admin Review Status",
                  "OSAS Referral Status",
                  "Action",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.id}</b>
                  </td>
                  <td>{r.booking || "—"}</td>
                  <td>
                    <div className="au-person">
                      <Avatar name={r.reporter} />
                      {r.reporter}
                    </div>
                  </td>
                  <td>
                    <div className="au-person">
                      <Avatar name={r.reported} />
                      {r.reported}
                    </div>
                  </td>
                  <td>
                    {pill(r.type)}
                    <small>{r.issue}</small>
                  </td>
                  <td>{pill(r.priority)}</td>
                  <td>{dateLabel(r.date)}</td>
                  <td>{pill(r.status)}</td>
                  <td>{pill(r.referral)}</td>
                  <td>
                    <div className="ad-actions">
                      <button
                        className={button}
                        aria-label={`Open ${r.id}`}
                        onClick={() => open(r)}
                      >
                        {[
                          "Admin Screening Complete",
                          "Resolved by Admin",
                        ].includes(r.status)
                          ? "View Report"
                          : "Review Report"}
                      </button>
                      <button
                        className={button}
                        aria-label={`Details ${r.id}`}
                        onClick={() => open(r)}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-6 text-center">No matching incident reports.</p>
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
              aria-label="Previous report page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </button>
            <span>{current}</span>
            <button
              className={button}
              aria-label="Next report page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
      {selected && (
        <Modal
          title={`Incident Report · ${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <form onSubmit={save} className="space-y-3 text-xs">
            <p>
              <b>{selected.issue}</b> · {selected.type}
            </p>
            <p>
              Reporter: {selected.reporter} · Reported user: {selected.reported}
            </p>
            <p>
              Booking: {selected.booking || "None"} · {dateLabel(selected.date)}{" "}
              · {selected.priority} priority
            </p>
            <p>
              {selected.status} · {selected.referral}
            </p>
            <p className="rounded bg-blue-50 p-3">
              Demo record. Original evidence and external OSAS delivery are not
              connected. No user sanction or misconduct finding is created by
              this review.
            </p>
            {selected.history.length > 0 && (
              <details>
                <summary>Review history ({selected.history.length})</summary>
                {selected.history.map((h, i) => (
                  <div key={i} className="mt-2 rounded border p-2">
                    <b>{h.action}</b>
                    <p>{h.notes}</p>
                    <p>
                      {h.by} ·{" "}
                      {new Date(h.at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </p>
                  </div>
                ))}
              </details>
            )}
            {["Admin Screening Complete", "Resolved by Admin"].includes(
              selected.status,
            ) ? (
              <p>Read-only completed Admin review.</p>
            ) : (
              <>
                <label className="block">
                  Admin action
                  <select
                    aria-label="Admin incident action"
                    className={input}
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                  >
                    <option>Under Admin Review</option>
                    <option>
                      {selected.type === "Platform / Technical"
                        ? "Resolved by Admin"
                        : "Referred to OSAS"}
                    </option>
                  </select>
                </label>
                <label className="block">
                  Review notes
                  <textarea
                    aria-label="Incident review notes"
                    className={input}
                    required
                    maxLength={2000}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
