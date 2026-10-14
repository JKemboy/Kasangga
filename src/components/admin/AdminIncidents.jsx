import { useAdminDatabase } from "./AdminDatabaseContext.jsx";
import UserExport from "./UserExport.jsx";
import ServiceMenu from "./ServiceMenu.jsx";
import EvidencePreview from "./EvidencePreview.jsx";
import BookingDetails from "./BookingDetails.jsx";
import UserDetails from "./UserDetails.jsx";
import { paymentBookings } from "./paymentDetailsData.js";
import { CalendarDays, UserRound, Image } from "lucide-react";
import IncidentDetails from "./IncidentDetails.jsx";
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
import { dateLabel } from "./adminData.js";
export default function AdminIncidents({
  users = [],
  applications = [],
  services = [],
  config,
  onUserSave,
  onServiceSave,
  onApplicationSave,
  onDocument,
}) {
  const [linked, setLinked] = useState(null);
  const { database, saveRecord } = useAdminDatabase();
  const workspace = {
    sessions: database?.sessions || [],
    profile: { name: "" },
  };
  function related(r, kind) {
    if (kind === "booking") {
      const b =
        workspace.sessions.find((b) => b.booking === r.booking) ||
        paymentBookings[r.booking];
      if (b) setLinked({ kind, record: b });
      else setNotice("No related booking in the available records.");
    } else if (kind === "account") {
      const u = users.find((u) => u.userId === r.reporterId);
      if (u) setLinked({ kind, id: u.id });
      else setNotice("Reporter account is not available.");
    } else setLinked({ kind, record: r });
  }

  const rows = database?.incidents || [];
  const [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [referral, setReferral] = useState(""),
    [priority, setPriority] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
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
          <option key={v} value={v}>
            {v === "pendingGroup" ? "Pending / Under Review" : v}
          </option>
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
        <UserExport
          kind="incidents"
          rows={filtered}
          onCsv={exportCsv}
          onNotice={setNotice}
        />
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
                      <ServiceMenu
                        service={{ title: r.id }}
                        options={[
                          [CalendarDays, "View booking", "booking"],
                          [UserRound, "View reporter account", "account"],
                          [Image, "Preview evidence", "evidence"],
                        ]}
                        onSelect={(kind) => related(r, kind)}
                      />
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
        <IncidentDetails
          onBooking={(r) => related(r, "booking")}
          onAccount={(r) => related(r, "account")}
          record={rows.find((r) => r.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          onSave={async (updated) => {
            if (!(await saveRecord("incident_reports", updated))) return false;
            return true;
          }}
        />
      )}
      {linked?.kind === "evidence" && (
        <EvidencePreview
          record={linked.record}
          onClose={() => setLinked(null)}
        />
      )}
      {linked?.kind === "booking" && (
        <BookingDetails
          record={linked.record}
          tutor={linked.record.tutor || workspace.profile?.name}
          incidents={rows}
          onClose={() => setLinked(null)}
        />
      )}
      {linked?.kind === "account" && (
        <UserDetails
          user={users.find((u) => u.id === linked.id)}
          applications={applications}
          services={services}
          config={config}
          onSave={onUserSave}
          onServiceSave={onServiceSave}
          onApplicationSave={onApplicationSave}
          onDocument={onDocument}
          onClose={() => setLinked(null)}
        />
      )}
    </section>
  );
}
