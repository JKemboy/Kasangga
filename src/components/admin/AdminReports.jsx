import UserExport from "./UserExport.jsx";
import {reportRows,reportCsv,reportHtml} from "./reportExport.js";
import { useState } from "react";
import { ChartNoAxesCombined, Download } from "lucide-react";
import {
  button,
  primary,
  input,
  Modal,
} from "../tutor/workspace/ui.jsx";
import { seed, money } from "../tutor/workspace/data.js";
import { summarizeEarnings } from "../tutor/workspace/earnings.js";
import { downloadData } from "./adminData.js";
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
          Peak: {max.toLocaleString()}
        </text>
      </svg>
    </section>
  );
}
export default function AdminReports({ users, services, go }) {
  const [notice,setNotice]=useState("");
  const [start, setStart] = useState("2026-01-01"),
    [end, setEnd] = useState("2026-09-30"),
    [college, setCollege] = useState(""),
    [subject, setSubject] = useState(""),
    [status, setStatus] = useState(""),
    [detail, setDetail] = useState(null);
  const [sessions] = useState(() => {
    try {
      const d = JSON.parse(
        localStorage.getItem("campustutor:tutor-workspace:v2"),
      );
      if (Array.isArray(d?.sessions)) return d.sessions;
    } catch {}
    return seed.sessions;
  });
  const invalid = start && end && start > end,
    inPeriod = (d) => (!start || d >= start) && (!end || d <= end) && !invalid;
  const accounts = invalid
    ? []
    : users.filter(
        (u) =>
          (!college || u.college === college) && (!end || u.registered <= end),
      );
  const offerings = services.filter(
    (s) => inPeriod(s.date) && (!subject || s.subject === subject),
  );
  const bookings = sessions.filter(
    (s) => inPeriod(s.date) && (!status || s.status === status),
  );
  const financial = summarizeEarnings(bookings);
  const anchor = new Date((end || "2026-09-30") + "T12:00:00");
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - 5 + i, 1);
    return {
      prefix: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    };
  });
  const labels = months.map((m) => m.label),
    counts = months.map(
      (m) => bookings.filter((s) => s.date.startsWith(m.prefix)).length,
    );
  const distribution = [...new Set(bookings.map((s) => s.status))].map(
    (label) => ({
      label,
      count: bookings.filter((s) => s.status === label).length,
    }),
  );
  const popular = [...new Set(offerings.map((s) => s.subject))].map(
    (label) => ({
      label,
      count: offerings.filter((s) => s.subject === label).length,
    }),
  );
  return (
    <div className="ad-page ad-reports">
      <div className="osas-heading">
        <div>
          <h1>
            Reports &amp; Analytics <ChartNoAxesCombined size={22} />
          </h1>
          <p>
            Monitor CampusTutor usage, services, bookings, and transaction
            trends.
          </p>
        </div>
        <UserExport label="Export Report" disabled={!!invalid} rows={reportRows({filters:{start,end,college,subject,status},accounts,offerings,bookings,financial,distribution,popular,months,counts})} renderSummary={reportHtml} onNotice={setNotice} onCsv={()=>{const rows=reportRows({filters:{start,end,college,subject,status},accounts,offerings,bookings,financial,distribution,popular,months,counts});const url=URL.createObjectURL(new Blob(['\uFEFF'+reportCsv(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='admin-report.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Exported the filtered report as CSV.');}} />
      </div>
      {notice&&<p role="status" className="text-xs text-green-800">{notice}</p>}
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
            {[...new Set(services.map((s) => s.subject))].map((v) => (
              <option key={v}>{v}</option>
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
          [money(financial.platform), "Platform Revenue (5%)", null],
        ].map(([value, label, view]) => (
          <button
            key={label}
            onClick={() => (view ? go(view) : setDetail(label))}
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
          title="Active Tutor Accounts (registration cohort)"
          labels={labels}
          values={months.map(
            (m) =>
              accounts.filter(
                (u) =>
                  u.tutor &&
                  u.status === "Active" &&
                  u.registered.slice(0, 7) <= m.prefix,
              ).length,
          )}
        />
        <Chart title="Booking Trends" labels={labels} values={counts} />
        <section className="ad-panel">
          <h2>Subjects / Services</h2>
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
          title="Transaction Trends (completed paid)"
          labels={labels}
          values={months.map(
            (m) =>
              summarizeEarnings(
                bookings.filter((s) => s.date.startsWith(m.prefix)),
              ).gross,
          )}
        />
      </div>
      <section className="ad-panel">
        <h2>Financial Analytics — GCash via PayMongo</h2>
        <div className="ad-finance">
          {[
            ["Gross Session Payments", financial.gross],
            ["Tutor Share (90%)", financial.tutor],
            ["OSAS Share (5%)", financial.osas],
            ["Platform Revenue (5%)", financial.platform],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <b>{money(value)}</b>
            </div>
          ))}
        </div>
      </section>
      <p className="ad-help">
        Local demo sources. College filters users; subject filters services;
        booking status filters bookings and payments. Date range filters
        services and bookings; user totals are cumulative through the end date.
        No historical tutor activity is inferred.
      </p>
      {detail && (
        <Modal title={detail} onClose={() => setDetail(null)}>
          <div className="space-y-2 text-xs">
            {bookings.length ? (
              bookings.map((s) => (
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
