// LCO Overview: summarizes users, applications, services, and system activity from the LCO database snapshot.
import { statusClass } from "../shared/statusColors.js";
import { useLcoDatabase } from "./LcoDatabaseContext.jsx";
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
import { money } from "../tutor/workspace/data.js";
import { summarizePayments } from "../../services/lcoRecords.js";
import IncidentDetails from "./IncidentDetails.jsx";
import { dateLabel } from "./lcoData.js";
export default function LcoOverview({
  users,
  applications,
  onUpdateApplications,
  onDocument,
  services,
  config,
  go,
}) {
  const [detail, setDetail] = useState(null);
  const { database, saveRecord } = useLcoDatabase();
  const incidents = database?.incidents || [];
  const workspace = {
    sessions: database?.sessions || [],
    profile: { name: "" },
  };
  const bookings = [...workspace.sessions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const pending = applications
    .filter((r) =>
      ["Pending", "Under Review", "Resubmission Required"].includes(r.status),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const totals = summarizePayments(database?.payments || []);
  const badge = (v) => <span className={statusClass(v, "au-status")}>{v}</span>;
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
                    <Avatar name={r.tutor} />
                    {r.tutor}
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
      <div className="oswe-heading">
        <div>
          <h1>LCO Overview</h1>
          <p>Monitor Kasangga platform operations and recent activity.</p>
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
            "All database bookings",
            null,
          ],
          [
            PhilippinePeso,
            money(totals.gross),
            "Gross Session Payments",
            "Verified paid transactions",
            null,
          ],
        ].map(([Icon, value, label, hint, view], i) => (
          <button
            key={label}
            onClick={() => {
              view
                ? go(view)
                : setDetail({ kind: i === 4 ? "bookings" : "financial" });
            }}
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
                    <td>
                      {badge(
                        r.referral === "Referred to OSWE"
                          ? r.referral
                          : r.status,
                      )}
                    </td>
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
            <button onClick={() => go("Incident Reports")}>View All</button>
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
        Database totals reflect current user roles, applications, services,
        bookings, payments and incident reports.
      </p>
      {detail?.kind === "application" && (
        <ApplicationReview
          application={
            applications.find((r) => r.id === detail.record.id) || detail.record
          }
          account={users.find(
            (u) =>
              u.id === detail.record.studentId || u.name === detail.record.name,
          )}
          config={config}
          onSave={(updated, status) => onUpdateApplications(updated, status)}
          onDocument={onDocument}
          onClose={() => setDetail(null)}
        />
      )}
      {detail?.kind === "incident" && (
        <IncidentDetails
          record={
            incidents.find((r) => r.id === detail.record.id) || detail.record
          }
          onClose={() => setDetail(null)}
          onSave={async (updated) => {
            if (!(await saveRecord("incident_reports", updated))) return false;
            return true;
          }}
        />
      )}
      {detail?.kind === "booking" && (
        <BookingDetails
          record={detail.record}
          tutor={detail.record.tutor}
          incidents={incidents}
          onClose={() => setDetail(null)}
          onIncident={(record) => setDetail({ kind: "incident", record })}
        />
      )}
      {detail &&
        !["application", "incident", "booking"].includes(detail.kind) && (
          <Modal
            title={
              detail.kind === "bookings"
                ? "All Bookings"
                : "Gross Session Payments"
            }
            onClose={() => setDetail(null)}
          >
            {detail.kind === "bookings" ? (
              bookingTable(bookings)
            ) : (
              <div className="space-y-2 text-xs">
                <p>Eligible paid transactions: {totals.count}</p>
                {[
                  ["Gross", totals.gross],
                  ["Tutor share", totals.tutor],
                  ["OSWE share", totals.osas],
                  ["Platform share", totals.platform],
                ].map(([label, value]) => (
                  <p key={label}>
                    {label}: <b>{money(value)}</b>
                  </p>
                ))}
                <p>
                  {totals.estimated
                    ? "Some shares use the estimated 90/5/5 split."
                    : "Shares use recorded allocations."}
                </p>
                <button
                  className={button}
                  onClick={() => go("Payments & Transactions")}
                >
                  View Transactions
                </button>
              </div>
            )}
          </Modal>
        )}
    </section>
  );
}
