import {
  policyCategories,
  policyPresentation,
} from "../../services/policyPresentation.js";
// Policies & Procedures: displays policy records and available authorized policy-management actions.
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
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
  RotateCcw,
} from "lucide-react";
import { Modal, button, input } from "../tutor/workspace/ui.jsx";

import PolicyDetails from "./PolicyDetails.jsx";

export default function OswePolicies({
  settings,
  policies: providedPolicies,
  onEdit,
  actions,
  searchQuery,
  onSearchChange,
  hideSearch = false,
}) {
  const database = useOsweDatabase();
  const policies = (providedPolicies ?? database?.records?.policies ?? []).map(
    policyPresentation,
  );
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [owner, setOwner] = useState(""),
    [month, setMonth] = useState(""),
    [recent, setRecent] = useState(false),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [categoriesOpen, setCategoriesOpen] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const endDay = month
    ? new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0))
        .toISOString()
        .slice(0, 10)
    : today;
  const cutoff = new Date(endDay + "T12:00:00Z");
  cutoff.setUTCDate(cutoff.getUTCDate() - 29);
  const cutoffDay = cutoff.toISOString().slice(0, 10);
  const available = policies.filter((p) => p.updated <= endDay);
  const updated = (p) => p.updated >= cutoffDay && p.updated <= endDay;
  const categories = [
    ...new Set([
      ...policyCategories,
      ...policies.map((p) => p.category).filter(Boolean),
    ]),
  ].sort();
  const filtered = available.filter(
    (p) =>
      (!category || p.category === category) &&
      (!status || p.status === status) &&
      (!owner ||
        String(p.owner || "")
          .trim()
          .toLowerCase() === owner.toLowerCase()) &&
      (!recent || updated(p)) &&
      `${p.title} ${p.category} ${p.owner} ${p.id}`
        .toLowerCase()
        .includes((searchQuery ?? query).trim().toLowerCase()),
  );
  const size = 12,
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * size, current * size);
  const date = (v) =>
    !v
      ? "—"
      : settings.dateFormat === "iso"
        ? v
        : new Date(v + "T12:00:00").toLocaleDateString(
            settings.language || "en-PH",
            {
              timeZone: settings.timezone || "Asia/Manila",
              month: settings.dateFormat === "short" ? "2-digit" : "short",
              day: "numeric",
              year: "numeric",
            },
          );
  function change(setter, value) {
    setter(value);
    setPage(1);
  }
  function reset() {
    setQuery("");
    onSearchChange?.("");
    setCategory("");
    setStatus("");
    setOwner("");
    setRecent(false);
    setMonth("");
    setPage(1);
  }
  return (
    <section className="op-policies">
      <div className="oswe-heading">
        <div>
          <h1>
            Policies &amp; Procedures{" "}
            <Shield size={23} className="text-green-800" />
          </h1>
          <p>
            Access institutional guidelines relevant to Kasangga cases, student
            conduct, clearance, evidence, and case handling.
          </p>
        </div>
        {actions}
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
      {!hideSearch && (
        <label className="oswe-search">
          <Search size={17} />
          <input
            aria-label="Search policies"
            placeholder="Search policies by title, category, or keyword..."
            value={searchQuery ?? query}
            onChange={(e) => {
              change(setQuery, e.target.value);
              onSearchChange?.(e.target.value);
            }}
          />
        </label>
      )}
      <div className="op-filters">
        <select
          aria-label="Policy category"
          className={input}
          value={category}
          onChange={(e) => change(setCategory, e.target.value)}
        >
          <option value="">All Categories ({policies.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c} ({policies.filter((p) => p.category === c).length})
            </option>
          ))}
        </select>
        <select
          aria-label="Document owner"
          className={input}
          value={owner}
          onChange={(e) => change(setOwner, e.target.value)}
        >
          <option value="">All Document Owners</option>
          {["Student Handbook", "System"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <button
          type="button"
          className={button + " op-reset"}
          onClick={reset}
          aria-label="Reset policy filters"
          title="Reset filters"
        >
          <RotateCcw size={17} />
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
                <td>{p.effectiveLabel || date(p.effective)}</td>
                <td>{p.owner}</td>
                <td>{p.updatedLabel || date(p.updated)}</td>
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
          entries | 12 rows per page
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
      {
        <div className="op-note">
          <Info size={18} />
          <p>
            These policies support OSWE institutional review and case handling.
            LCO maintains system policies. University and student handbook
            policies are read-only.
          </p>
        </div>
      }
      {selected && (
        <PolicyDetails
          policy={policies.find((p) => p.id === selected.id) || selected}
          policies={policies}
          date={date}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
          onEdit={
            onEdit &&
            (policies.find((p) => p.id === selected.id) || selected).scope ===
              "system"
              ? () => {
                  onEdit(
                    policies.find((p) => p.id === selected.id) || selected,
                  );
                  setSelected(null);
                }
              : undefined
          }
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
