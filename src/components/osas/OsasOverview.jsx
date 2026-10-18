import { statusClass } from "../shared/statusColors.js";
import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import OverviewMonth from "./OverviewMonth.jsx";
import CaseShortcut from "./CaseShortcut.jsx";
import ServiceMenu from "../admin/ServiceMenu.jsx";
import { Eye, PenLine } from "lucide-react";
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
export default function OsasOverview({
  rows,
  settings,
  onCase,
  onClearance,
  onReports,
}) {
  const database = useOsasDatabase();
  const caseRows = database.records?.cases || [];
  const [month, setMonth] = useState(""),
    [detail, setDetail] = useState(null);

  const [shortcut, setShortcut] = useState(null);
  const openCase = (record, view = "case") =>
    setShortcut({
      caseId: record.caseId,
      view,
      evidenceId: view === "evidence" ? record.id : undefined,
    });
  const saveCase = database.saveCase;
  const records = rows.filter((r) => !month || r.requested.startsWith(month));
  const cases = caseRows
    .filter(
      (r) =>
        !r.archived &&
        r.status !== "Resolved" &&
        (!month || r.date.startsWith(month)),
    )
    .map((r) => ({
      ...r,
      name: r.student,
      caseStatus: r.status,
      requested: r.date,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const open = cases.filter((r) => !r.caseStatus.startsWith("Resolved"));
  const evidence = (database.records?.evidence || [])
    .filter(
      (e) =>
        cases.some((c) => c.caseId === e.caseId) && e.status !== "Validated",
    )
    .map((e) => ({ ...e, name: e.evidenceType, caseStatus: e.status }));
  const review = cases.filter((r) => r.caseStatus === "Under Review");
  const clearance = records.filter((r) => r.status === "Pending Review");
  const resolved = cases.filter((r) => r.caseStatus.startsWith("Resolved"));
  const followup = cases.filter(
    (r) =>
      ["Awaiting Evidence", "Pending Decision"].includes(r.status) ||
      (r.evidenceRequest && r.status !== "Resolved"),
  );
  const groups = [
    "Open",
    "Under Review",
    "Awaiting Evidence",
    "Pending Decision",
    "Resolved",
  ].map((label) => ({
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
    setDetail({
      title,
      items,
      clearanceAction,
      view:
        items === evidence ? "evidence" : items === followup ? "note" : "case",
    });
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
        <OverviewMonth
          value={month}
          onChange={setMonth}
          onReports={onReports}
        />
      </div>
      <div className="op-metrics">
        {[
          [FileText, open, "Open Cases", "Requires attention", "#ffb800"],
          [
            SearchCheck,
            evidence,
            "Pending Evidence Review",
            "Evidence items requiring validation",
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
                    "Date Opened",
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
                  <tr
                    key={r.id}
                    className="oo-case-row"
                    tabIndex={0}
                    aria-label={`Open case ${r.caseId}`}
                    onClick={() => openCase(r)}
                    onKeyDown={(e) => {
                      if (
                        e.target === e.currentTarget &&
                        ["Enter", " "].includes(e.key)
                      ) {
                        e.preventDefault();
                        openCase(r);
                      }
                    }}
                  >
                    <td>{i + 1}</td>
                    <td>
                      <button onClick={() => openCase(r)}>{r.caseId}</button>
                    </td>
                    <td>
                      {r.name}
                      <small>{r.caseId}</small>
                    </td>
                    <td>{r.type}</td>
                    <td>
                      <span className={statusClass(r.priority, "oo-status")}>
                        {r.priority || "Not recorded"}
                      </span>
                    </td>
                    <td>{date(r.requested)}</td>
                    <td>{r.officer}</td>
                    <td>
                      <span className={statusClass(r.caseStatus, "oo-status")}>
                        {r.caseStatus}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ServiceMenu
                        service={{ title: r.caseId }}
                        options={[
                          [Eye, "View case", "case"],
                          [ShieldCheck, "Review evidence", "evidence"],
                          [PenLine, "Add case action / note", "note"],
                          [Info, "View incident report", "incident"],
                        ]}
                        onSelect={(view) => openCase(r, view)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!cases.length && (
              <p className="p-8 text-center text-xs text-slate-500">
                No formal cases for the selected period. Review pending
                referrals above.
              </p>
            )}
          </div>
        </section>
        <div className="oo-side">
          <section className="oo-card">
            <h2>Pending Actions</h2>
            {[
              [
                FileText,
                evidence,
                "Evidence items requiring validation",
                "#ffb800",
              ],
              [ShieldCheck, review, "Cases awaiting review", "#7622df"],
              [
                Scale,
                clearance,
                "Clearance reviews requiring action",
                "#006536",
              ],
              [
                ClipboardList,
                followup,
                "Cases requiring documentation / follow-up",
                "#0878ff",
              ],
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
              <button
                type="button"
                onClick={() => show("All Cases", cases)}
                className="oo-donut"
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
              </button>
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
            review and records a final institutional decision. Case totals
            reflect database case records; clearance totals reflect clearance
            requests.
          </p>
        </div>
      )}
      {shortcut && (
        <CaseShortcut
          key={shortcut.caseId + shortcut.view}
          record={caseRows.find((r) => r.caseId === shortcut.caseId)}
          initialView={shortcut.view}
          initialEvidenceId={shortcut.evidenceId}
          onClose={() => setShortcut(null)}
          onSave={saveCase}
        />
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
                    detail.clearanceAction
                      ? onClearance(r)
                      : openCase(r, detail.view);
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
