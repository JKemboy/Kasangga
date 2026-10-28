import {
  earningsDateOptions,
  matchesEarningsDate,
  payoutStatusOptions,
  payoutStatus,
} from "../../../services/earningsFilters.js";
// Earnings: presents tutor earnings and payment records supplied by the tutor workspace data/services.
import { TransactionDetails } from "./SessionDetails.jsx";
import { useLayoutEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  ChartColumnIncreasing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Info,
  Landmark,
  Search,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { money } from "./data.js";
import { sessionAllocation, summarizeEarnings } from "./earnings.js";
import { button } from "./ui.jsx";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const headers = [
  ["Transaction ID", "12%"],
  ["Booking ID", "12%"],
  ["Learner", "16%"],
  ["Service", "17%"],
  ["Session Date", "8%"],
  ["Gross Amount", "8%"],
  ["Your Share (90%)", "9%"],
  ["Platform Share (10%)", "8%"],
  ["Payment Status", "10%"],
];

function sessionDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value || "—"
    : dateFormatter.format(date);
}

function Learner({ name }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-50 to-slate-200 text-[9px] font-semibold text-green-800"
      >
        {name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")}
      </span>
      <span className="min-w-0 break-words leading-[14px]">{name}</span>
    </span>
  );
}

function PayoutBadge({ session }) {
  const status = payoutStatus(session);
  const label = status === "Pending for Transfer" ? "Pending Transfer" : status;
  const colors =
    status === "Transferred"
      ? "bg-[#e3f4e9] text-green-800"
      : status === "Pending for Transfer"
        ? "bg-orange-50 text-orange-700"
        : status === "On Hold"
          ? "bg-red-50 text-red-600"
          : "bg-[#eef1f4] text-slate-600";
  const format = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Manila",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(date);
  };
  const sent = session.transferredAt && format(session.transferredAt);
  const due = session.transferDueAt && format(session.transferDueAt);
  const detail =
    status === "Transferred"
      ? sent
        ? "Sent " + sent
        : "Transfer recorded"
      : status === "Pending for Transfer"
        ? due
          ? "By " + due
          : "Awaiting payout transfer"
        : status === "On Hold"
          ? "Refund under review"
          : "Waiting for the learner to confirm";
  return (
    <div className="space-y-1">
      <span
        className={
          "inline-block rounded-md px-3 py-1 text-xs font-semibold " + colors
        }
      >
        {label}
      </span>
      <p className="text-[11px] leading-4 text-slate-500">{detail}</p>
    </div>
  );
}

export default function Earnings({ data, go, args = {} }) {
  const [selected, setSelected] = useState(
    args.transactionId
      ? data.sessions.find((s) => s.transaction === args.transactionId) || null
      : null,
  );
  const [query, setQuery] = useState(args.transactionId || args.query || "");
  const [status, setStatus] = useState("All");
  const [datePeriod, setDatePeriod] = useState("All dates");
  const [serviceId, setServiceId] = useState("All");
  const selectedService = data.services.find(
    (service) => String(service.id) === serviceId,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const tableHeadRef = useRef(null);
  const totals = summarizeEarnings(data.sessions);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = data.sessions.filter((s) => {
    const searchable = [
      s.transaction,
      s.booking,
      s.learner,
      s.service,
      s.date,
      sessionDate(s.date),
      s.payment,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (s.payment === "Paid" ||
        !!s.transferredAt ||
        payoutStatus(s) === "On Hold") &&
      terms.every((term) => searchable.includes(term)) &&
      matchesEarningsDate(s.date, datePeriod) &&
      (serviceId === "All" ||
        (s.serviceId != null
          ? String(s.serviceId) === serviceId
          : s.service === selectedService?.name)) &&
      (status === "All" || payoutStatus(s) === status)
    );
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);
  const firstPageButton = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - 4),
  );
  const pageButtons = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => firstPageButton + i,
  );
  const paidResults =
    rows.length > 0 && rows.every((s) => s.payment === "Paid");

  useLayoutEffect(() => {
    let measuredWidth = 0;
    let rowHeight = 48;
    const measure = () => {
      const table = tableHeadRef.current.closest("table");
      const width = table.getBoundingClientRect().width;
      if (width !== measuredWidth) {
        measuredWidth = width;
        rowHeight = 48;
      }
      // Keep the largest row at this width so pagination remains stable
      // when wrapped content moves onto or off the current page.
      for (const row of table.querySelectorAll("tbody tr")) {
        rowHeight = Math.max(rowHeight, row.getBoundingClientRect().height);
      }
      const top = tableHeadRef.current.getBoundingClientRect().bottom;
      setPageSize(
        window.innerWidth >= 1024
          ? Math.max(
              1,
              Math.min(
                5,
                Math.floor((window.innerHeight - top - 48) / rowHeight),
              ),
            )
          : 5,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(
      tableHeadRef.current.closest("main")?.firstElementChild ||
        tableHeadRef.current,
    );
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  function clearFilters() {
    setQuery("");
    setStatus("All");
    setDatePeriod("All dates");
    setServiceId("All");
    setPage(1);
  }

  return (
    <section
      aria-labelledby="earnings-heading"
      className="earnings-page space-y-3 pb-1 text-xs text-[#101828]"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div>
          <h1
            id="earnings-heading"
            className="text-2xl font-bold tracking-tight"
          >
            Earnings
          </h1>
          <p className="mt-0.5 text-xs text-[#001b85]">
            Track completed paid sessions, transferred payouts and payment
            shares.
          </p>
        </div>
      </div>

      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Earnings summary"
      >
        {[
          [
            Wallet,
            money(totals.gross),
            "Gross Session Amount",
            "100% collected",
            false,
          ],
          [
            UsersRound,
            money(totals.tutor),
            "Your Share (90%)",
            "Your fixed share",
            true,
          ],
          [
            ChartColumnIncreasing,
            money(totals.platform + totals.osas),
            "Platform Share (10%)",
            "Platform operations",
            true,
          ],
          [
            CalendarCheck,
            totals.count,
            "Earning Sessions",
            "Completed or transferred",
            false,
          ],
        ].map(([Icon, value, label, hint, gold]) => (
          <article
            key={label}
            className={`flex min-w-0 items-center gap-3 rounded-lg border p-4 ${label === "Your Share (90%)" ? "border-green-300 bg-green-50" : "border-[#e0e7f0] bg-white"}`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${gold ? "bg-amber-400" : "bg-green-800"}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="whitespace-nowrap text-lg font-bold tracking-tight text-black">
                {value}
              </p>
              <h2 className="mt-0.5 text-[11px] font-medium leading-4 text-[#001b85]">
                {label}
              </h2>
              <p className="mt-1 text-[10px] leading-4 text-[#455780]">
                {hint}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-[#eaf6ef] px-4 py-2">
        <Info className="h-6 w-6 shrink-0 text-green-800" />
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-green-900">
            <span>Your Share 90%</span>
            <span aria-hidden="true">|</span>
            <span>Platform 10%</span>
          </p>
          <p className="mt-1 text-[11px] text-[#263c73]">
            Example: PHP 500 Gross = PHP 450 Your Share + PHP 50 Platform
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">
          Transaction History
        </h2>
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_repeat(3,minmax(150px,1fr))]">
          <div className="relative min-w-44 flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#263c73]" />
            <input
              aria-label="Search transactions"
              placeholder="Search transactions..."
              className="h-9 w-full rounded-md border border-[#dce4ef] bg-white pl-9 pr-8 text-xs outline-none placeholder:text-[#455780] focus:border-green-700 focus:ring-1 focus:ring-green-700"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear transaction search"
                className="absolute right-0 top-0 grid h-9 w-8 place-items-center text-[#455780]"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <label className="relative min-w-40 flex-1 sm:w-44">
            <span className="sr-only">Date</span>
            <select
              aria-label="Transaction date"
              value={datePeriod}
              onChange={(event) => {
                setDatePeriod(event.target.value);
                setPage(1);
              }}
              className="h-9 w-full appearance-none rounded-md border border-[#dce4ef] bg-white pl-3 pr-8 text-xs outline-none focus:border-green-700"
            >
              {[
                ...earningsDateOptions,
                ...new Set(
                  data.sessions
                    .map((session) => session.date)
                    .filter(Boolean)
                    .sort()
                    .reverse(),
                ),
              ].map((period) => (
                <option key={period}>{period}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#455780]" />
          </label>
          <label className="relative min-w-40 flex-1 sm:w-44">
            <span className="sr-only">Services</span>
            <select
              aria-label="Transaction service"
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value);
                setPage(1);
              }}
              className="h-9 w-full appearance-none rounded-md border border-[#dce4ef] bg-white pl-3 pr-8 text-xs outline-none focus:border-green-700"
            >
              <option value="All">All Services</option>
              {data.services.map((service) => (
                <option key={service.id} value={String(service.id)}>
                  {service.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#455780]" />
          </label>
          <div className="relative min-w-40 flex-1 sm:w-44">
            <select
              aria-label="Payout status"
              className="h-9 w-full appearance-none rounded-md border border-[#dce4ef] bg-white pl-3 pr-8 text-xs font-medium outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {payoutStatusOptions.map((value) => (
                <option key={value} value={value}>
                  Payout Status: {value}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#455780]" />
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-[#e0e7f0] bg-white lg:block">
        <table
          aria-label="Transaction history"
          className="w-full min-w-[1000px] table-fixed border-collapse text-left text-xs"
        >
          <colgroup>
            {headers.map(([label, width]) => (
              <col key={label} style={{ width }} />
            ))}
          </colgroup>
          <thead ref={tableHeadRef} className="bg-[#f7f9fc]">
            <tr className="h-10">
              {headers.map(([label]) => (
                <th
                  key={label}
                  scope="col"
                  className="px-1.5 py-2 text-[9px] font-semibold leading-3"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {visible.map((s) => {
              const amounts = sessionAllocation(s);
              return (
                <tr
                  key={s.id}
                  className="h-12"
                  tabIndex={0}
                  aria-label={`View transaction ${s.transaction || s.id}`}
                  onClick={() => setSelected(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(s);
                    }
                  }}
                >
                  <th
                    scope="row"
                    className="break-words px-1.5 py-1.5 font-normal leading-[14px]"
                  >
                    {s.transaction || "—"}
                  </th>
                  <td className="break-words px-1.5 py-1.5 leading-[14px]">
                    {s.booking || "—"}
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Learner name={s.learner} />
                  </td>
                  <td className="break-words px-1.5 py-1.5 leading-[14px]">
                    {s.service}
                  </td>
                  <td className="px-1.5 py-1.5 leading-[14px]">
                    <time dateTime={s.date}>{sessionDate(s.date)}</time>
                  </td>
                  {["gross", "tutor", "platform"].map((share) => (
                    <td
                      key={share}
                      className={`whitespace-nowrap px-3 py-3 tabular-nums ${share === "tutor" ? "bg-green-50 font-bold text-green-800" : ""}`}
                    >
                      {money(
                        share === "platform"
                          ? amounts.platform + amounts.osas
                          : amounts[share],
                      )}
                    </td>
                  ))}
                  <td className="px-1.5 py-1.5">
                    <PayoutBadge session={s} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        aria-label="Transaction cards"
        className="grid gap-2 sm:grid-cols-2 lg:hidden"
      >
        {visible.map((s) => {
          const amounts = sessionAllocation(s);
          return (
            <article
              key={s.id}
              className="min-w-0 space-y-3 rounded-lg border border-[#e0e7f0] bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="break-all text-[11px] font-semibold">
                  {s.transaction || "Transaction pending"}
                </h3>
                <PayoutBadge session={s} />
              </div>
              <p className="break-all text-[11px] text-[#455780]">
                Booking: {s.booking || "—"}
              </p>
              <Learner name={s.learner} />
              <p className="break-words font-medium">{s.service}</p>
              <time
                dateTime={s.date}
                className="block text-[11px] text-[#455780]"
              >
                {sessionDate(s.date)}
              </time>
              <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                {[
                  ["Gross Amount", "gross"],
                  ["Your Share (90%)", "tutor"],
                  ["Platform Share (10%)", "platform"],
                ].map(([label, share]) => (
                  <div
                    key={share}
                    className={
                      share === "tutor"
                        ? "rounded-md bg-green-50 p-2 text-green-800"
                        : ""
                    }
                  >
                    <dt className="text-[10px] text-[#455780]">{label}</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {money(amounts[share])}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>

      {!rows.length && (
        <div className="grid justify-items-center gap-2 rounded-lg border border-[#e0e7f0] bg-white px-4 py-7 text-center">
          <CreditCard className="h-7 w-7 text-slate-400" />
          <p className="text-sm font-semibold">No transactions found</p>
          <p className="text-xs text-[#455780]">
            {query ||
            status !== "All" ||
            datePeriod !== "All dates" ||
            serviceId !== "All"
              ? "Try another search, date, service or payout status."
              : "Completed sessions and transferred payouts will appear here."}
          </p>
          {(query ||
            status !== "All" ||
            datePeriod !== "All dates" ||
            serviceId !== "All") && (
            <button type="button" className={button} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <footer className="flex min-h-8 flex-wrap items-center justify-between gap-2 text-[11px] text-[#001b85]">
        <p role="status" aria-live="polite">
          Showing {rows.length ? start + 1 : 0}–
          {Math.min(start + pageSize, rows.length)} of {rows.length}
          {paidResults ? " paid" : ""} sessions
        </p>
        <nav
          aria-label="Transaction pages"
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            aria-label="Previous transactions"
            className="grid h-7 w-7 place-items-center rounded border border-[#dce4ef] bg-white hover:bg-green-50 disabled:cursor-default disabled:text-slate-300"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {pageButtons.map((number) => (
            <button
              key={number}
              type="button"
              aria-label={`Go to transaction page ${number}`}
              aria-current={currentPage === number ? "page" : undefined}
              className={`grid h-7 min-w-7 place-items-center rounded border px-1.5 text-xs font-medium ${currentPage === number ? "border-green-800 bg-green-800 text-white" : "border-[#dce4ef] bg-white hover:bg-green-50"}`}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next transactions"
            className="grid h-7 w-7 place-items-center rounded border border-[#dce4ef] bg-white hover:bg-green-50 disabled:cursor-default disabled:text-slate-300"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      </footer>
      {selected && (
        <TransactionDetails
          session={selected}
          onClose={() => setSelected(null)}
          onSession={() => go("sessions", { sessionId: selected.id })}
        />
      )}
    </section>
  );
}
