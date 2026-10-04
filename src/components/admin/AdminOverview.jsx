import BookingDetails from "./BookingDetails.jsx";
import { useState } from "react";
import ApplicationReview from "./ApplicationReview.jsx";
import {
  Users,
  GraduationCap,
  FileText,
  Settings,
  CalendarDays,
  PhilippinePeso,
} from "lucide-react";
import { Modal, button, Avatar } from "../tutor/workspace/ui.jsx";
import { seed, money } from "../tutor/workspace/data.js";
import { summarizeEarnings } from "../tutor/workspace/earnings.js";
import IncidentDetails from "./IncidentDetails.jsx";
import { loadIncidents, saveIncidents } from "./incidentData.js";
import { dateLabel } from "./adminData.js";
export default function AdminOverview({
  users,
  applications,
  onUpdateApplications,
  services,
  config,
  go,
}) {
  const [detail, setDetail] = useState(null);
  const [incidents, setIncidents] = useState(loadIncidents);
  const [workspace] = useState(() => {
    try {
      const d = JSON.parse(
        localStorage.getItem("campustutor:tutor-workspace:v2"),
      );
      if (Array.isArray(d?.sessions) && d.profile) return d;
    } catch {}
    return seed;
  });
  const bookings = [...workspace.sessions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const pending = applications
    .filter((r) =>
      ["Pending", "Under Review", "Resubmission Required"].includes(r.status),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const totals = summarizeEarnings(bookings);
  const badge = (v) => (
    <span
      className={`au-status ${["Paid", "Completed", "Approved", "Resolved"].includes(v) ? "active" : ["Cancelled", "Rejected", "Failed"].includes(v) ? "suspended" : "restricted"}`}
    >
      {v}
    </span>
  );
  function bookingTable(items) {
    return (
      <div className="ao-table">
        <table>
          <thead>
            <tr>
              {[
                "Booking ID",
                "Learner",
                "Tutor",
                "Service",
                "Date",
                "Booking Status",
                "Payment Status",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    onClick={() => setDetail({ kind: "booking", record: r })}
                  >
                    {r.booking || r.id}
                  </button>
                </td>
                <td>
                  <div className="au-person">
                    <Avatar name={r.learner} />
                    {r.learner}
                  </div>
                </td>
                <td>
                  <div className="au-person">
                    <Avatar name={workspace.profile.name} />
                    {workspace.profile.name}
                  </div>
                </td>
                <td>{r.service}</td>
                <td>{dateLabel(r.date)}</td>
                <td>{badge(r.status)}</td>
                <td>{badge(r.payment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="p-5">No bookings available.</p>}
      </div>
    );
  }
  return (
    <section className="ad-page ao-overview">
      <div className="osas-heading">
        <div>
          <h1>Admin Overview</h1>
          <p>Monitor CampusTutor platform operations and recent activity.</p>
        </div>
      </div>
      <div className="ao-metrics">
        {[
          [
            Users,
            users.length,
            "Total Users",
            "All user accounts",
            "User Management",
          ],
          [
            GraduationCap,
            users.filter((u) => u.tutor && u.status === "Active").length,
            "Active Tutors",
            "Currently active",
            "Tutor Verification",
          ],
          [
            FileText,
            pending.length,
            "Pending Tutor Applications",
            "Awaiting review",
            "Tutor Verification",
          ],
          [
            Settings,
            services.filter((s) => s.status === "Active").length,
            "Active Services",
            "Published services",
            "Service Management",
          ],
          [
            CalendarDays,
            bookings.length,
            "Total Bookings",
            "Available demo bookings",
            null,
          ],
          [
            PhilippinePeso,
            money(totals.gross),
            "Gross Session Payments",
            "Completed and paid sessions",
            null,
          ],
        ].map(([Icon, value, label, hint, view], i) => (
          <button
            key={label}
            onClick={() =>
              view
                ? go(view)
                : setDetail({ kind: i === 4 ? "bookings" : "financial" })
            }
          >
            <span
              style={{
                background: [
                  "#006038",
                  "#ffb800",
                  "#ed1739",
                  "#006439",
                  "#0878ff",
                  "#783ac2",
                ][i],
              }}
            >
              <Icon size={25} />
            </span>
            <div>
              <b>{value}</b>
              <strong>{label}</strong>
              <small>{hint}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="ao-middle">
        <section className="ad-panel">
          <div className="ao-title">
            <h2>Pending Tutor Applications</h2>
            <button onClick={() => go("Tutor Verification")}>View All</button>
          </div>
          <div className="ao-table ao-applications">
            <table>
              <thead>
                <tr>
                  {[
                    "Applicant",
                    "Student ID",
                    "College / Program",
                    "Submitted Date",
                    "Document Review",
                    "Application Status",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 3).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="au-person text-left"
                        onClick={() =>
                          setDetail({ kind: "application", record: r })
                        }
                      >
                        <Avatar name={r.name} />
                        {r.name}
                      </button>
                    </td>
                    <td>{r.studentId}</td>
                    <td>
                      {r.college} / {r.program}
                    </td>
                    <td>{dateLabel(r.date)}</td>
                    <td>
                      <span>Manual review required</span>
                    </td>
                    <td>{badge(r.referral === "Referred to OSAS" ? r.referral : r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!pending.length && (
              <p className="p-5">No pending tutor applications.</p>
            )}
          </div>
        </section>
        <section className="ad-panel">
          <div className="ao-title">
            <h2>Recent Incident Reports</h2>
            <button onClick={() => go("Incident Reports")}>
              View All
            </button>
          </div>
          <div className="ao-table ao-incidents">
            <table>
              <thead>
                <tr>
                  {[
                    "Incident ID",
                    "Related Booking",
                    "Issue Type",
                    "Status",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 3).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        onClick={() =>
                          setDetail({ kind: "incident", record: r })
                        }
                      >
                        {r.id}
                      </button>
                    </td>
                    <td>{r.booking || "—"}</td>
                    <td>{r.issue}</td>
                    <td>{badge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section className="ad-panel">
        <div className="ao-title">
          <h2>Recent Bookings</h2>
          <button onClick={() => setDetail({ kind: "bookings" })}>
            View All
          </button>
        </div>
        {bookingTable(bookings.slice(0, 4))}
      </section>
      <p className="ad-help">
        Local demo sources: user accounts, applications, moderated services,
        tutor-workspace bookings, and incident references. Totals reflect these
        records, not live platform activity.
      </p>
      {detail?.kind === "application" && (
        <ApplicationReview
          application={applications.find(r => r.id === detail.record.id) || detail.record}
          account={users.find(u => u.id === detail.record.studentId || u.name === detail.record.name)}
          config={config}
          onSave={updated => onUpdateApplications(applications.map(r => r.id === updated.id ? updated : r))}
          onClose={() => setDetail(null)}
        />
      )}
      {detail?.kind === "incident" && <IncidentDetails record={incidents.find(r => r.id === detail.record.id) || detail.record} onClose={() => setDetail(null)} onSave={updated => { const next = incidents.map(r => r.id === updated.id ? updated : r); if (!saveIncidents(next)) return false; setIncidents(next); return true; }} />}
      {detail?.kind === "booking" && <BookingDetails record={detail.record} tutor={workspace.profile.name} incidents={incidents} onClose={() => setDetail(null)} onIncident={record => setDetail({kind:"incident",record})} />}
      {detail && !["application", "incident", "booking"].includes(detail.kind) && (
        <Modal
          title={
            {
              bookings: "All Bookings",
              booking: "Booking Details",
              financial: "Gross Session Payments",
              incidents: "Incident Reports",
              incident: "Incident Details",
              application: "Application Summary",
            }[detail.kind]
          }
          onClose={() => setDetail(null)}
        >
          <div className="space-y-3 text-xs">
            {detail.kind === "bookings" ? (
              bookingTable(bookings)
            ) : detail.kind === "financial" ? (
              <>
                <p>Eligible completed and paid sessions: {totals.count}</p>
                {[
                  ["Gross", totals.gross],
                  ["Tutor share (90%)", totals.tutor],
                  ["OSAS share (5%)", totals.osas],
                  ["Platform share (5%)", totals.platform],
                ].map(([label, value]) => (
                  <p key={label}>
                    {label}: <b>{money(value)}</b>
                  </p>
                ))}
                <p>
                  These totals use the same tutor-workspace records as Admin
                  Reports.
                </p>
                <button
                  className={button}
                  onClick={() => go("Reports & Analytics")}
                >
                  View Financial Analytics
                </button>
              </>
            ) : detail.kind === "incidents" ? (
              incidents.map((r) => (
                <button
                  className="w-full rounded border p-3 text-left"
                  key={r.id}
                  onClick={() => setDetail({ kind: "incident", record: r })}
                >
                  {r.id} · {r.type} · {r.status}
                </button>
              ))
            ) : detail.kind === "incident" ? (
              <>
                <p>
                  <b>{detail.record.id}</b> ·{" "}
                  {detail.record.booking || "No related booking"}
                </p>
                <p>Reporter: {detail.record.reporter}</p>
                <p>Reported student: {detail.record.student}</p>
                <p>
                  {detail.record.type} · {detail.record.status}
                </p>
                <p>Referral: {detail.record.referral}</p>
                <p className="ad-help">
                  Fictional incident reference. A report is not a finding of
                  misconduct. Official evidence and assessment workflows are not
                  connected.
                </p>
              </>
            ) : detail.kind === "application" ? (
              <>
                <p>
                  <b>{detail.record.name}</b> · {detail.record.studentId}
                </p>
                <p>
                  {detail.record.id} · {detail.record.college} /{" "}
                  {detail.record.program}
                </p>
                <p>
                  {detail.record.status} · {detail.record.documents}
                </p>
                <p>
                  Original documents are not attached. Manual review is required.
                </p>
                <button
                  className={button}
                  onClick={() => go("Tutor Verification")}
                >
                  Open Tutor Verification
                </button>
              </>
            ) : (
              <>
                <p>
                  <b>{detail.record.booking || detail.record.id}</b>
                </p>
                <p>
                  {detail.record.learner} · {detail.record.service}
                </p>
                <p>Tutor: {workspace.profile.name}</p>
                <p>
                  {dateLabel(detail.record.date)} · {detail.record.start}–
                  {detail.record.end} (Asia/Manila)
                </p>
                <p>
                  {detail.record.status} · {detail.record.payment} ·{" "}
                  {money(detail.record.amount)}
                </p>
                <p>
                  Read-only booking reference from the local tutor workspace.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
