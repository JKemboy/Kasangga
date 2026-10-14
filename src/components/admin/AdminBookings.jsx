import { useAdminDatabase } from "./AdminDatabaseContext.jsx";
import BookingDetails from "./BookingDetails.jsx";
import IncidentDetails from "./IncidentDetails.jsx";
import UserExport from "./UserExport.jsx";
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  X,
  Search,
  Download,
  Eye,
  Info,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import { money } from "../tutor/workspace/data.js";
import { dateLabel } from "./adminData.js";
export default function AdminBookings() {
  const { database, saveRecord } = useAdminDatabase();
  const incidents = database?.incidents || [];
  const [incident, setIncident] = useState(null);
  const workspace = {
    sessions: database?.sessions || [],
    profile: { name: "" },
  };
  const [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [payment, setPayment] = useState(""),
    [query, setQuery] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [dates, setDates] = useState(false),
    [notice, setNotice] = useState("");
  const rows = [...workspace.sessions].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    invalid = start && end && start > end;
  const filtered = invalid
    ? []
    : rows.filter(
        (r) =>
          (!start || r.date >= start) &&
          (!end || r.date <= end) &&
          (!status ||
            (status === "scheduled"
              ? ["Upcoming", "Confirmed", "Pending"].includes(r.status)
              : r.status === status)) &&
          (!type || r.type === type) &&
          (!payment || r.payment === payment) &&
          [r.booking || r.id, r.learner, r.tutor, r.subject, r.service, r.topic]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      );
  const pages = Math.max(1, Math.ceil(filtered.length / 6)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 6, current * 6);
  function change(setter, value) {
    setter(value);
    setPage(1);
  }
  const time = (v) => {
    const [h, m] = v.split(":");
    return `${Number(h) % 12 || 12}:${m} ${Number(h) >= 12 ? "PM" : "AM"}`;
  };
  const badge = (v) => (
    <span
      className={`au-status ${["Completed", "Confirmed", "Paid"].includes(v) ? "active" : v === "Cancelled" ? "suspended" : "restricted"}`}
    >
      {v}
    </span>
  );
  function exportCsv() {
    const csv = [
      [
        "Booking ID",
        "Learner",
        "Tutor",
        "Service",
        "Topic",
        "Session Date",
        "Start",
        "End",
        "Session Type",
        "Gross Amount",
        "Booking Status",
        "Payment Status",
      ],
      ...filtered.map((r) => [
        r.booking || r.id,
        r.learner,
        r.tutor,
        r.service,
        r.topic,
        r.date,
        r.start,
        r.end,
        r.type,
        r.amount,
        r.status,
        r.payment,
      ]),
    ]
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(/^[=+@\-\t\r]/.test(String(v)) ? `'${v}` : v).replaceAll(
                '"',
                '""',
              ) +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-bookings.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching bookings.`);
  }
  return (
    <section className="ad-page ab-bookings">
      <div className="osas-heading">
        <div>
          <h1>
            Bookings Monitoring <CalendarDays size={22} />
          </h1>
          <p>Monitor CampusTutor tutoring bookings and session statuses.</p>
        </div>
      </div>
      <div className="ad-cards">
        {[
          [CalendarDays, rows.length, "Total Bookings", ""],
          [
            CalendarDays,
            rows.filter((r) =>
              ["Upcoming", "Confirmed", "Pending"].includes(r.status),
            ).length,
            "Upcoming / Confirmed",
            "scheduled",
          ],
          [
            CheckCircle,
            rows.filter((r) => r.status === "Completed").length,
            "Completed",
            "Completed",
          ],
          [
            X,
            rows.filter((r) => r.status === "Cancelled").length,
            "Cancelled",
            "Cancelled",
          ],
        ].map(([Icon, n, label, value], i) => (
          <button
            key={label}
            onClick={() => {
              change(setStatus, value);
              setQuery("");
              setType("");
              setPayment("");
            }}
          >
            <span
              style={{
                background: ["#006337", "#0878ff", "#006137", "#ed1737"][i],
              }}
            >
              <Icon size={25} />
            </span>
            <div>
              <b>{n}</b>
              <small>{label}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="au-tabs">
        {[
          ["All Bookings", ""],
          ["Upcoming / Pending", "scheduled"],
          ["Confirmed", "Confirmed"],
          ["Completed", "Completed"],
          ["Cancelled", "Cancelled"],
        ].map(([label, value]) => (
          <button
            key={label}
            aria-pressed={status === value}
            onClick={() => change(setStatus, value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ab-filters">
        <button
          className={button}
          aria-label="Booking date range"
          onClick={() => setDates(true)}
        >
          <CalendarDays size={14} />
          {start ? dateLabel(start) : "Any date"} –{" "}
          {end ? dateLabel(end) : "Any date"}
        </button>
        <select
          className={input}
          aria-label="Booking session type"
          value={type}
          onChange={(e) => change(setType, e.target.value)}
        >
          <option value="">All Session Types</option>
          {[...new Set(rows.map((r) => r.type))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          className={input}
          aria-label="Booking payment status"
          value={payment}
          onChange={(e) => change(setPayment, e.target.value)}
        >
          <option value="">All Payment Statuses</option>
          {[...new Set(rows.map((r) => r.payment))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <label className="osas-search">
          <Search size={15} />
          <input
            aria-label="Search bookings"
            placeholder="Search booking ID, learner, tutor, subject..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
        <button
          className={button}
          onClick={() => {
            setStatus("");
            setType("");
            setPayment("");
            setQuery("");
            setStart("");
            setEnd("");
            setPage(1);
            setNotice("");
          }}
        >
          Reset filters
        </button>
        <UserExport
          kind="bookings"
          rows={filtered.map((r) => ({
            ...r,
            tutor: r.tutor,
          }))}
          onCsv={exportCsv}
          onNotice={setNotice}
        />
      </div>
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      {invalid && (
        <p role="alert" className="text-xs text-red-600">
          End date must be on or after start date.
        </p>
      )}
      <div className="ab-table">
        <table>
          <thead>
            <tr>
              {[
                "Booking ID",
                "Learner",
                "Tutor",
                "Service / Subject",
                "Specific Topic",
                "Session Date",
                "Time",
                "Session Type",
                "Gross Amount",
                "Booking Status",
                "Payment Status",
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
                  <b>{r.booking || r.id}</b>
                </td>
                <td>
                  <div className="au-person">
                    <Avatar name={r.learner} />
                    {r.learner}
                  </div>
                </td>
                <td>
                  <div className="au-person">
                    <Avatar name={r.tutor} />
                    {r.tutor}
                  </div>
                </td>
                <td>{r.service}</td>
                <td>{r.topic}</td>
                <td>{dateLabel(r.date)}</td>
                <td>
                  {time(r.start)} – {time(r.end)}
                </td>
                <td>
                  {r.type}
                  {r.type === "Online" && <small>{r.provider}</small>}
                </td>
                <td>{money(r.amount)}</td>
                <td>{badge(r.status)}</td>
                <td>{badge(r.payment)}</td>
                <td>
                  <button
                    className={button}
                    aria-label={`View booking ${r.id}`}
                    onClick={() => setSelected(r)}
                  >
                    <Eye size={13} />
                    View Booking
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-slate-500">
            No matching bookings. Try resetting your filters.
          </p>
        )}
      </div>
      <div className="op-pagination">
        <span>
          Showing {filtered.length ? (current - 1) * 6 + 1 : 0} to{" "}
          {Math.min(current * 6, filtered.length)} of {filtered.length} entries
        </span>
        <div>
          <button
            className={button}
            aria-label="Previous booking page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            ‹
          </button>
          <span>{current}</span>
          <button
            className={button}
            aria-label="Next booking page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            ›
          </button>
        </div>
      </div>
      <p className="ad-help flex items-center gap-2">
        <Info size={15} />
        Booking and payment statuses come from the database. Monitoring does not
        change Tutor or Learner schedules.
      </p>
      {dates && (
        <Modal title="Booking Date Range" onClose={() => setDates(false)}>
          <div className="space-y-3 text-xs">
            <label className="block">
              From
              <input
                className={input}
                aria-label="Booking start date"
                type="date"
                value={start}
                onChange={(e) => change(setStart, e.target.value)}
              />
            </label>
            <label className="block">
              To
              <input
                className={input}
                aria-label="Booking end date"
                type="date"
                value={end}
                onChange={(e) => change(setEnd, e.target.value)}
              />
            </label>
            {invalid && (
              <p className="text-red-600">
                End date must be on or after start date.
              </p>
            )}
            <button
              className={primary}
              disabled={!!invalid}
              onClick={() => setDates(false)}
            >
              Apply date range
            </button>
          </div>
        </Modal>
      )}
      {selected && (
        <BookingDetails
          record={rows.find((r) => r.id === selected.id) || selected}
          tutor={selected.tutor}
          incidents={incidents}
          onIncident={setIncident}
          onClose={() => setSelected(null)}
        />
      )}
      {incident && (
        <IncidentDetails
          record={incidents.find((r) => r.id === incident.id) || incident}
          onClose={() => setIncident(null)}
          onSave={async (updated) => {
            if (!(await saveRecord("incident_reports", updated))) return false;
            return true;
          }}
        />
      )}
    </section>
  );
}
