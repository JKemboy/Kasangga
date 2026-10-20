// User Management: searches and reviews user records, then sends authorized changes to the Admin database callbacks.
import UserExport from "./UserExport.jsx";
import UserDetails from "./UserDetails.jsx";
import { useInteractions } from "../shared/InteractionProvider.jsx";
import { useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Search,
  Download,
  Eye,
  Filter,
  ArrowRight,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
export default function AdminUsers({
  rows: allRows,
  onUpdate,
  query,
  setQuery,
  applications,
  services,
  config,
  onServiceSave,
  onApplicationSave,
  onDocument,
}) {
  const rows = allRows.filter((user) => {
    const roles = (user.roles || []).map((role) => role.toLowerCase());
    return (
      !roles.some((role) => role === "admin" || role === "osas") &&
      roles.some((role) => role === "learner" || role === "tutor")
    );
  });
  const { confirm } = useInteractions();

  const [tab, setTab] = useState("All Users"),
    [college, setCollege] = useState(""),
    [role, setRole] = useState(""),
    [filters, setFilters] = useState(false),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [status, setStatus] = useState(""),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const filtered = rows.filter(
    (r) =>
      (tab === "All Users" ||
        (tab === "Learner + Tutor" && r.tutor) ||
        r.status === tab) &&
      (!college || r.college === college) &&
      (!role || r.roles?.includes(role.toLowerCase())) &&
      `${r.id} ${r.name} ${r.email}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 7, current * 7);
  const date = (v) =>
    new Date(v + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  function open(r) {
    setSelected(r);
    setStatus(r.status);
    setReason("");
    setError("");
  }
  function exportCsv() {
    const fields = [
      "id",
      "name",
      "email",
      "college",
      "program",
      "status",
      "registered",
    ];
    const csv = [
      [
        "Student ID",
        "User Name",
        "CSU Email",
        "College",
        "Program",
        "Account Status",
        "Registration Date",
        "Roles",
      ],
      ...filtered.map((r) => [
        ...fields.map((f) => r[f]),
        (r.roles || []).join(" + "),
      ]),
    ]
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-users.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching users.`);
  }
  return (
    <section className="au-users">
      <div className="osas-heading">
        <div>
          <h1>User Management</h1>
          <p>Monitor and manage Kasangga Learner and Tutor accounts.</p>
        </div>
      </div>
      <div className="au-metrics">
        {[
          [Users, rows.length, "Total Users", "All user accounts", "All Users"],
          [
            UserCheck,
            rows.filter((r) => r.status === "Active").length,
            "Active Users",
            "Currently active accounts",
            "Active",
          ],
          [
            UserX,
            rows.filter((r) => r.status === "Suspended").length,
            "Suspended Users",
            "Suspended accounts",
            "Suspended",
          ],
          [
            GraduationCap,
            rows.filter((r) => r.tutor).length,
            "Verified Tutors",
            "Accounts with an active tutor role",
            "Learner + Tutor",
          ],
        ].map(([Icon, count, label, hint, value], i) => (
          <button
            key={label}
            onClick={() => {
              setTab(value);
              setCollege("");
              setRole("");
              setQuery("");
              setPage(1);
            }}
          >
            <span
              style={{
                background:
                  i === 2 ? "#ef1735" : i === 3 ? "#ffb800" : "#00623a",
              }}
            >
              <Icon size={27} />
            </span>
            <div>
              <b>{count}</b>
              <strong>{label}</strong>
              <small>{hint}</small>
            </div>
          </button>
        ))}
      </div>
      <div className="au-toolbar">
        <div className="au-tabs" aria-label="User status filters">
          {[
            "All Users",
            "Active",
            "Suspended",
            "Restricted",
            "Learner + Tutor",
          ].map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="osas-search">
          <Search size={16} />
          <input
            aria-label="Search users"
            placeholder="Search by name, email, or student ID..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          className={button + " flex items-center gap-2"}
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <Filter size={14} />
          Filter{college || role ? " •" : ""}
        </button>
        <UserExport rows={filtered} onCsv={exportCsv} onNotice={setNotice} />
      </div>
      {filters && (
        <div className="au-filters">
          <label>
            College
            <select
              className={input}
              value={college}
              onChange={(e) => {
                setCollege(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All colleges</option>
              {[...new Set(rows.map((r) => r.college))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Role
            <select
              className={input}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              <option value="Tutor">Learner + Tutor</option>
              <option value="Learner">Learner</option>
            </select>
          </label>
          <button
            className={button}
            onClick={() => {
              setCollege("");
              setRole("");
              setTab("All Users");
              setQuery("");
              setPage(1);
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      <div className="au-table">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {[
                  "Student ID",
                  "User Name",
                  "CSU Email",
                  "College",
                  "Program",
                  "Active Roles",
                  "Account Status",
                  "Registration Date",
                  "Action",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <div className="au-person">
                      <Avatar name={r.name} />
                      <b>{r.name}</b>
                    </div>
                  </td>
                  <td>{r.email}</td>
                  <td>{r.college}</td>
                  <td>{r.program}</td>
                  <td>
                    {r.roles.map((role) => (
                      <span className="au-role" key={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`au-status ${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{date(r.registered)}</td>
                  <td>
                    <button
                      className={button + " au-view"}
                      aria-label={`Manage ${r.name}`}
                      onClick={() => open(r)}
                    >
                      <Eye size={14} />
                      {r.status === "Active" ? "View User" : "Manage User"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-8 text-center text-xs text-slate-500">
              No matching users. Try another search or reset your filters.
            </p>
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
              aria-label="Previous user page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ArrowRight className="rotate-180" size={14} />
            </button>
            <span>{current}</span>
            <button
              className={button}
              aria-label="Next user page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
      <p className="text-[9px] text-slate-400">
        Database records · Account status changes apply to Kasangga access.
      </p>
      {selected && (
        <UserDetails
          user={rows.find((r) => r.id === selected.id) || selected}
          applications={applications}
          services={services}
          config={config}
          onServiceSave={onServiceSave}
          onApplicationSave={onApplicationSave}
          onDocument={onDocument}
          onClose={() => setSelected(null)}
          onSave={onUpdate}
        />
      )}
    </section>
  );
}
