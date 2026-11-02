import useNotificationTarget from "./useNotificationTarget.js";
// Incident Reports: lets LCO review reports, linked users, evidence, and referral status through saved-record callbacks.
import { statusClass } from "../shared/statusColors.js";
import { useLcoDatabase } from "./LcoDatabaseContext.jsx";
import UserExport from "./UserExport.jsx";
import EvidencePreview from "./EvidencePreview.jsx";
import BookingDetails from "./BookingDetails.jsx";
import UserDetails from "./UserDetails.jsx";
import { paymentBookings } from "./paymentDetailsData.js";
import { CalendarDays, Image } from "lucide-react";
import IncidentDetails from "./IncidentDetails.jsx";
import { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Clock,
  Laptop,
  Users,
  Check,
  Download,
  Info,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import { dateLabel } from "./lcoData.js";
export default function LcoIncidents({
  notificationTarget,
  searchQuery = "",
  onQueryChange = () => {},
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
  const { database, saveRecord } = useLcoDatabase();
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
  const [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [referral, setReferral] = useState(""),
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
          ? ["Pending Review", "Under LCO Review"].includes(r.status)
          : r.status === status)) &&
      (!referral || r.referral === referral) &&
      [r.id, r.booking, r.reporter, r.reported, r.type, r.issue]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()),
  );
  const targetRow = useNotificationTarget(
    notificationTarget,
    filtered,
    7,
    setPage,
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
    onQueryChange("");
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
    a.download = "lco-incident-reports.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} reports.`);
  }
  const pill = (v) => <span className={statusClass(v, "ai-pill")}>{v}</span>;
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
      <div className="oswe-heading">
        <div>
          <h1>
            Incident Reports <ShieldCheck size={22} />
          </h1>
          <p>
            Monitor submitted incidents, resolve authorized platform issues, and
            refer institutional conduct matters to OSWE.
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
              ["Pending Review", "Under LCO Review"].includes(r.status),
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
            "Referred to OSWE",
            period.filter((r) => r.referral === "Referred to OSWE").length,
            () => setReferral("Referred to OSWE"),
          ],
          [
            Check,
            "Resolved Platform Issues",
            period.filter((r) => r.status === "Resolved by LCO").length,
            () => setStatus("Resolved by LCO"),
          ],
        ].map(([Icon, label, n, action], i) => (
          <button
            key={label}
            aria-pressed={
              [
                !type && !status && !referral,
                ["pendingGroup", "Pending Review", "Under LCO Review"].includes(
                  status,
                ),
                type === "Platform / Technical",
                referral === "Referred to OSWE",
                status === "Resolved by LCO",
              ][i]
            }
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
          "Under LCO Review",
          "LCO Screening Complete",
          "Resolved by LCO",
          ...(status === "pendingGroup" ? ["pendingGroup"] : []),
        ])}
        {select("All Referral Statuses", referral, setReferral, [
          "Not Required",
          "Not Yet Referred",
          "Referred to OSWE",
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
        <button
          className={button}
          onClick={() => {
            clear();
            setStart("");
            setEnd("");
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
        sanction. Formal conduct decisions are handled by OSWE.
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
                  "Submitted Date",
                  "LCO Review Status",
                  "OSWE Referral Status",
                  "Action",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} {...targetRow(r)}>
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
                  <td>{pill(r.type)}</td>
                  <td>{dateLabel(r.date)}</td>
                  <td>{pill(r.status)}</td>
                  <td>{pill(r.referral)}</td>
                  <td>
                    <div className="ad-actions ai-report-actions">
                      <button
                        type="button"
                        className={button}
                        disabled={!r.booking}
                        onClick={() => related(r, "booking")}
                      >
                        <CalendarDays size={14} />
                        View Booking
                      </button>
                      <button
                        type="button"
                        className={button}
                        onClick={() => related(r, "evidence")}
                      >
                        <Image size={14} />
                        Preview Evidence
                      </button>
                      <button
                        type="button"
                        className={primary}
                        onClick={() => open(r)}
                      >
                        <FileText size={14} />
                        View Report
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
