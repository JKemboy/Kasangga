import {
  collegeProgramMap,
  findCollege,
  findProgram,
} from "../../services/collegeProgramMap.js";
// User Management: searches and reviews user records, then sends authorized changes to the LCO database callbacks.
import UserExport from "./UserExport.jsx";
import UserDetails from "./UserDetails.jsx";
import { useState } from "react";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  GraduationCap,
  Eye,
  ArrowRight,
} from "lucide-react";
import { button, input, Avatar } from "../tutor/workspace/ui.jsx";
export default function LcoUsers({
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
      !roles.some((role) => ["lco", "oswe"].includes(role)) &&
      roles.some((role) => role === "learner" || role === "tutor")
    );
  });

  const [tab, setTab] = useState("All Users"),
    [college, setCollege] = useState(""),
    [role, setRole] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  const filtered = rows.filter(
    (r) =>
      (tab === "All Users" || r.status === tab) &&
      (!college ||
        r.college === college ||
        collegeProgramMap.some(
          (c) => c.code === college && c.name === r.college,
        )) &&
      (!role ||
        (role === "Learner & Tutor"
          ? r.tutor
          : r.roles?.includes("learner") && !r.tutor)) &&
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
    a.download = "lco-users.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching users.`);
  }
  return (
    <section className="au-users lco-user-management">
      <div className="oswe-heading">
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
            "Learner & Tutor",
          ],
        ].map(([Icon, count, label, hint, value], i) => (
          <button
            key={label}
            aria-pressed={
              value === "Learner & Tutor"
                ? role === value
                : !role && tab === value
            }
            onClick={() => {
              setTab(value === "Learner & Tutor" ? "All Users" : value);
              setCollege("");
              setRole(value === "Learner & Tutor" ? value : "");
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
      <div className="au-toolbar user-management-toolbar">
        <label className="user-management-search">
          Search users
          <span className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              aria-label="Search users"
              placeholder="Search name, student ID, or email..."
              className={input + " pl-9"}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </span>
        </label>
        <label>
          Users
          <select
            aria-label="Users"
            className={input}
            value={tab}
            onChange={(e) => {
              setTab(e.target.value);
              setPage(1);
            }}
          >
            {["All Users", "Active", "Suspended"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          College
          <select
            aria-label="College"
            className={input}
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Colleges</option>
            {collegeProgramMap.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
            {[...new Set(rows.map((r) => r.college).filter(Boolean))]
              .filter(
                (c) =>
                  !collegeProgramMap.some(
                    (item) => item.code === c || item.name === c,
                  ),
              )
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <label>
          Role
          <select
            aria-label="Role"
            className={input}
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            <option>Learner</option>
            <option>Learner &amp; Tutor</option>
          </select>
        </label>
        <UserExport rows={filtered} onCsv={exportCsv} onNotice={setNotice} />
      </div>
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
                  <td title={r.college}>
                    {findCollege(r.college)?.code ||
                      r.college ||
                      "Not provided"}
                  </td>
                  <td title={r.program}>
                    {findProgram(findCollege(r.college), r.program)?.code ||
                      r.program ||
                      "Not provided"}
                  </td>
                  <td>
                    {r.roles.map((role) => (
                      <span className="au-role" key={role}>
                        {{
                          lco: "LCO",
                          oswe: "OSWE",
                        }[role] || role.charAt(0).toUpperCase() + role.slice(1)}
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
