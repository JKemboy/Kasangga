import AuditDetails, { auditSummary } from './AuditDetails.jsx';
import UserExport from './UserExport.jsx';
import { useState } from "react";
import {
  ClipboardList,
  Info,
  Search,
  Eye,
  CalendarDays,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
const examples = [];
function dateKey(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
function readLocal(users, apps, services, config) {
  const sources = [
    ["User Management", users],
    ["Tutor Verification", apps],
    ["Service Management", services],
  ];

  const logs = sources.flatMap(([module, records]) =>
    records.flatMap((r) =>
      (r.history || [])
        .filter((h) => Number.isFinite(Date.parse(h.at)))
        .map((h, i) => ({
          id: `LOCAL-${r.id}-${i + 1}`,
          actor: h.by || "Admin User",
          email: "Not recorded",
          action:
            module === "Incident Reports"
              ? h.action
              : `${module === "User Management" ? "User" : module === "Tutor Verification" ? "Application" : "Service"}: ${h.to}`,
          module,
          target: `${r.id} · ${r.name || r.title || r.issue || ""}`,
          at: h.at,
          result: "Success",
          ip: "Not collected",
          source: "Local history",
          notes: h.reason || h.notes || "",
          before: h.from || null,
          after: h.to || h.action || null,
        })),
    ),
  );
  (config.auditHistory || [])
    .filter((h) => Number.isFinite(Date.parse(h.at)))
    .forEach((h, i) =>
      logs.push({
        id: `LOCAL-SETTINGS-${i + 1}`,
        actor: h.by,
        action: "Settings Updated",
        module: "Settings",
        target: "Admin configuration",
        at: h.at,
        result: "Success",
        ip: "Not collected",
        email: "Not recorded",
        source: "Local history",
        notes: `Changed fields: ${h.fields.join(", ")}`,
      }),
    );
  return [...logs, ...examples].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
}
export default function AdminAudit({ users, applications, services, config }) {
  const [records] = useState(() =>
    readLocal(users, applications, services, config),
  );
  const [query, setQuery] = useState(""),
    [actor, setActor] = useState(""),
    [module, setModule] = useState(""),
    [action, setAction] = useState(""),
    [result, setResult] = useState(""),
    [source, setSource] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [dateOpen, setDateOpen] = useState(false),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  const invalid = start && end && start > end;
  const filtered = invalid
    ? []
    : records.filter(
        (r) =>
          (!actor || r.actor === actor) &&
          (!module || r.module === module) &&
          (!action || r.action === action) &&
          (!result || r.result === result) &&
          (!source || r.source === source) &&
          (!start || dateKey(r.at) >= start) &&
          (!end || dateKey(r.at) <= end) &&
          [r.id, r.actor, r.action, r.module, r.target]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      );
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 8, current * 8);
  const timestamp = (v) =>
    new Date(v).toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  function change(setter, value) {
    setter(value);
    setPage(1);
    setNotice("");
  }
  function select(label, value, setter, field) {
    return (
      <select
        className={input}
        aria-label={label}
        value={value}
        onChange={(e) => change(setter, e.target.value)}
      >
        <option value="">{label}</option>
        {[...new Set(records.map((r) => r[field]))].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    );
  }
  function exportCsv() {
    const fields = [
      "id",
      "actor",
      "email",
      "action",
      "module",
      "target",
      "at",
      "ip",
      "result",
      "source",
      "before",
      "after",
      "device",
      "notes",
    ];
    const safe = (v) =>
      '"' +
      String(/^[=+@\-\t\r]/.test(String(v)) ? `'${v}` : v).replaceAll(
        '"',
        '""',
      ) +
      '"';
    const csv = [fields, ...filtered.map((r) => fields.map((f) => r[f] ?? ""))]
      .map((r) => r.map(safe).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-audit-logs.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching records.`);
  }
  return (
    <section className="ad-page aa-audit">
      <div className="osas-heading">
        <div>
          <h1>
            Audit Logs <ClipboardList size={23} />
          </h1>
          <p>
            Authorized administrative actions and important system events
            recorded for accountability and traceability.
          </p>
        </div>
      </div>
      <p className="aa-readonly">
        <Info size={14} />
        Read-only records · Local history and clearly marked samples
      </p>
      <div className="aa-filters">
        <button
          className={button}
          aria-label="Audit date range"
          onClick={() => setDateOpen(true)}
        >
          <CalendarDays size={14} />
          {start || "Any date"} – {end || "Any date"}
        </button>
        {select("All Users", actor, setActor, "actor")}
        {select("All Modules", module, setModule, "module")}
        {select("All Actions", action, setAction, "action")}
        {select("All Results", result, setResult, "result")}
        <UserExport rows={filtered} onCsv={exportCsv} onNotice={setNotice} renderSummary={auditSummary} disabled={!!invalid} />
      </div>
      <div className="ad-toolbar">
        <label className="osas-search">
          <Search size={15} />
          <input
            aria-label="Search audit logs"
            placeholder="Search log ID, user, action, module, or target..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
        {select("All Sources", source, setSource, "source")}
        <button
          className={button}
          onClick={() => {
            setQuery("");
            setActor("");
            setModule("");
            setAction("");
            setResult("");
            setSource("");
            setStart("");
            setEnd("");
            setPage(1);
          }}
        >
          Reset filters
        </button>
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
      <div className="aa-table">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {[
                  "Log ID",
                  "User / Admin",
                  "Action",
                  "Module",
                  "Target Record",
                  "Date / Time",
                  "IP Address",
                  "Result / Status",
                  "Action",
                ].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.id}
                    <small>{r.source}</small>
                  </td>
                  <td>
                    <div className="au-person">
                      <Avatar name={r.actor} />
                      <span>
                        {r.actor}
                        <small>{r.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>{r.action}</td>
                  <td>{r.module}</td>
                  <td>{r.target}</td>
                  <td>{timestamp(r.at)}</td>
                  <td>{r.ip}</td>
                  <td>
                    <span
                      className={`au-status ${r.result === "Failed" ? "suspended" : r.result === "Completed" ? "restricted" : "active"}`}
                    >
                      {r.result}
                    </span>
                  </td>
                  <td>
                    <button
                      className={button}
                      aria-label={`View ${r.id}`}
                      onClick={() => setSelected(r)}
                    >
                      <Eye size={13} />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-7 text-center text-xs">
              No matching audit records.
            </p>
          )}
        </div>
        <div className="op-pagination p-3">
          <span>
            Showing {filtered.length ? (current - 1) * 8 + 1 : 0} to{" "}
            {Math.min(current * 8, filtered.length)} of {filtered.length}{" "}
            entries
          </span>
          <div>
            <button
              className={button}
              aria-label="Previous audit page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </button>
            <span>{current}</span>
            <button
              className={button}
              aria-label="Next audit page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <p className="ad-banner flex items-center gap-2">
        <Info size={15} />
        No edit or delete actions are available. Local browser history is not a
        tamper-proof institutional audit trail. IP addresses and live
        authentication events are not collected.
      </p>
      {dateOpen && (
        <Modal title="Audit Date Range" onClose={() => setDateOpen(false)}>
          <div className="space-y-3 text-xs">
            <label className="block">
              From
              <input
                aria-label="Audit start date"
                className={input}
                type="date"
                value={start}
                onChange={(e) => change(setStart, e.target.value)}
              />
            </label>
            <label className="block">
              To
              <input
                aria-label="Audit end date"
                className={input}
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
              onClick={() => setDateOpen(false)}
            >
              Apply date range
            </button>
          </div>
        </Modal>
      )}
      {selected && <AuditDetails record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
