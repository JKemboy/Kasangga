// Reports & Analytics: derives report summaries from the LCO snapshot and exports the currently selected report data.
import {
  buildLcoReport,
  summarizePayments,
} from "../../services/lcoRecords.js";
import { useLcoDatabase } from "./LcoDatabaseContext.jsx";
import UserExport from "./UserExport.jsx";
import { reportRows, reportCsv, reportHtml } from "./reportExport.js";
import { useState } from "react";
import { ChartNoAxesCombined, Download } from "lucide-react";
import { button, primary, input, Modal } from "../tutor/workspace/ui.jsx";
import { money } from "../tutor/workspace/data.js";
import { summarizeEarnings } from "../tutor/workspace/earnings.js";
import { downloadData } from "./lcoData.js";
function Chart({ title, values, labels, color = "#00723d" }) {
  const max = Math.max(1, ...values);
  const points = values
    .map(
      (v, i) =>
        `${20 + (i * 260) / Math.max(1, values.length - 1)},${100 - (v / max) * 78}`,
    )
    .join(" ");
  return (
    <section className="ad-panel">
      <h2>{title}</h2>
      <svg
        viewBox="0 0 300 125"
        role="img"
        aria-label={`${title}: ${values.map((v, i) => `${labels[i]} ${v}`).join(", ")}`}
      >
        <path
          d="M20 20H280 M20 60H280 M20 100H280"
          stroke="#e8edf4"
          fill="none"
        />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        {values.map((v, i) => (
          <g key={i}>
            <circle
              cx={20 + (i * 260) / Math.max(1, values.length - 1)}
              cy={100 - (v / max) * 78}
              r="3"
              fill={color}
            />
            <text
              x={20 + (i * 260) / Math.max(1, values.length - 1)}
              y="118"
              fontSize="7"
              textAnchor="middle"
            >
              {labels[i]}
            </text>
          </g>
        ))}
        <text x="20" y="10" fontSize="8">
          Peak: {Math.max(0, ...values).toLocaleString()}
        </text>
      </svg>
    </section>
  );
}
export default function LcoReports({ users, services, go }) {
  const [notice, setNotice] = useState("");
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [college, setCollege] = useState(""),
    [subject, setSubject] = useState(""),
    [status, setStatus] = useState(""),
    [detail, setDetail] = useState(null);
  const database = useLcoDatabase().database;
  const sessions = database?.sessions || [];
  const invalid = start && end && start > end;
  const {
    accounts,
    offerings,
    bookings,
    transactions,
    financial,
    months,
    counts,
    distribution,
    popular,
  } = buildLcoReport(database, { start, end, college, subject, status });
  const labels = months.map((m) => m.label);
  return (
    <div className="ad-page ad-reports">
      <div className="oswe-heading">
        <div>
          <h1>
            Reports &amp; Analytics <ChartNoAxesCombined size={22} />
          </h1>
          <p>
            Monitor Kasangga usage, services, bookings, and transaction
            trends.
          </p>
        </div>
        <UserExport
          label="Export Report"
          disabled={!!invalid}
          rows={reportRows({
            filters: { start, end, college, subject, status },
            accounts,
            offerings,
            bookings,
            financial,
            distribution,
            popular,
            months,
            counts,
          })}
          renderSummary={reportHtml}
          onNotice={setNotice}
          onCsv={() => {
            const rows = reportRows({
              filters: { start, end, college, subject, status },
              accounts,
              offerings,
              bookings,
              financial,
              distribution,
              popular,
              months,
              counts,
            });
            const url = URL.createObjectURL(
              new Blob(["\uFEFF" + reportCsv(rows)], {
                type: "text/csv;charset=utf-8",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "lco-report.csv";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice("Exported the filtered report as CSV.");
          }}
        />
      </div>
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      <div className="ad-report-filters">
        <label>
          From
          <input
            aria-label="Report from"
            className={input}
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            aria-label="Report to"
            className={input}
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label>
          College (users)
          <select
            className={input}
            aria-label="Report college"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
          >
            <option value="">All Colleges</option>
            {[...new Set(users.map((u) => u.college))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Service / Subject
          <select
            className={input}
            aria-label="Report subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Booking Status
          <select
            className={input}
            aria-label="Report booking status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {[...new Set(sessions.map((s) => s.status))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-red-600">
          End date must be on or after start date.
        </p>
      )}
      <div className="ad-report-metrics">
        {[
          [accounts.length, "Total Users", "User Management"],
          [
            accounts.filter((u) => u.tutor && u.status === "Active").length,
            "Active Tutors",
            "Tutor Verification",
          ],
          [
            offerings.filter((s) => s.status === "Active").length,
            "Active Services",
            "Service Management",
          ],
          [
            bookings.filter((s) => s.status === "Completed").length,
            "Completed Bookings",
            null,
          ],
          [money(financial.gross), "Gross Session Payments", null],
          [money(financial.platform), "Platform Revenue", null],
        ].map(([value, label, view]) => (
          <button
            key={label}
            aria-pressed={selectedMetric === label}
            onClick={() => {
              setSelectedMetric(label);
              if (view) go(view);
              else setDetail(label);
            }}
          >
            <b>{value}</b>
            <span>{label}</span>
            <small>View details →</small>
          </button>
        ))}
      </div>
      <div className="ad-charts">
        <Chart
          title="User Growth (cumulative)"
          labels={labels}
          values={months.map(
            (m) =>
              accounts.filter((u) => u.registered.slice(0, 7) <= m.prefix)
                .length,
          )}
        />
        <Chart
          title="Current active tutors by approval date"
          labels={labels}
          values={months.map(
            (m) =>
              accounts.filter(
                (u) =>
                  u.tutor &&
                  u.status === "Active" &&
                  (u.tutorSince || u.registered).slice(0, 7) <= m.prefix,
              ).length,
          )}
        />
        <Chart title="Booking Trends" labels={labels} values={counts} />
        <section className="ad-panel">
          <h2>Bookings by service</h2>
          {popular.length ? (
            popular.map((p) => (
              <div className="ad-bar" key={p.label}>
                <span>{p.label}</span>
                <i
                  style={{
                    width: `${(p.count / Math.max(...popular.map((v) => v.count))) * 45}%`,
                  }}
                />
                <b>{p.count}</b>
              </div>
            ))
          ) : (
            <p>No services in this period.</p>
          )}
        </section>
        <section className="ad-panel">
          <h2>Booking Status Distribution</h2>
          {distribution.map((d) => (
            <button
              type="button"
              className="ad-distribution"
              key={d.label}
              onClick={() => setStatus(d.label)}
            >
              <span>{d.label}</span>
              <b>
                {d.count} (
                {Math.round((d.count / Math.max(1, bookings.length)) * 100)}%)
              </b>
            </button>
          ))}
          <p className="ad-help">Total bookings: {bookings.length}</p>
          {status && (
            <button className={button} onClick={() => setStatus("")}>
              Show all statuses
            </button>
          )}
        </section>
        <Chart
          title="Paid transaction trends"
          labels={labels}
          values={months.map(
            (m) =>
              summarizePayments(
                transactions.filter((s) => s.date.startsWith(m.prefix)),
              ).gross,
          )}
        />
      </div>
      <section className="ad-panel">
        {financial.estimated && (
          <p className="ad-help">
            Shares without a recorded allocation use the estimated 90/5/5 split.
          </p>
        )}
        <h2>Financial Analytics — GCash via PayMongo</h2>
        <div className="ad-finance">
          {[
            ["Gross Session Payments", financial.gross],
            ["Tutor Share", financial.tutor],
            ["OSWE Share", financial.osas],
            ["Platform Revenue", financial.platform],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <b>{money(value)}</b>
            </div>
          ))}
        </div>
      </section>
      <p className="ad-help">
        Database records. Service and college filters follow the linked
        Tutor/Learner accounts. Bookings use session dates; transactions use
        paid dates, or creation dates when unpaid. User totals are cumulative
        through the end date.
      </p>
      {detail && (
        <Modal title={detail} onClose={() => setDetail(null)}>
          <div className="space-y-2 text-xs">
            {(detail === "Completed Bookings"
              ? bookings.filter((b) => b.status === "Completed")
              : transactions
            ).length ? (
              (detail === "Completed Bookings"
                ? bookings.filter((b) => b.status === "Completed")
                : transactions
              ).map((s) => (
                <p className="rounded border p-2" key={s.id}>
                  {s.learner} · {s.service} · {s.date} · {s.status} ·{" "}
                  {s.payment} · {money(s.amount)}
                </p>
              ))
            ) : (
              <p>No matching bookings.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
