import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import { useState } from "react";
import {
  ChartNoAxesCombined,
  BriefcaseBusiness,
  FileText,
  ShieldCheck,
  Clock,
  CheckCircle,
  Users,
  Database,
  LockKeyhole,
  Download,
} from "lucide-react";
import { money } from "../tutor/workspace/data.js";
import { summarizeEarnings } from "../tutor/workspace/earnings.js";
import { Modal, button, input } from "../tutor/workspace/ui.jsx";

const colors = ["#16a34a", "#ffbe19", "#ab57f6", "#62a0ff", "#2dc8bc"];
function Donut({ title, items, onSelect }) {
  const total = items.reduce((n, r) => n + r.count, 0);
  let offset = 0;
  const gradient = items
    .map((r, i) => {
      const start = offset;
      offset += total ? (r.count / total) * 100 : 0;
      return `${colors[i % colors.length]} ${start}% ${offset}%`;
    })
    .join(",");
  return (
    <section className="or-chart">
      <h2>{title}</h2>
      <div className="or-donut-content">
        <div
          className="or-donut"
          role="img"
          aria-label={`${title}: ${items.map((r) => `${r.label} ${r.count}`).join(", ")}`}
          style={{
            background: total ? `conic-gradient(${gradient})` : "#edf0f5",
          }}
        >
          <span>
            <b>{total}</b>
            <small>Total</small>
          </span>
        </div>
        <div className="or-legend">
          {items.map((r, i) => (
            <button type="button" key={r.label} onClick={() => onSelect(r)}>
              <i style={{ background: colors[i % colors.length] }} />
              <span>{r.label}</span>
              <b>
                {r.count} ({total ? ((r.count / total) * 100).toFixed(1) : "0"}
                %)
              </b>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
const group = (records, key) =>
  [...new Set(records.map((r) => r[key] || "Not recorded"))].map((label) => ({
    label,
    count: records.filter((r) => (r[key] || "Not recorded") === label).length,
    records: records.filter((r) => (r[key] || "Not recorded") === label),
  }));

export default function OsasReports({ rows, settings }) {
  const database = useOsasDatabase();
  const sessions = database.records?.sessions || [];
  const [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [academic, setAcademic] = useState(""),
    [semester, setSemester] = useState(""),
    [caseStatus, setCaseStatus] = useState(""),
    [incident, setIncident] = useState(""),
    [detail, setDetail] = useState(null);

  const invalid = start && end && start > end;
  const inPeriod = (date) =>
    date && (!start || date >= start) && (!end || date <= end);
  const termMatches = true;
  const clearance =
    invalid || !termMatches
      ? []
      : rows.filter(
          (r) =>
            inPeriod(r.requested) &&
            (!academic || r.academicYear === academic) &&
            (!semester || r.semester === semester) &&
            (!caseStatus || r.caseStatus === caseStatus) &&
            (!incident || r.caseId !== "None"),
        );
  const cases = (database.records?.cases || [])
    .filter(
      (r) =>
        inPeriod(r.date) &&
        (!caseStatus || r.status === caseStatus) &&
        (!incident || r.type === incident),
    )
    .map((r) => ({ ...r, caseStatus: r.status }));
  const resolved = cases.filter((r) => r.caseStatus.startsWith("Resolved"));
  const open = cases.filter((r) => !r.caseStatus.startsWith("Resolved"));
  const reviewed = clearance.filter((r) => r.reviewed);
  const statuses = [
    "Pending Review",
    "Cleared",
    "On Hold",
    "Requires Resolution",
  ].map((label) => ({
    label,
    count: clearance.filter((r) => r.status === label).length,
    records: clearance.filter((r) => r.status === label),
  }));
  const totals = summarizeEarnings(
    invalid || !termMatches ? [] : sessions.filter((s) => inPeriod(s.date)),
  );
  const endDate = new Date(
    (end || new Date().toISOString().slice(0, 10)) + "T12:00:00",
  );
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - 5 + i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const records = cases.filter((r) => r.requested.startsWith(prefix));
    return {
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      count: records.length,
      records,
    };
  });
  function show(label, records) {
    setDetail({ label, records });
  }
  function exportReport() {
    const data = {
      period: {
        start,
        end,
        academic,
        semester,
        caseStatus: caseStatus || "All",
        incident: incident || "All",
      },
      source:
        "Database cases, clearance reviews and recorded financial allocations.",
      referredCases: cases.length,
      openCases: open.length,
      resolvedCases: resolved.length,
      clearanceReviews: reviewed.length,
      clearance: statuses.map(({ label, count }) => ({ label, count })),
      financial: {
        ...totals,
        scope:
          "Eligible completed paid sessions; date and academic filters only",
      },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "osas-analytics.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="or-reports">
      <div className="osas-heading">
        <div>
          <h1>
            Reports &amp; Analytics{" "}
            <ChartNoAxesCombined size={22} className="text-green-800" />
          </h1>
          <p>
            Review institutional trends and accountability information derived
            from CampusTutor records.
          </p>
        </div>
        <button
          className={button + " flex items-center gap-2"}
          onClick={exportReport}
        >
          <Download size={14} />
          Export report
        </button>
      </div>
      <div className="or-filters">
        <label>
          From
          <input
            className={input}
            aria-label="Report start date"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            className={input}
            aria-label="Report end date"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label>
          Academic Year
          <select
            className={input}
            aria-label="Report academic year"
            value={academic}
            onChange={(e) => setAcademic(e.target.value)}
          >
            <option value="">All academic years</option>
            {[...new Set(rows.map((r) => r.academicYear))].map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <label>
          Semester
          <select
            className={input}
            aria-label="Report semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="">All semesters</option>
            {[...new Set(rows.map((r) => r.semester))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Incident Type
          <select
            className={input}
            aria-label="Incident type"
            value={incident}
            onChange={(e) => setIncident(e.target.value)}
          >
            <option value="">All</option>
            {[
              ...new Set((database.records?.cases || []).map((r) => r.type)),
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Case Status
          <select
            className={input}
            aria-label="Report case status"
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value)}
          >
            <option value="">All</option>
            {[...new Set(rows.map((r) => r.caseStatus))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button
          className={button}
          onClick={() => {
            setStart("");
            setEnd("");
            setAcademic("");
            setSemester("");
            setCaseStatus("");
            setIncident("");
          }}
        >
          Reset
        </button>
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-red-600">
          The end date must be on or after the start date.
        </p>
      )}
      <div className="or-metrics">
        {[
          [BriefcaseBusiness, cases.length, "Formal Cases", cases],
          [FileText, open.length, "Open Cases", open],
          [ShieldCheck, resolved.length, "Resolved Cases", resolved],
          [Clock, "—", "Average Resolution Time", null],
          [CheckCircle, reviewed.length, "Clearance Reviews", reviewed],
          [
            Users,
            `${statuses[2].count} / ${statuses[3].count}`,
            "Clearance Holds / Resolutions",
            clearance.filter((r) =>
              ["On Hold", "Requires Resolution"].includes(r.status),
            ),
          ],
        ].map(([Icon, value, label, records], i) => (
          <button key={label} onClick={() => show(label, records)}>
            <span
              style={{
                background: ["#00663a", "#ffb900", "#0875ff", "#8729e7"][i % 4],
              }}
            >
              <Icon size={22} />
            </span>
            <div>
              <b>{value}</b>
              <strong>{label}</strong>
              <small>
                {records ? "In selected period" : "No resolution timestamps"}
              </small>
            </div>
          </button>
        ))}
      </div>
      <div className="or-top-charts">
        <Donut
          title="Case Status Distribution"
          items={group(cases, "caseStatus")}
          onSelect={(r) => show(r.label, r.records)}
        />
        <section className="or-chart">
          <h2>Incident Types</h2>
          {group(cases, "type").map((item) => (
            <button
              key={item.label}
              className="or-bar-row"
              onClick={() => show(item.label, item.records)}
            >
              <span>{item.label}</span>
              <i>
                <b
                  style={{
                    width: `${cases.length ? (item.count / cases.length) * 100 : 0}%`,
                  }}
                />
              </i>
              <strong>{item.count}</strong>
            </button>
          ))}
        </section>
        <Donut
          title="Cases by Priority"
          items={group(cases, "priority")}
          onSelect={(r) => show(r.label, r.records)}
        />
      </div>
      <div className="or-bottom-charts">
        <section className="or-chart">
          <h2>Monthly Case Trends</h2>
          <div className="or-trend" aria-label="Monthly case counts">
            {months.map((m) => (
              <button
                key={m.label}
                onClick={() => show(m.label, m.records)}
                aria-label={`${m.label}: ${m.count} cases`}
              >
                <b>{m.count}</b>
                <i
                  style={{
                    height: `${Math.max(2, (m.count / Math.max(1, ...months.map((v) => v.count))) * 76)}px`,
                  }}
                />
                <small>{m.label}</small>
              </button>
            ))}
          </div>
          <p className="or-explanation">
            Counts use clearance request dates within the selected period.
          </p>
        </section>
        <Donut
          title="Clearance Status Distribution"
          items={statuses}
          onSelect={(r) => show(r.label, r.records)}
        />
      </div>
      <section className="or-financial">
        <div className="or-financial-heading">
          <Database size={24} />
          <div>
            <h2>OSAS Financial Allocation</h2>
            <p>
              Read-only figures for eligible completed paid tutoring sessions.
            </p>
          </div>
          <span>
            <LockKeyhole size={15} />
            Reporting only · Fixed allocation percentages
          </span>
        </div>
        <div className="or-financial-grid">
          {[
            [
              "Gross Eligible Session Payments",
              money(totals.gross),
              "For selected period",
            ],
            ["Tutor Share", "90%", money(totals.tutor)],
            ["OSAS Share", "5%", money(totals.osas)],
            ["Platform Share", "5%", money(totals.platform)],
            [
              "Total OSAS Allocation",
              money(totals.osas),
              `${totals.count} eligible sessions`,
            ],
            ["Payment Method", "GCash via PayMongo", "Demo payment records"],
          ].map(([label, value, hint]) => (
            <div key={label}>
              <small>{label}</small>
              <b>{value}</b>
              <span>{hint}</span>
            </div>
          ))}
        </div>
        <p className="or-equation">
          {money(totals.gross)} = {money(totals.tutor)} Tutor +{" "}
          {money(totals.osas)} OSAS + {money(totals.platform)} Platform
        </p>
      </section>
      {settings.tips && (
        <p className="or-explanation">
          Database records. Date and case filters apply to case counts; academic
          filters apply to clearance reviews. Financial totals use stored
          allocations and session dates. Missing incident types, priorities, and
          resolution timestamps are not estimated.
        </p>
      )}
      {detail && (
        <Modal title={detail.label} onClose={() => setDetail(null)}>
          <div className="space-y-2 text-xs">
            {detail.records === null ? (
              <p>
                Resolution time cannot be calculated without case opening and
                resolution timestamps.
              </p>
            ) : detail.records.length ? (
              detail.records.map((r) => (
                <div key={r.id} className="rounded border p-3">
                  <b>{r.name}</b> · {r.id}
                  <p>
                    {r.caseId} · {r.caseStatus}
                  </p>
                  <p>Clearance: {r.status}</p>
                </div>
              ))
            ) : (
              <p>No matching records in the selected period.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
