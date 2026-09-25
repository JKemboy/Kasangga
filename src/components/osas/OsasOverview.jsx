import { useState } from "react";
import {
  FileText,
  SearchCheck,
  ShieldCheck,
  Scale,
  CheckCircle,
  ArrowRight,
  MoreHorizontal,
  ClipboardList,
  Info,
} from "lucide-react";
import { Modal, button, input } from "../tutor/workspace/ui.jsx";

const colors = ["#ff6971", "#ffc629", "#1686ff", "#65d3a8", "#006039"];
export default function OsasOverview({ rows, settings, onCase, onClearance }) {
  const [month, setMonth] = useState("2026-09"),
    [detail, setDetail] = useState(null);
  const records = rows.filter((r) => !month || r.requested.startsWith(month));
  const cases = records
    .filter((r) => r.caseId !== "None")
    .sort((a, b) => b.requested.localeCompare(a.requested));
  const open = cases.filter((r) => !r.caseStatus.startsWith("Resolved"));
  const evidence = cases.filter((r) => r.caseStatus === "Awaiting Evidence");
  const review = cases.filter((r) => r.caseStatus === "Under Review");
  const clearance = records.filter((r) => r.status === "Pending Review");
  const resolved = cases.filter((r) => r.caseStatus.startsWith("Resolved"));
  const followup = cases.filter(
    (r) => r.status === "Requires Resolution" || r.status === "On Hold",
  );
  const groups = [...new Set(cases.map((r) => r.caseStatus))].map((label) => ({
    label,
    records: cases.filter((r) => r.caseStatus === label),
  }));
  let offset = 0;
  const gradient = groups
    .map((g, i) => {
      const start = offset;
      offset += (g.records.length / Math.max(1, cases.length)) * 100;
      return `${colors[i % colors.length]} ${start}% ${offset}%`;
    })
    .join(",");
  const date = (v) =>
    settings.dateFormat === "iso"
      ? v
      : new Date(v + "T12:00:00").toLocaleDateString("en-US", {
          month: settings.dateFormat === "short" ? "2-digit" : "short",
          day: "numeric",
          year: "numeric",
        });
  const show = (title, items, clearanceAction = false) =>
    setDetail({ title, items, clearanceAction });
  return (
    <section className="oo-overview">
      <div className="osas-heading">
        <div>
          <h1>OSAS Overview</h1>
          <p>
            Institutional overview of referred cases, evidence review, and
            student-clearance activity.
          </p>
        </div>
        <label className="op-month">
          Request month
          <input
            className={input}
            aria-label="Overview month"
            type="month"
            value={month}
            min="2024-01"
            max="2099-12"
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>
      <div className="op-metrics">
        {[
          [FileText, open, "Open Cases", "Requires attention", "#ffb800"],
          [
            SearchCheck,
            evidence,
            "Pending Evidence Review",
            "Cases awaiting evidence",
            "#0878ff",
          ],
          [
            ShieldCheck,
            review,
            "Cases Under Review",
            "Currently being evaluated",
            "#7622df",
          ],
          [
            Scale,
            clearance,
            "Clearance Reviews",
            "Pending OSAS action",
            "#006536",
          ],
          [
            CheckCircle,
            resolved,
            "Resolved Cases",
            "In selected request month",
            "#00502d",
          ],
        ].map(([Icon, items, title, hint, color]) => (
          <button
            key={title}
            onClick={() => show(title, items, title === "Clearance Reviews")}
          >
            <span style={{ background: color }}>
              <Icon size={25} />
            </span>
            <div>
              <b>{items.length}</b>
              <strong>{title}</strong>
              <small>{hint}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="oo-grid">
        <section className="oo-card oo-recent">
          <div className="oo-title">
            <h2>Recent Cases</h2>
            <button onClick={() => show("All Cases", cases)}>
              View all cases <ArrowRight size={14} />
            </button>
          </div>
          <div className="oo-table">
            <table>
              <thead>
                <tr>
                  {[
                    "#",
                    "Case ID",
                    "Student / Reported User",
                    "Incident Type",
                    "Priority",
                    "Request Date",
                    "Assigned OSAS Personnel",
                    "Case Status",
                    "Action",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.slice(0, 5).map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>
                      <button onClick={() => onCase(r)}>{r.caseId}</button>
                    </td>
                    <td>
                      {r.name}
                      <small>ID: {r.id}</small>
                    </td>
                    <td className="text-slate-400">Not recorded</td>
                    <td className="text-slate-400">—</td>
                    <td>{date(r.requested)}</td>
                    <td className="text-slate-400">Not assigned</td>
                    <td>
                      <span
                        className={`oo-status ${r.caseStatus.startsWith("Resolved") ? "resolved" : r.caseStatus === "Awaiting Evidence" ? "evidence" : "review"}`}
                      >
                        {r.caseStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className={button}
                        aria-label={`View case ${r.caseId}`}
                        onClick={() => onCase(r)}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!cases.length && (
              <p className="p-8 text-center text-xs text-slate-500">
                No case references for this month.
              </p>
            )}
          </div>
        </section>
        <div className="oo-side">
          <section className="oo-card">
            <h2>Pending Actions</h2>
            {[
              [FileText, evidence, "Cases awaiting evidence", "#ffb800"],
              [ShieldCheck, review, "Cases awaiting review", "#7622df"],
              [
                Scale,
                clearance,
                "Clearance reviews requiring action",
                "#006536",
              ],
              [ClipboardList, followup, "Cases requiring follow-up", "#0878ff"],
            ].map(([Icon, items, title, color]) => (
              <button
                className="oo-action"
                key={title}
                onClick={() =>
                  show(title, items, title.startsWith("Clearance"))
                }
              >
                <Icon size={23} style={{ color }} />
                <span>{title}</span>
                <b style={{ color }}>{items.length}</b>
              </button>
            ))}
          </section>
          <section className="oo-card">
            <h2>Case Status Overview</h2>
            <div className="oo-chart">
              <div
                className="oo-donut"
                role="img"
                aria-label={`${cases.length} total cases: ${groups.map((g) => `${g.label} ${g.records.length}`).join(", ")}`}
                style={{
                  background: cases.length
                    ? `conic-gradient(${gradient})`
                    : "#edf0f5",
                }}
              >
                <span>
                  <b>{cases.length}</b>
                  <small>Total Cases</small>
                </span>
              </div>
              <div className="oo-legend">
                {groups.map((g, i) => (
                  <button
                    key={g.label}
                    onClick={() => show(g.label, g.records)}
                  >
                    <i style={{ background: colors[i % colors.length] }} />
                    <span>{g.label}</span>
                    <b>{g.records.length}</b>
                  </button>
                ))}
                {!groups.length && <span>No case data</span>}
              </div>
            </div>
          </section>
        </div>
      </div>
      {settings.tips && (
        <div className="op-note">
          <Info size={17} />
          <p>
            Incident reports remain allegations until OSAS completes impartial
            review and records a final institutional decision. Demo totals use
            clearance case references; incident types, assigned personnel, and
            evidence-item counts are not connected.
          </p>
        </div>
      )}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <div className="space-y-2 text-xs">
            {detail.items.length ? (
              detail.items.map((r) => (
                <button
                  key={r.id}
                  className="flex w-full items-center justify-between gap-3 rounded border p-3 text-left hover:bg-green-50"
                  onClick={() => {
                    setDetail(null);
                    detail.clearanceAction ? onClearance(r) : onCase(r);
                  }}
                >
                  <span>
                    <b>{r.name}</b>
                    <span className="block text-slate-500">
                      {r.caseId} ·{" "}
                      {detail.clearanceAction ? r.status : r.caseStatus}
                    </span>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <p className="p-3 text-slate-500">
                No matching records for this month.
              </p>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
