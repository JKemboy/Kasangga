import PaymentDetails from "./PaymentDetails.jsx";
import UserExport from "./UserExport.jsx";
import { useState } from "react";
import {
  CreditCard,
  PhilippinePeso,
  UserRound,
  Landmark,
  PieChart,
  Check,
  Search,
  Download,
  CalendarDays,
  Filter,
  Info,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import {
  sessionAllocation,
  summarizeEarnings,
} from "../tutor/workspace/earnings.js";
import { money } from "../tutor/workspace/data.js";
import { dateLabel } from "./adminData.js";

const initialTransactions = [];
// Refund-review rows retain the original paid allocation, but are excluded from
// settled earnings until the review is resolved. This is reference data only.
const originalAllocation = (r) => sessionAllocation({ ...r, payment: "Paid" });
export default function AdminPayments() {
  const [transactions,setTransactions]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem('campustutor:admin-refund-reviews:v1'))||{};return initialTransactions.map(r=>({...r,...(saved[r.id]?{refundDecision:saved[r.id].refundDecision,history:saved[r.id].history}: {})}));}catch{return initialTransactions;}});
  function saveReview(updated){const next=transactions.map(r=>r.id===updated.id?updated:r);try{localStorage.setItem('campustutor:admin-refund-reviews:v1',JSON.stringify(Object.fromEntries(next.filter(r=>r.refundDecision).map(r=>[r.id,{refundDecision:r.refundDecision,history:r.history}]))));setTransactions(next);return true;}catch{return false;}}

  const [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [start, setStart] = useState("2026-09-01"),
    [end, setEnd] = useState("2026-09-30"),
    [dateOpen, setDateOpen] = useState(false),
    [filters, setFilters] = useState(false),
    [tutor, setTutor] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  const invalid = start && end && start > end;
  const period = invalid
    ? []
    : transactions.filter(
        (r) => (!start || r.date >= start) && (!end || r.date <= end),
      );
  const totals = summarizeEarnings(period);
  const filtered = period.filter(
    (r) =>
      (!status || r.payment === status) &&
      (!tutor || r.tutor === tutor) &&
      `${r.id} ${r.booking} ${r.learner} ${r.tutor}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 7, current * 7);
  const paidDate = (r) =>
    `${dateLabel(r.date)} · ${new Date(`${r.date}T${r.time}:00+08:00`).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true })}`;
  function change(setter, value) {
    setter(value);
    setPage(1);
    setNotice("");
  }
  function exportCsv() {
    const csv = [
      [
        "Transaction ID",
        "Booking ID",
        "Learner",
        "Tutor",
        "Gross Amount",
        "Original Tutor Share",
        "Original OSAS Share",
        "Original Platform Share",
        "Payment Method",
        "Payment Status",
        "Paid Date",
      ],
      ...filtered.map((r) => {
        const a = originalAllocation(r);
        return [
          r.id,
          r.booking,
          r.learner,
          r.tutor,
          r.amount,
          a.tutor,
          a.osas,
          a.platform,
          r.method,
          r.payment,
          paidDate(r),
        ];
      }),
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
    a.download = "admin-transactions-demo.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching transactions.`);
  }
  return (
    <section className="ad-page ap-payments">
      <div className="osas-heading">
        <div>
          <h1>
            Payments &amp; Transactions <CreditCard size={23} />
          </h1>
          <p>
            Monitor CampusTutor payments processed through GCash via PayMongo.
          </p>
        </div>
      </div>
      <div className="ap-metrics">
        {[
          [
            PhilippinePeso,
            "Gross Session Payments",
            money(totals.gross),
            "Completed and paid sessions",
          ],
          [
            UserRound,
            "Tutor Share (90%)",
            money(totals.tutor),
            "Allocated to tutors",
          ],
          [
            Landmark,
            "OSAS Share (5%)",
            money(totals.osas),
            "Institutional allocation",
          ],
          [
            PieChart,
            "Platform Revenue (5%)",
            money(totals.platform),
            "Platform allocation",
          ],
          [
            Check,
            "Successful Transactions",
            totals.count,
            "Paid records in selected period",
          ],
        ].map(([Icon, label, value, hint], i) => (
          <div key={label}>
            <span
              style={{
                background: [
                  "#006037",
                  "#0876ff",
                  "#ffb400",
                  "#7525d5",
                  "#005a31",
                ][i],
              }}
            >
              <Icon size={25} />
            </span>
            <div>
              <strong>{label}</strong>
              <b>{value}</b>
              <small>{hint}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="ad-toolbar">
        <div className="au-tabs">
          {["", "Paid", "Processing", "Failed", "Refund Review"].map((s) => (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => change(setStatus, s)}
            >
              {s || "All Transactions"}
            </button>
          ))}
        </div>
        <button
          className={button}
          aria-label="Transaction date range"
          onClick={() => setDateOpen(true)}
        >
          <CalendarDays size={14} />
          {start ? dateLabel(start) : "Any date"} –{" "}
          {end ? dateLabel(end) : "Any date"}
        </button>
        <span className="ap-method">GCash via PayMongo</span>
        <button
          className={button}
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <Filter size={14} />
          Filter
        </button>
        <UserExport kind="payments" rows={filtered} onCsv={exportCsv} onNotice={setNotice} />
      </div>
      <div className="ap-search">
        <label className="osas-search">
          <Search size={15} />
          <input
            aria-label="Search transactions"
            placeholder="Search transaction ID, booking ID, learner, or tutor..."
            value={query}
            onChange={(e) => change(setQuery, e.target.value)}
          />
        </label>
        {filters && (
          <>
            <select
              className={input}
              aria-label="Transaction tutor"
              value={tutor}
              onChange={(e) => change(setTutor, e.target.value)}
            >
              <option value="">All tutors</option>
              {[...new Set(transactions.map((r) => r.tutor))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <button
              className={button}
              onClick={() => {
                setStatus("");
                setTutor("");
                setQuery("");
                setStart("2026-09-01");
                setEnd("2026-09-30");
                setPage(1);
              }}
            >
              Reset filters
            </button>
          </>
        )}
      </div>
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      {invalid && (
        <p role="alert" className="text-xs text-red-600">
          The end date must be on or after the start date.
        </p>
      )}
      <div className="ap-table">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {[
                  "Transaction ID",
                  "Booking ID",
                  "Learner",
                  "Tutor",
                  "Gross Amount",
                  "Tutor Share (90%)",
                  "OSAS Share (5%)",
                  "Platform Share (5%)",
                  "Payment Method",
                  "Payment Status",
                  "Paid Date",
                  "Action",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const a = originalAllocation(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <b>{r.id}</b>
                    </td>
                    <td>{r.booking}</td>
                    <td>
                      <div className="ap-person">
                        <Avatar name={r.learner} />
                        <span>{r.learner}</span>
                      </div>
                    </td>
                    <td>
                      <div className="ap-person">
                        <Avatar name={r.tutor} />
                        <span>{r.tutor}</span>
                      </div>
                    </td>
                    <td>{money(r.amount)}</td>
                    <td>{money(a.tutor)}</td>
                    <td>{money(a.osas)}</td>
                    <td>{money(a.platform)}</td>
                    <td>{r.method}</td>
                    <td>
                      <span
                        className={`au-status ${r.payment === "Paid" ? "active" : "restricted"}`}
                      >
                        {r.payment}
                      </span>
                    </td>
                    <td>{paidDate(r)}</td>
                    <td>
                      <button
                        className={button}
                        aria-label={`View ${r.id}`}
                        onClick={() => setSelected(r)}
                      >
                        View Transaction
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-7 text-center text-xs text-slate-500">
              No matching transactions. Try another status or reset your
              filters.
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
              aria-label="Previous transaction page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </button>
            <span>{current}</span>
            <button
              className={button}
              aria-label="Next transaction page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <p className="ad-banner flex items-start gap-2">
        <Info size={16} className="shrink-0" />
        Demo transaction references; live payment confirmations are not
        connected. Refund-review rows show original allocations and are excluded
        from settled summary totals. Cancellation does not automatically
        guarantee a refund.
      </p>
      {dateOpen && (
        <Modal
          title="Transaction Date Range"
          onClose={() => setDateOpen(false)}
        >
          <div className="space-y-3 text-xs">
            <label className="block">
              From
              <input
                aria-label="Payment start date"
                className={input}
                type="date"
                value={start}
                onChange={(e) => change(setStart, e.target.value)}
              />
            </label>
            <label className="block">
              To
              <input
                aria-label="Payment end date"
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
      {selected && <PaymentDetails record={transactions.find(r=>r.id===selected.id)||selected} onSave={saveReview} onClose={()=>setSelected(null)} />}
    </section>
  );
}
