import { matchesAdminTransaction } from "../../services/adminTransactionFilters.js";
// Payments & Transactions: presents payment records and delegates allowed payment actions to database-backed services.
import { markPaymentTransferred } from "../../services/adminDatabase.js";
import {
  paymentAllocation,
  summarizePayments,
  timestampLabel,
} from "../../services/adminRecords.js";
import { useAdminDatabase } from "./AdminDatabaseContext.jsx";
import PaymentDetails from "./PaymentDetails.jsx";
import UserExport from "./UserExport.jsx";
import { useEffect, useState } from "react";
import {
  CreditCard,
  PhilippinePeso,
  UserRound,
  Landmark,
  PieChart,
  Check,
  Download,
  CalendarDays,
  Info,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import { money } from "../tutor/workspace/data.js";
import { dateLabel } from "./adminData.js";

const initialTransactions = [];
// Refund-review rows retain the original paid allocation, but are excluded from
// settled earnings until the review is resolved. This is reference data only.
const originalAllocation = paymentAllocation;
export default function AdminPayments({
  searchQuery = "",
  onQueryChange = () => {},
}) {
  const { database, saveRecord, refresh } = useAdminDatabase();
  const transactions = database?.transactionRecords || database?.payments || [];
  const [transferring, setTransferring] = useState(null),
    [transferred, setTransferred] = useState([]),
    [transferMessage, setTransferMessage] = useState(""),
    [transferError, setTransferError] = useState("");
  useEffect(() => {
    if (!transferMessage) return;
    const timer = setTimeout(() => setTransferMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [transferMessage]);
  async function recordTransfer(record) {
    if (transferring || record.transferredAt || transferred.includes(record.id))
      return;
    setTransferring(record.id);
    setTransferError("");
    try {
      await markPaymentTransferred(record.id, null, true);
      setTransferred((current) => [...current, record.id]);
      setTransferMessage(
        "Payout of " +
          money(originalAllocation(record).tutor) +
          " to " +
          record.tutor +
          " marked as transferred.",
      );
      await refresh();
    } catch (error) {
      setTransferError(error.message);
    } finally {
      setTransferring(null);
    }
  }
  async function saveReview(updated) {
    return saveRecord("refunds", updated);
  }
  const [status, setStatus] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [dateOpen, setDateOpen] = useState(false),
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
  const totals = summarizePayments(period);
  const filtered = period.filter(
    (r) =>
      matchesAdminTransaction(r, status, transferred) &&
      (!tutor || r.tutor === tutor) &&
      `${r.id} ${r.booking} ${r.learner} ${r.tutor}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 7, current * 7);
  const paidDate = (r) => timestampLabel(r.paidAt);
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
    a.download = "admin-transactions.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} matching transactions.`);
  }
  return (
    <section className="ad-page ap-payments">
      {transferMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[100] flex max-w-[calc(100vw-3rem)] items-center gap-3 rounded-lg bg-[#102d1e] px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Check size={16} className="shrink-0 text-yellow-400" />
          <span>{transferMessage}</span>
        </div>
      )}
      {transferError && (
        <p role="alert" className="text-sm text-red-700">
          {transferError}
        </p>
      )}
      <div className="osas-heading">
        <div>
          <h1>
            Payments &amp; Transactions <CreditCard size={23} />
          </h1>
          <p>Monitor Kasangga payments processed through GCash via PayMongo.</p>
        </div>
      </div>
      <div className="ap-metrics">
        {[
          [
            PhilippinePeso,
            "Gross Session Payments",
            money(totals.gross),
            "Verified paid transactions",
          ],
          [
            UserRound,
            "Tutor Share",
            money(totals.tutor),
            "Allocated to tutors",
          ],
          [
            Landmark,
            "OSAS Share",
            money(totals.osas),
            "Institutional allocation",
          ],
          [
            PieChart,
            "Platform Revenue",
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
        <div className="ap-transaction-selects">
          <select
            aria-label="Transaction status"
            className={input}
            value={status}
            onChange={(e) => change(setStatus, e.target.value)}
          >
            <option value="">All Transactions</option>
            {[
              "Paid",
              "Transferred",
              "Processing",
              "Failed",
              "Refund Review",
              "Refunded",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="Transaction tutor"
            className={input}
            value={tutor}
            onChange={(e) => change(setTutor, e.target.value)}
          >
            <option value="">All Tutors</option>
            {[
              ...new Set(
                transactions.map((record) => record.tutor).filter(Boolean),
              ),
            ]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
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
          type="button"
          className={button}
          onClick={() => {
            setStatus("");
            setTutor("");
            onQueryChange("");
            setStart("");
            setEnd("");
            setPage(1);
          }}
        >
          Reset filters
        </button>
        <UserExport
          kind="payments"
          rows={filtered}
          onCsv={exportCsv}
          onNotice={setNotice}
        />
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
                  "Tutor Share",
                  "OSAS Share",
                  "Platform Share",
                  "Payment Method",
                  "Payment Status",
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
                    <td>
                      <button
                        className={button}
                        aria-label={`View ${r.id}`}
                        onClick={() => setSelected(r)}
                      >
                        View Transaction
                      </button>
                      <button
                        className={button + " ml-2"}
                        disabled={
                          r.refundStatus === "approved"
                            ? !!transferring
                            : r.refundStatus === "processed" ||
                              !!r.transferredAt ||
                              transferred.includes(r.id) ||
                              !!transferring ||
                              r.paymentStatus !== "paid" ||
                              ["pending", "approved"].includes(r.refundStatus)
                        }
                        onClick={() =>
                          r.refundStatus === "approved"
                            ? setSelected({
                                ...r,
                                initialAction: "Transferred",
                              })
                            : recordTransfer(r)
                        }
                      >
                        {r.refundStatus === "processed"
                          ? "Refund Transferred"
                          : r.refundStatus === "approved"
                            ? "Mark as Transferred"
                            : r.transferredAt || transferred.includes(r.id)
                              ? "Transferred"
                              : transferring === r.id
                                ? "Saving..."
                                : "Mark as Transferred"}
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
        Database payment records. Paid totals include confirmed and completed
        sessions; pending refund reviews are excluded. Shares without a stored
        allocation are marked as estimates.
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
      {selected && (
        <PaymentDetails
          initialAction={selected.initialAction}
          record={transactions.find((r) => r.id === selected.id) || selected}
          onSave={saveReview}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
