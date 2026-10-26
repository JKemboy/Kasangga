import {
  paymentAllocation,
  timestampLabel,
} from "../../services/adminRecords.js";
import { useAdminDatabase } from "./AdminDatabaseContext.jsx";
import { useState } from "react";
import { Panel } from "./UserDetails.jsx";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
import BookingDetails from "./BookingDetails.jsx";
import { money } from "../tutor/workspace/data.js";
import { dateLabel } from "./adminData.js";
import { paymentBookings, refundDecision } from "./paymentDetailsData.js";
import "./booking-details.css";
import { markRefundTransferred } from "../../services/adminDatabase.js";
export default function PaymentDetails({
  record: r,
  onSave,
  onClose,
  initialAction = "",
}) {
  const [bookingOpen, setBookingOpen] = useState(false),
    [action, setAction] = useState(initialAction),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  const { database, refresh } = useAdminDatabase();
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const incidents = database?.incidents || [];
  const workspace = { sessions: database?.sessions || [] };
  const booking =
    workspace.sessions.find((b) => b.booking === r.booking) ||
    paymentBookings[r.booking];
  const split = paymentAllocation(r);
  const pending = r.payment === "Refund Review" && !r.refundDecision;
  const paid = timestampLabel(r.paidAt);
  const badge = (
    <span
      className={`au-status ${r.payment === "Paid" ? "active" : "restricted"}`}
    >
      {r.payment}
    </span>
  );
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (action === "Transferred") {
        await markRefundTransferred(r.refundId, reference.trim(), confirmed);
        await refresh();
        setAction("");
        return;
      }
      const next = refundDecision(r, action, note);
      if (!(await onSave(next)))
        throw new Error(
          "The database did not confirm the save. Refresh and try again.",
        );
      setAction("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Panel
      title={
        <>
          {r.id} {badge}
        </>
      }
      subtitle={`${r.method} · ${paid}`}
      onClose={onClose}
      footer={
        <>
          <div className="ud-actions">
            {r.refundId && (
              <button
                className={primary}
                disabled={r.refundStatus !== "approved" || saving}
                onClick={() => {
                  setAction("Transferred");
                  setReference("");
                  setConfirmed(false);
                  setError("");
                }}
              >
                {r.refundStatus === "processed"
                  ? "Refund Transferred"
                  : "Mark as Transferred"}
              </button>
            )}
            {pending && (
              <>
                <button
                  className={`${button} text-red-600`}
                  onClick={() => {
                    setAction("Declined");
                    setNote("");
                    setError("");
                  }}
                >
                  Decline Refund
                </button>
                <button
                  className={primary}
                  onClick={() => {
                    setAction("Approved");
                    setNote("");
                    setError("");
                  }}
                >
                  Approve Refund
                </button>
              </>
            )}
            <button
              className={button}
              disabled={!booking}
              onClick={() => setBookingOpen(true)}
            >
              Related Booking
            </button>
          </div>
          <button className={button} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <dl>
        {[
          ["Transaction ID", r.id],
          ["PayMongo reference", r.reference],
          [
            "Booking ID",
            booking ? (
              <button className="abd-link" onClick={() => setBookingOpen(true)}>
                {r.booking}
              </button>
            ) : (
              r.booking
            ),
          ],
          ["Learner", r.learner],
          ["Tutor", r.tutor],
          ["Service", booking?.service || r.service],
          ["Payment method", r.method],
          ["Payment Status", badge],
          ["Paid Date", paid],
          ["Allocation source", split.source],
          [
            "Transfer status",
            r.transferredAt ? "Transferred" : "Not transferred",
          ],
          ...(r.transferredAt
            ? [
                ["Transferred at", timestampLabel(r.transferredAt)],
                ["Transferred by", r.transferredBy],
                ["Transfer reference", r.transferReference],
              ]
            : []),
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "Unavailable"}</dd>
          </div>
        ))}
      </dl>
      <h3>Allocation</h3>
      {split && (
        <>
          <table className="abd-allocation">
            <tbody>
              {[
                ["Gross Amount", split.gross],
                ["Tutor share", split.tutor],
                ["OSAS share", split.osas],
                ["Platform share", split.platform],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{money(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="abd-muted">
            {split.source}. This does not confirm a payout.
          </p>
        </>
      )}
      {r.refundId && (
        <section className="ud-status">
          <h3>
            Refund Request{" "}
            <span className="au-status restricted">
              {r.refundDecision ? `${r.refundDecision.decision}` : "Pending"}
            </span>
          </h3>
          <dl>
            {[
              ["Requested", timestampLabel(r.refundRequestedAt)],
              ["Amount", money(r.refundAmount)],
              ["Reason", r.refundReason],
              [
                "Refund transfer reference",
                r.refundTransferReference || "Not recorded",
              ],
              [
                "Refund transferred on",
                r.refundTransferredAt
                  ? timestampLabel(r.refundTransferredAt)
                  : "Not recorded",
              ],
              [
                "Policy",
                "Cancellation does not automatically guarantee a refund. Admin reviews the request.",
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "Not recorded"}</dd>
              </div>
            ))}
          </dl>
          {r.refundDecision && <p>Decision note: {r.refundDecision.note}</p>}
          <p className="abd-muted">
            Original allocation is a reference. Provider refund processing is
            separate from this review.
          </p>
        </section>
      )}
      <p className="aid-info">
        Payment confirmations come from the database. Refund decisions are saved
        for review; provider refund processing is a separate operation.
      </p>
      {action && (
        <Modal
          title={
            action === "Transferred"
              ? "Mark Refund as Transferred"
              : `${action === "Approved" ? "Approve" : "Decline"} Refund`
          }
          subtitle={`${r.id} · ${money(r.amount)} · ${r.learner}`}
          onClose={() => setAction("")}
        >
          <form className="ud-form" onSubmit={save}>
            {action === "Transferred" ? (
              <>
                <p className="aid-info">
                  Record a completed manual refund transfer. This button does
                  not send money through PayMongo. In TEST MODE, use a simulated
                  transfer reference.
                </p>
                <label>
                  Transfer reference
                  <input
                    className={input}
                    required
                    minLength={3}
                    maxLength={150}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    required
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I confirm the refund transfer is completed, or simulated in
                  TEST MODE.
                </label>
                {error && <p role="alert">{error}</p>}
                <div className="ud-actions">
                  <button
                    type="button"
                    className={button}
                    onClick={() => setAction("")}
                  >
                    Cancel
                  </button>
                  <button
                    className={primary}
                    disabled={
                      saving || !confirmed || reference.trim().length < 3
                    }
                  >
                    {saving ? "Saving..." : "Mark as Transferred"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="aid-info">
                  {action === "Approved"
                    ? "Record approval for this refund request. Payment-provider processing is not connected; the booking remains unchanged."
                    : "Record why this request does not meet refund policy. This does not change the provider payment status or execute an allocation."}
                </p>
                <label>
                  Decision note (required)
                  <textarea
                    className={input}
                    rows={4}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      action === "Approved"
                        ? "Why the refund is granted under policy."
                        : "Why the request does not meet refund policy."
                    }
                  />
                </label>
                <small>
                  {note.trim().length}/15 characters minimum · saved to the
                  database
                </small>
                {error && <p role="alert">{error}</p>}
                <div className="ud-actions">
                  <button
                    type="button"
                    className={button}
                    onClick={() => setAction("")}
                  >
                    Cancel
                  </button>
                  <button
                    className={primary}
                    disabled={saving || note.trim().length < 15}
                  >
                    {action === "Approved" ? "Approve" : "Decline"} Refund
                  </button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
      {bookingOpen && (
        <BookingDetails
          record={{
            ...booking,
            transaction: r.id,
            paymentMethod: r.method,
            transactionStatus: r.payment,
            paidAt: r.paidAt,
            reference: r.reference,
          }}
          tutor={r.tutor}
          incidents={incidents}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </Panel>
  );
}
