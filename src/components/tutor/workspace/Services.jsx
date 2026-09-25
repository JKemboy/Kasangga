import { useInteractions } from "../../shared/InteractionProvider.jsx";
import { useLayoutEffect, useRef, useState } from "react";
import {
  Atom,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CodeXml,
  FileText,
  Info,
  MapPin,
  Monitor,
  Plus,
  Search,
  ShieldAlert,
  Sigma,
  Star,
  X,
} from "lucide-react";
import { money } from "./data.js";
import { Modal, button, primary } from "./ui.jsx";
import {
  SERVICE_CATEGORIES,
  SERVICE_LEVELS,
  SERVICE_TYPES,
  validateService,
} from "./serviceRules.js";

const control =
  "h-9 w-full rounded-md border border-[#dce4ef] bg-white px-3 text-xs text-[#18233d] outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700";
const actionButton =
  "min-h-8 rounded border border-green-700 bg-white px-1 py-1 text-[10px] font-semibold leading-3 text-green-800 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400";
const columns = [
  ["Service / Subject", "14%"],
  ["Category", "9%"],
  ["Level", "5.5%"],
  ["Description", "9%", true],
  ["Topics / Skills", "8%", true],
  ["Rate (per hour)", "7%"],
  ["Session Type", "8%"],
  ["Status", "8%"],
  ["Rating", "4%"],
  ["Completed Sessions", "5.5%"],
  ["Actions", "22%"],
];

function ServiceIcon({ service }) {
  const [Icon, color] =
    service.status === "Suspended"
      ? [FileText, "bg-slate-400"]
      : /statistics/i.test(service.name)
        ? [ChartNoAxesCombined, "bg-purple-600"]
        : service.category === "Science"
          ? [Atom, "bg-amber-400"]
          : service.category === "Computer Science"
            ? [CodeXml, "bg-green-700"]
            : service.category === "Mathematics"
              ? [Sigma, "bg-green-700"]
              : [BookOpen, "bg-teal-700"];
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-sm ${color}`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.7} />
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded px-2 py-1 text-[10px] font-semibold ${status === "Suspended" ? "bg-red-50 text-red-600" : status === "Inactive" ? "bg-slate-100 text-slate-600" : "bg-[#e2f5e9] text-green-800"}`}
    >
      {status}
    </span>
  );
}

function CategoryBadge({ category }) {
  return (
    <span
      className={`inline-block max-w-full break-words rounded px-1.5 py-1 text-[9px] font-semibold leading-3 ${category === "Science" ? "bg-amber-50 text-amber-700" : "bg-[#e2f5e9] text-green-800"}`}
    >
      {category}
    </span>
  );
}

function SessionType({ type }) {
  return (
    <span className="inline-flex flex-col gap-1.5 text-[10px] text-[#455780]">
      {type !== "In-person" && (
        <span className="inline-flex items-center gap-1.5">
          <Monitor className="h-3.5 w-3.5 shrink-0 text-green-700" />
          Online
        </span>
      )}
      {type !== "Online" && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-green-700" />
          In-person
        </span>
      )}
    </span>
  );
}

function Select({ label, children, ...props }) {
  return (
    <span className="relative block">
      <select
        aria-label={label}
        className={`${control} appearance-none pr-8`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#455780]" />
    </span>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block min-w-0 space-y-1 text-xs font-medium text-[#344675]">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Services({
  data,
  update,
  go,
  openCreate = false,
  clearCreate,
  args = {},
}) {
  const {confirm} = useInteractions();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(
    ["Active", "Inactive", "Suspended"].includes(args.status)
      ? args.status
      : "All",
  );
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [edit, setEdit] = useState(openCreate ? {} : null);
  const [detailId, setDetailId] = useState(args.serviceId || null);
  const [error, setError] = useState("");
  const tableHeadRef = useRef(null);
  const detail = data.services.find((s) => s.id === detailId);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const rows = data.services.filter((s) => {
    const text = [
      s.name,
      s.subtitle,
      s.description,
      s.topics,
      s.category,
      s.level,
      s.type,
    ]
      .join(" ")
      .toLowerCase();
    return (
      terms.every((term) => text.includes(term)) &&
      (status === "All" || s.status === status) &&
      (category === "All" || s.category === category)
    );
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  useLayoutEffect(() => {
    const measure = () => {
      const top = tableHeadRef.current.getBoundingClientRect().bottom;
      setPageSize(
        window.innerWidth >= 1024
          ? Math.max(
              1,
              Math.min(5, Math.floor((window.innerHeight - top - 48) / 80)),
            )
          : 5,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    const main = tableHeadRef.current.closest("main");
    observer.observe(main?.firstElementChild || tableHeadRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  function close() {
    setEdit(null);
    setError("");
    clearCreate?.();
  }

  function clearFilters() {
    setQuery("");
    setStatus("All");
    setCategory("All");
    setPage(1);
  }

  function save(e) {
    e.preventDefault();
    const result = validateService(
      Object.fromEntries(new FormData(e.currentTarget)),
      data.services,
      edit.id,
    );
    if (result.error) return setError(result.error);
    const values = result.values;
    const saved = update((d) => ({
      ...d,
      services: edit.id
        ? d.services.map((s) => (s.id === edit.id ? { ...s, ...values } : s))
        : [
            {
              ...values,
              id: crypto.randomUUID(),
              status: "Active",
              rating: 0,
              completed: 0,
            },
            ...d.services,
          ],
    }));
    if (saved === false)
      return setError(
        "Could not save this service. Please try again when browser storage is available.",
      );
    if (!edit.id) clearFilters();
    close();
  }

  async function toggleService(service) {
    if (service.status === "Suspended") return;
    if (!await confirm({title:`${service.status === "Active" ? "Deactivate" : "Reactivate"} ${service.name}?`, message:service.status === "Active" ? "Learners will no longer be able to find or book this service. Existing bookings stay scheduled. You can reactivate it anytime." : "This service becomes visible to learners again and uses your current availability.", accept:service.status === "Active" ? "Deactivate Service" : "Reactivate Service", danger:service.status === "Active"})) return;
    update((d) => ({
      ...d,
      services: d.services.map((s) =>
        s.id === service.id && s.status !== "Suspended"
          ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" }
          : s,
      ),
    }));
  }

  function actions(service) {
    const suspended = service.status === "Suspended";
    return (
      <div
        role="group"
        aria-label={`Actions for ${service.name}`}
        className="grid grid-cols-3 gap-1"
      >
        <button
          type="button"
          className={actionButton}
          onClick={() => setDetailId(service.id)}
        >
          View Details
        </button>
        <button
          type="button"
          className={actionButton}
          disabled={suspended}
          title={
            suspended
              ? "Suspended by Admin — editing is unavailable."
              : undefined
          }
          onClick={() => {
            setError("");
            setEdit(service);
          }}
        >
          Edit Service
        </button>
        <button
          type="button"
          className={`${actionButton} ${!suspended && service.status === "Active" ? "border-red-400 text-red-600 hover:bg-red-50 focus-visible:outline-red-600" : ""}`}
          disabled={suspended}
          title={
            suspended
              ? "Only an administrator can change a suspended service."
              : undefined
          }
          onClick={() => toggleService(service)}
        >
          {service.status === "Inactive" ? "Activate" : "Deactivate"} Service
        </button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="services-heading"
      className="space-y-2 pb-1 text-xs text-[#101828]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1
            id="services-heading"
            className="text-2xl font-bold tracking-tight"
          >
            My Services
          </h1>
          <p className="mt-0.5 text-xs text-[#455780]">
            Manage the tutoring services you offer.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-green-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          onClick={() => {
            setError("");
            setEdit({});
          }}
        >
          <Plus className="h-4 w-4" />
          Create New Service
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2.5fr_1fr_1fr]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <input
            aria-label="Search services"
            placeholder="Search services..."
            className={`${control} pr-9 placeholder:text-[#455780]`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear service search"
              className="absolute right-0 top-0 grid h-9 w-9 place-items-center text-[#455780]"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#455780]" />
          )}
        </div>
        <Select
          label="Service status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {["All", "Active", "Inactive", "Suspended"].map((value) => (
            <option key={value} value={value}>
              {value === "All" ? "All Statuses" : value}
            </option>
          ))}
        </Select>
        <Select
          label="Service category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All Categories</option>
          {[
            ...new Set([
              ...(category === "All" ? [] : [category]),
              ...data.services.map((s) => s.category),
            ]),
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </div>
      <p className="flex items-start gap-2 text-[11px] leading-4 text-[#455780]">
        <Info className="h-3.5 w-3.5 shrink-0 text-[#101828]" />
        <span>
          Session slots use your valid availability from{" "}
          <button
            type="button"
            className="font-medium underline-offset-2 hover:text-green-800 hover:underline"
            onClick={() => go("availability")}
          >
            Availability &amp; Schedule
          </button>
          .
        </span>
      </p>

      <div className="hidden overflow-hidden rounded-lg border border-[#e0e7f0] bg-white lg:block">
        <table
          aria-label="Tutoring services"
          className="w-full table-fixed border-collapse text-left text-[10px]"
        >
          <colgroup>
            {columns.map(([title, width, wide]) => (
              <col
                key={title}
                style={{ width }}
                className={wide ? "hidden xl:table-column" : ""}
              />
            ))}
          </colgroup>
          <thead ref={tableHeadRef} className="bg-[#f5f7fa]">
            <tr className="h-10">
              {columns.map(([title, , wide]) => (
                <th
                  key={title}
                  scope="col"
                  className={`px-1.5 py-2 text-[9px] font-semibold leading-3 ${wide ? "hidden xl:table-cell" : ""}`}
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {visible.map((s) => (
              <tr key={s.id} className="h-20">
                <th scope="row" className="px-1.5 py-2 text-left font-normal">
                  <div className="flex items-center gap-2">
                    <ServiceIcon service={s} />
                    <div className="min-w-0">
                      <span className="line-clamp-2 text-[11px] font-bold leading-4">
                        {s.name}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[10px] leading-[14px] text-[#455780]">
                        {s.subtitle}
                      </span>
                    </div>
                  </div>
                </th>
                <td className="px-1.5 py-2">
                  <CategoryBadge category={s.category} />
                </td>
                <td className="px-1 py-2">
                  <span
                    className={`inline-block rounded px-1 py-1 text-[9px] font-medium leading-3 ${s.level === "All Levels" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}
                  >
                    {s.level}
                  </span>
                </td>
                <td className="hidden px-1.5 py-2 text-[#455780] xl:table-cell">
                  <span className="line-clamp-3 leading-[14px]">
                    {s.description}
                  </span>
                </td>
                <td className="hidden px-1.5 py-2 text-[#455780] xl:table-cell">
                  <span className="line-clamp-3 leading-[14px]">
                    {s.topics
                      .split(",")
                      .map((topic) => topic.trim())
                      .join(" · ")}
                  </span>
                </td>
                <td className="px-1.5 py-2">
                  <span className="font-bold text-green-800">
                    {money(s.rate).replace(/\.00$/, "")}
                  </span>
                  <span className="text-[9px] text-green-800">/hour</span>
                </td>
                <td className="px-1.5 py-2">
                  <SessionType type={s.type} />
                </td>
                <td className="px-1 py-2 text-center">
                  <StatusBadge status={s.status} />
                  {s.status === "Suspended" && (
                    <p className="mt-1 line-clamp-3 text-[8px] leading-[11px] text-[#455780]">
                      Suspended by Admin — moderation applies.
                    </p>
                  )}
                </td>
                <td className="px-1 py-2">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                    {s.rating || "—"}
                  </span>
                </td>
                <td className="px-1.5 py-2 text-center font-medium">
                  {s.completed}
                </td>
                <td className="px-1.5 py-2">{actions(s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="grid gap-2 md:grid-cols-2 lg:hidden"
        aria-label="Service cards"
      >
        {visible.map((s) => (
          <article
            key={s.id}
            className="min-w-0 space-y-3 rounded-lg border border-[#e0e7f0] bg-white p-3"
          >
            <div className="flex items-start gap-2">
              <ServiceIcon service={s} />
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-sm font-bold">{s.name}</h2>
                <p className="mt-0.5 break-words text-[11px] text-[#455780]">
                  {s.subtitle}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={s.category} />
              <span className="text-[10px] text-blue-700">{s.level}</span>
            </div>
            <p className="break-words leading-5 text-[#455780]">
              {s.description}
            </p>
            <p className="break-words text-[11px] leading-4 text-[#455780]">
              <b>Topics / Skills:</b> {s.topics}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-green-800">{money(s.rate)}/hour</b>
              <SessionType type={s.type} />
            </div>
            <p className="flex items-center gap-1 text-[11px]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {s.rating || "No ratings yet"}
              <span className="ml-auto">{s.completed} completed sessions</span>
            </p>
            {s.status === "Suspended" && (
              <p className="text-[10px] text-red-600">
                Suspended by Admin — moderation applies.
              </p>
            )}
            {actions(s)}
          </article>
        ))}
      </div>

      {!rows.length && (
        <div className="grid justify-items-center gap-2 rounded-lg border border-[#e0e7f0] bg-white p-8 text-center">
          <BookOpen className="h-7 w-7 text-slate-400" />
          <h2 className="text-sm font-semibold">
            {data.services.length
              ? "No matching services"
              : "Create your first tutoring service"}
          </h2>
          <p className="text-xs text-[#455780]">
            {data.services.length
              ? "Try another search, status, or category."
              : "Add a subject, rate, and session type to get started."}
          </p>
          {(query || status !== "All" || category !== "All") && (
            <button type="button" className={button} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <footer className="flex min-h-8 flex-wrap items-center justify-between gap-2 text-[11px] text-[#455780]">
        <p role="status" aria-live="polite">
          Showing {rows.length ? start + 1 : 0} to{" "}
          {Math.min(start + pageSize, rows.length)} of {rows.length} services
        </p>
        <nav aria-label="Service pages" className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous services"
            className="grid h-7 w-8 place-items-center rounded border border-[#dce4ef] bg-white hover:bg-green-50 disabled:text-slate-300"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span
            aria-current="page"
            className="grid h-7 min-w-7 place-items-center rounded bg-green-800 px-2 text-xs font-semibold text-white"
          >
            {currentPage}
          </span>
          {totalPages > 1 && <span className="px-1">of {totalPages}</span>}
          <button
            type="button"
            aria-label="Next services"
            className="grid h-7 w-8 place-items-center rounded border border-[#dce4ef] bg-white hover:bg-green-50 disabled:text-slate-300"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      </footer>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetailId(null)}>
          <div className="space-y-4 p-1 text-sm">
            <div className="flex items-center gap-3">
              <ServiceIcon service={detail} />
              <div>
                <p className="text-xs text-[#455780]">{detail.subtitle}</p>
                <div className="mt-1">
                  <StatusBadge status={detail.status} />
                </div>
              </div>
            </div>
            <p className="break-words leading-6">{detail.description}</p>
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              {[
                ["Category", detail.category],
                ["Level", detail.level],
                ["Rate per hour", money(detail.rate)],
                [
                  "Session Type",
                  detail.type === "Both" ? "Online and In-person" : detail.type,
                ],
                ["Rating", detail.rating || "No ratings yet"],
                ["Completed Sessions", detail.completed],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[#455780]">{label}</dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-[#455780]">Topics / Skills</dt>
                <dd className="mt-1 break-words leading-5">{detail.topics}</dd>
              </div>
            </dl>
            {detail.status === "Suspended" && (
              <p className="flex gap-2 rounded-md bg-red-50 p-3 text-xs leading-5 text-red-700">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Suspended by Admin — editing and status changes are unavailable
                while moderation applies.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                onClick={() => setDetailId(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={primary}
                disabled={detail.status === "Suspended"}
                onClick={() => {
                  setEdit(detail);
                  setDetailId(null);
                  setError("");
                }}
              >
                Edit Service
              </button>
            </div>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal
          title={edit.id ? "Edit Service" : "Create New Service"}
          onClose={close}
        >
          <form onSubmit={save} className="space-y-3 p-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Service / Subject">
                <input
                  name="name"
                  className={control}
                  defaultValue={edit.name || ""}
                  required
                  maxLength={200}
                />
              </FormField>
              <FormField label="Subtitle">
                <input
                  name="subtitle"
                  className={control}
                  defaultValue={edit.subtitle || ""}
                  required
                  maxLength={200}
                />
              </FormField>
              <FormField label="Category">
                <Select
                  label="Category"
                  name="category"
                  defaultValue={edit.category || "Mathematics"}
                >
                  {[
                    ...new Set([
                      ...SERVICE_CATEGORIES,
                      ...data.services.map((s) => s.category),
                    ]),
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Level">
                <Select
                  label="Level"
                  name="level"
                  defaultValue={edit.level || "College"}
                >
                  {SERVICE_LEVELS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField label="Description">
              <textarea
                name="description"
                className={`${control} h-auto resize-y py-2`}
                rows={2}
                defaultValue={edit.description || ""}
                required
                maxLength={600}
              />
            </FormField>
            <FormField label="Topics / Skills">
              <textarea
                name="topics"
                className={`${control} h-auto resize-y py-2`}
                rows={2}
                defaultValue={edit.topics || ""}
                required
                maxLength={200}
                placeholder="Separate topics with commas"
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Rate per hour (PHP)">
                <input
                  name="rate"
                  className={control}
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  defaultValue={edit.rate ?? 350}
                  required
                />
              </FormField>
              <FormField label="Session Type">
                <Select
                  label="Session Type"
                  name="type"
                  defaultValue={edit.type || "Online"}
                >
                  {SERVICE_TYPES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-md bg-red-50 p-2 text-xs text-red-700"
              >
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={button} onClick={close}>
                Cancel
              </button>
              <button className={primary}>Save Service</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
