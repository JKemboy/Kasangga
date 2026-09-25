import {useInteractions} from "../shared/InteractionProvider.jsx";
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
const key = "campustutor:admin-users:v1";
const initial = [
  [
    "2021-00123",
    "Juan Dela Cruz",
    "juan.delacruz",
    "CCIS",
    "BS Information Technology",
    false,
    "Active",
    "2021-08-20",
  ],
  [
    "2022-00456",
    "Maria Angelica Reyes",
    "maria.reyes",
    "CSM",
    "BS Mathematics",
    true,
    "Active",
    "2022-09-10",
  ],
  [
    "2021-00198",
    "Karl Jhon Dimaano",
    "karl.dimaano",
    "CCIS",
    "BS Information Technology",
    false,
    "Active",
    "2021-08-25",
  ],
  [
    "2022-00321",
    "Ella Mae Santos",
    "ella.santos",
    "CCIS",
    "BS Computer Science",
    true,
    "Active",
    "2022-05-12",
  ],
  [
    "2020-00077",
    "John Michael Perez",
    "john.perez",
    "CCIS",
    "BS Information Technology",
    false,
    "Suspended",
    "2021-01-15",
  ],
  [
    "2021-00245",
    "Renalyn Laurente",
    "renalyn.laurente",
    "CCIS",
    "BS Information Technology",
    true,
    "Active",
    "2021-09-02",
  ],
  [
    "2023-00678",
    "Mark Joseph Paloma",
    "mark.paloma",
    "CCIS",
    "BS Information Technology",
    false,
    "Restricted",
    "2023-10-05",
  ],
].map(([id, name, email, college, program, tutor, status, registered]) => ({
  id,
  name,
  email: email + "@carsu.edu.ph",
  college,
  program,
  tutor,
  status,
  registered,
  history: [],
}));
export function loadAdminUsers() {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (
      Array.isArray(data) &&
      data.length === initial.length &&
      new Set(data.map((r) => r.id)).size === initial.length &&
      data.every(
        (r) =>
          initial.some((v) => v.id === r.id) &&
          ["Active", "Suspended", "Restricted"].includes(r.status) &&
          Array.isArray(r.history),
      )
    )
      return data;
  } catch {}
  return structuredClone(initial);
}
export default function AdminUsers({ rows, onUpdate, query, setQuery }) {
  const {confirm}=useInteractions();

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
      (!role || (role === "Tutor" ? r.tutor : !r.tutor)) &&
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
  async function save(e) {
    e.preventDefault();
    if (status === selected.status) {
      setError("Choose a different account status.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for this change.");
      return;
    }
    if(!await confirm({title:`Change account status to ${status}?`,message:`${selected.name}: ${reason.trim()}. This is a platform account action; existing institutional records are retained.`,accept:status==="Suspended"?"Suspend User":status==="Active"?"Reactivate User":"Restrict User",danger:status!=="Active"}))return;
    const next = rows.map((r) =>
      r.id === selected.id
        ? {
            ...r,
            status,
            history: [
              ...r.history,
              {
                from: r.status,
                to: status,
                reason: reason.trim(),
                at: new Date().toISOString(),
                by: "Admin User",
              },
            ],
          }
        : r,
    );
    try {
      localStorage.setItem(key, JSON.stringify(next));
      onUpdate(next);
      setSelected(null);
      setNotice("Account status saved on this browser.");
    } catch {
      setError("Could not save. Browser storage is unavailable or full.");
    }
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
        r.tutor ? "Learner + Tutor" : "Learner",
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
    a.download = "admin-users-demo.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching users.`);
  }
  return (
    <section className="au-users">
      <div className="osas-heading">
        <div>
          <h1>User Management</h1>
          <p>Monitor and manage authorized CampusTutor accounts.</p>
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
            "Approved demo tutor accounts",
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
        <button
          className={primary + " flex items-center gap-2"}
          onClick={exportCsv}
        >
          <Download size={15} />
          Export
        </button>
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
              <option value="Learner">Learner only</option>
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
                    <span className="au-role">Learner</span>
                    {r.tutor && <span className="au-tutor">+ Tutor</span>}
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
        Local demo · Account changes do not affect institutional sign-in.
      </p>
      {selected && (
        <Modal
          title={`Manage User · ${selected.name}`}
          onClose={() => setSelected(null)}
        >
          <form className="space-y-3 text-xs" onSubmit={save}>
            <div className="flex items-center gap-3">
              <Avatar name={selected.name} />
              <div>
                <b>{selected.name}</b>
                <p>
                  {selected.id} · {selected.email}
                </p>
              </div>
            </div>
            <p>
              {selected.college} · {selected.program}
            </p>
            <p>
              Roles: {selected.tutor ? "Learner + Verified Tutor" : "Learner"} ·
              Registered {date(selected.registered)}
            </p>
            <label className="block">
              Account status
              <select
                aria-label="Account status"
                className={input}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["Active", "Suspended", "Restricted"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block">
              Reason for status change
              <textarea
                aria-label="Status change reason"
                className={input}
                required
                maxLength={1000}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p className="text-slate-500">
              Saved changes apply to this demo only. Institutional access
              controls are not connected.
            </p>
            {selected.history.length > 0 && (
              <details>
                <summary>Account history ({selected.history.length})</summary>
                {selected.history.map((h, i) => (
                  <div className="mt-2 rounded border p-2" key={i}>
                    <b>
                      {h.from} → {h.to}
                    </b>
                    <p>{h.reason}</p>
                    <p>
                      {h.by} ·{" "}
                      {new Date(h.at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </p>
                  </div>
                ))}
              </details>
            )}
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                onClick={() => setSelected(null)}
              >
                Close
              </button>
              <button className={primary} disabled={status === selected.status}>
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
