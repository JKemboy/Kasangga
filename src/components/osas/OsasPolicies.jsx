// Policies & Procedures: displays policy records and available authorized policy-management actions.
import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import { useState } from "react";
import {
  BookOpen,
  Pencil,
  History,
  Archive,
  FileText,
  Shield,
  Search,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Modal, button, input } from "../tutor/workspace/ui.jsx";

import PolicyDetails from "./PolicyDetails.jsx";

export default function OsasPolicies({ settings }) {
  const policies = useOsasDatabase().records?.policies || [];
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [owner, setOwner] = useState(""),
    [effective, setEffective] = useState(""),
    [month, setMonth] = useState(""),
    [recent, setRecent] = useState(false),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [categoriesOpen, setCategoriesOpen] = useState(false);
  const end = month
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0)
    : null;
  const endDay = end
    ? `${month}-${String(end.getDate()).padStart(2, "0")}`
    : "9999-12-31";
  const cutoff = end
    ? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29)
    : null;
  const cutoffDay = cutoff
    ? `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`
    : "";
  const available = policies.filter((p) => p.updated <= endDay);
  const updated = (p) => p.updated >= cutoffDay && p.updated <= endDay;
  const categories = [...new Set(policies.map((p) => p.category))];
  const filtered = available.filter(
    (p) =>
      (!category || p.category === category) &&
      (!status || p.status === status) &&
      (!owner || p.owner === owner) &&
      (!recent || updated(p)) &&
      (!effective ||
        (effective === "none"
          ? !p.effective
          : p.effective && p.effective.startsWith(effective))) &&
      `${p.title} ${p.category} ${p.owner} ${p.id}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const size = Number(settings.pageSize),
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * size, current * size);
  const date = (v) =>
    !v
      ? "—"
      : settings.dateFormat === "iso"
        ? v
      : new Date(v + "T12:00:00").toLocaleDateString(settings.language || "en-PH", {
          timeZone: settings.timezone || "Asia/Manila",
            month: settings.dateFormat === "short" ? "2-digit" : "short",
            day: "numeric",
            year: "numeric",
          });
  function change(setter, value) {
    setter(value);
    setPage(1);
  }
  function reset() {
    setQuery("");
    setCategory("");
    setStatus("");
    setOwner("");
    setEffective("");
    setRecent(false);
    setMonth("");
    setPage(1);
  }
  return (
    <section className="op-policies">
      <div className="osas-heading">
        <div>
          <h1>
            Policies &amp; Procedures{" "}
            <Shield size={23} className="text-green-800" />
          </h1>
          <p>
            Access institutional guidelines relevant to CampusTutor cases,
            student conduct, clearance, evidence, and case handling.
          </p>
        </div>
        <label className="op-month">
          Record month
          <input
            aria-label="Policy record month"
            className={input}
            type="month"
            min="2024-01"
            max="2099-12"
            value={month}
            onChange={(e) => change(setMonth, e.target.value)}
          />
        </label>
      </div>
      <div className="op-metrics">
        {[
          [
            BookOpen,
            available.filter((p) => p.status === "Active").length,
            "Active Policies",
            "Published and visible",
            "Active",
          ],
          [
            Pencil,
            available.filter((p) => p.status === "Draft").length,
            "Draft Policies",
            "Under development",
            "Draft",
          ],
          [
            History,
            available.filter(updated).length,
            "Recently Updated",
            "Last 30 days of selected month",
            "recent",
          ],
          [
            Archive,
            available.filter((p) => p.status === "Archived").length,
            "Archived Policies",
            "No longer active",
            "Archived",
          ],
          [
            FileText,
            new Set(available.map((p) => p.category)).size,
            "Policy Categories",
            "Organized groups",
            "categories",
          ],
        ].map(([Icon, count, label, hint, value], i) => (
          <button
            key={label}
            aria-pressed={value === "recent" ? recent : status === value}
            onClick={() => {
              if (value === "categories") setCategoriesOpen(true);
              else if (value === "recent") {
                setStatus("");
                change(setRecent, !recent);
              } else {
                setRecent(false);
                change(setStatus, status === value ? "" : value);
              }
            }}
          >
            <span
              style={{
                background: [
                  "#006333",
                  "#ffb800",
                  "#0874ff",
                  "#f50029",
                  "#7522dc",
                ][i],
              }}
            >
              <Icon size={24} />
            </span>
            <div>
              <b>{count}</b>
              <strong>{label}</strong>
              <small>{hint}</small>
            </div>
          </button>
        ))}
      </div>
      <label className="osas-search">
        <Search size={17} />
        <input
          aria-label="Search policies"
          placeholder="Search policies by title, category, or keyword..."
          value={query}
          onChange={(e) => change(setQuery, e.target.value)}
        />
      </label>
      <div className="op-filters">
        <select
          aria-label="Policy category"
          className={input}
          value={category}
          onChange={(e) => change(setCategory, e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Policy status"
          className={input}
          value={status}
          onChange={(e) => change(setStatus, e.target.value)}
        >
          <option value="">All Statuses</option>
          {["Active", "Draft", "Archived"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Document owner"
          className={input}
          value={owner}
          onChange={(e) => change(setOwner, e.target.value)}
        >
          <option value="">All Document Owners</option>
          {[...new Set(policies.map((p) => p.owner))].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select
          aria-label="Effective date"
          className={input}
          value={effective}
          onChange={(e) => change(setEffective, e.target.value)}
        >
          <option value="">All Effective Dates</option>
          <option value="2026">Effective in 2026</option>
          <option value="2024">Effective in 2024</option>
          <option value="none">Not yet effective</option>
        </select>
        <button className={button} onClick={reset}>
          Reset filters
        </button>
      </div>
      {recent && (
        <div className="text-xs text-blue-700">
          Showing updates from {date(cutoffDay)} to {date(endDay)}.{" "}
          <button className="underline" onClick={() => setRecent(false)}>
            Clear recent filter
          </button>
        </div>
      )}
      <div className="op-table">
        <table>
          <thead>
            <tr>
              {[
                "#",
                "Policy Title",
                "Category",
                "Version",
                "Effective Date",
                "Document Owner",
                "Status",
                "Last Updated",
                "Action",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p, i) => (
              <tr key={p.id}>
                <td>{(current - 1) * size + i + 1}</td>
                <td>
                  <button
                    className="text-left hover:underline"
                    onClick={() => setSelected(p)}
                  >
                    {p.title}
                  </button>
                </td>
                <td>
                  <span
                    className={`op-category category-${categories.indexOf(p.category)}`}
                  >
                    {p.category}
                  </span>
                </td>
                <td>{p.version}</td>
                <td>{date(p.effective)}</td>
                <td>{p.owner}</td>
                <td>
                  <span className={`op-status ${p.status.toLowerCase()}`}>
                    {p.status}
                  </span>
                </td>
                <td>{date(p.updated)}</td>
                <td>
                  <button
                    className={button + " op-view"}
                    aria-label={`View ${p.title}`}
                    onClick={() => setSelected(p)}
                  >
                    <Eye size={13} />
                    View Policy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-slate-500">
            No matching policies. Try resetting your filters.
          </p>
        )}
      </div>
      <div className="op-pagination">
        <span>
          Showing {filtered.length ? (current - 1) * size + 1 : 0} to{" "}
          {Math.min(current * size, filtered.length)} of {filtered.length}{" "}
          entries
        </span>
        <div>
          <button
            className={button}
            aria-label="Previous policy page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span>{current}</span>
          <button
            className={button}
            aria-label="Next policy page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      {settings.tips && (
        <div className="op-note">
          <Info size={18} />
          <p>
            Demo reference catalog. Official policy documents are not attached.
            These references support OSAS review; technical configuration
            remains under authorized platform administration.
          </p>
        </div>
      )}
      {selected && (
        <PolicyDetails
          policy={selected}
          policies={policies}
          date={date}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
      {categoriesOpen && (
        <Modal
          title="Policy Categories"
          onClose={() => setCategoriesOpen(false)}
        >
          <div className="space-y-2">
            {[...new Set(available.map((p) => p.category))].map((c) => (
              <button
                className="flex w-full justify-between rounded border p-3 text-left text-xs hover:bg-green-50"
                key={c}
                onClick={() => {
                  change(setCategory, c);
                  setStatus("");
                  setRecent(false);
                  setCategoriesOpen(false);
                }}
              >
                {c}
                <b>{available.filter((p) => p.category === c).length}</b>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </section>
  );
}
