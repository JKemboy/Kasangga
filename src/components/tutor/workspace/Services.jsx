import "./services-table.css";
import { listTutorReviews } from "../../../services/tutorReviews.js";
// My Services: lists tutor-owned services and sends create, edit, status, and availability changes to TutorDashboard callbacks.
import ServiceDetails from "./ServiceDetails.jsx";
import CreateService from "./CreateService.jsx";
import { useInteractions } from "../../shared/InteractionProvider.jsx";
import { useEffect, useRef, useState } from "react";
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
  Sigma,
  Star,
  X,
} from "lucide-react";
import { money } from "./data.js";
import { button } from "./ui.jsx";

const control =
  "h-9 w-full rounded-md border border-[#dce4ef] bg-white px-3 text-xs text-[#18233d] outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700";
const actionButton =
  "min-h-8 rounded border border-green-700 bg-white px-1 py-1 text-[10px] font-semibold leading-3 text-green-800 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400";

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

export default function Services({
  data,
  saveService,
  changeServiceStatus,
  update,
  go,
  openCreate = false,
  clearCreate,
  args = {},
}) {
  const { confirm } = useInteractions();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(
    ["Active", "Inactive", "Suspended"].includes(args.status)
      ? args.status
      : "All",
  );
  const [sessionType, setSessionType] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [edit, setEdit] = useState(openCreate ? {} : null);
  const [detailId, setDetailId] = useState(args.serviceId || null);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
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
      (sessionType === "All" ||
        s.type === sessionType ||
        (sessionType !== "Both" && s.type === "Both"))
    );
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  const [topicReviews, setTopicReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState("");
  const tutorProfileId = data.services[0]?.tutorProfileId;
  useEffect(() => {
    if (!tutorProfileId) return;
    let active = true;
    const load = async () => {
      try {
        const result = await listTutorReviews(tutorProfileId);
        if (active) {
          setTopicReviews(result.entries);
          setReviewsError("");
        }
      } catch {
        if (active) setReviewsError("Ratings unavailable");
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [tutorProfileId]);

  function close() {
    setEdit(null);
    setError("");
    clearCreate?.();
  }

  function clearFilters() {
    setQuery("");
    setStatus("All");
    setSessionType("All");
    setPage(1);
  }

  async function toggleService(service) {
    if (service.status === "Suspended" || changing) return;
    if (
      !(await confirm({
        presentation: "service",
        title: `${service.status === "Active" ? "Deactivate" : "Reactivate"} ${service.name}?`,
        message:
          service.status === "Active"
            ? `Learners will no longer be able to find or book ${service.name}. All existing bookings keep their original topic, amount, and schedule. You must still attend scheduled sessions. You can reactivate this service anytime.`
            : "This service becomes visible to learners again and uses your current availability.",
        accept:
          service.status === "Active"
            ? "Deactivate Service"
            : "Reactivate Service",
        danger: service.status === "Active",
      }))
    )
      return;
    setChanging(true);
    try {
      await changeServiceStatus(
        service.id,
        service.status === "Active" ? "Inactive" : "Active",
      );
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setChanging(false);
    }
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
          disabled={suspended || changing}
          title={
            suspended
              ? "Suspended by LCO — editing is unavailable."
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
          disabled={suspended || changing}
          title={
            suspended
              ? "Only an LCO can change a suspended service."
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
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
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
          label="Service session type"
          value={sessionType}
          onChange={(event) => {
            setSessionType(event.target.value);
            setPage(1);
          }}
        >
          <option value="All">All Session Type</option>
          <option value="Online">Online</option>
          <option value="In-person">In-person</option>
          <option value="Both">Both</option>
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

      <div className="overflow-x-auto rounded-lg border border-[#e0e7f0] bg-white">
        <table className="tutor-services-table" aria-label="Tutoring services">
          <colgroup>
            {[16, 14, 16, 9, 10, 7, 10, 7, 11].map((width, index) => (
              <col key={index} style={{ width: width + "%" }} />
            ))}
          </colgroup>
          <thead className="bg-[#f5f7fa]">
            <tr>
              {[
                "Service / Subject",
                "Description",
                "Topics / Skills",
                "Rate (per hour)",
                "Session Type",
                "Status",
                "Rating",
                "Completed Sessions",
                "Actions",
              ].map((label) => (
                <th key={label} className="px-3 py-3 text-[10px] font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          {visible.map((service) => {
            const sessions = data.sessions.filter(
              (session) =>
                String(session.serviceId) === String(service.id) &&
                session.status === "Completed",
            );
            const topics = service.topicDetails?.length
              ? service.topicDetails
              : String(service.topics || "")
                  .split(",")
                  .map((name) => name.trim())
                  .filter(Boolean)
                  .map((name) => ({
                    name,
                    rate: service.rate,
                    types:
                      service.type === "Both"
                        ? ["Online", "In-person"]
                        : [service.type],
                  }));
            const topicRows = topics.length
              ? topics
              : [
                  {
                    name: "No topics",
                    rate: service.rate,
                    types: [service.type],
                  },
                ];
            return (
              <tbody key={service.id} className="border-t border-[#dce5e1]">
                {topicRows.map((topic, index) => {
                  const reviews = topicReviews.filter(
                    (review) =>
                      String(review.serviceId) === String(service.id) &&
                      review.topic === topic.name,
                  );
                  const rating = reviews.length
                    ? (
                        reviews.reduce(
                          (sum, review) => sum + review.rating,
                          0,
                        ) / reviews.length
                      ).toFixed(1)
                    : null;
                  const completed = sessions.filter(
                    (session) => session.topic === topic.name,
                  ).length;
                  return (
                    <tr
                      key={topic.id || topic.name}
                      className="border-b border-slate-100 last:border-0"
                    >
                      {index === 0 && (
                        <>
                          <th
                            scope="rowgroup"
                            rowSpan={topicRows.length}
                            className="px-3 py-3 align-top font-normal"
                          >
                            <div className="flex items-start gap-2">
                              <ServiceIcon service={service} />
                              <div>
                                <span className="font-bold">
                                  {service.name}
                                </span>
                              </div>
                            </div>
                          </th>
                          <td
                            rowSpan={topicRows.length}
                            className="max-w-48 px-3 py-3 align-top text-[#455780]"
                          >
                            {service.description}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3 font-medium">
                        {topic.name}
                        <p className="mt-1 text-[10px] font-normal text-slate-500">
                          {completed} completed sessions
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-green-800">
                        {money(topic.rate)}/hr
                      </td>
                      <td className="px-3 py-3">
                        <SessionType
                          type={
                            topic.types?.length === 2
                              ? "Both"
                              : topic.types?.[0] || service.type
                          }
                        />
                      </td>
                      {index === 0 && (
                        <td
                          rowSpan={topicRows.length}
                          className="px-3 py-3 align-top"
                        >
                          <StatusBadge status={service.status} />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                          {reviewsError ||
                            (rating
                              ? rating + " (" + reviews.length + ")"
                              : "No ratings yet")}
                        </span>
                      </td>
                      {index === 0 && (
                        <td
                          rowSpan={topicRows.length}
                          className="px-3 py-3 text-center align-top font-semibold"
                        >
                          {sessions.length}
                        </td>
                      )}
                      {index === 0 && (
                        <td
                          rowSpan={topicRows.length}
                          className="service-table-actions px-3 py-3 align-top"
                        >
                          {actions(service)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
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
              ? "Try another search, status, or session type."
              : "Add a subject, rate, and session type to get started."}
          </p>
          {(query || status !== "All" || sessionType !== "All") && (
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
        <ServiceDetails
          error={error}
          changing={changing}
          service={detail}
          data={data}
          update={update}
          go={go}
          onClose={() => setDetailId(null)}
          onToggle={toggleService}
          onEdit={(service) => {
            setEdit(service);
            setDetailId(null);
            setError("");
          }}
        />
      )}

      {edit && (
        <CreateService
          saveService={saveService}
          key={edit.id || "new"}
          service={edit.id ? edit : null}
          data={data}
          onClose={close}
        />
      )}
    </section>
  );
}
