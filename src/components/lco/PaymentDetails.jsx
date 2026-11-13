import TransferAccountSummary from "./TransferAccountSummary.jsx";
import {
  paymentAllocation,
  timestampLabel,
} from "../../services/lcoRecords.js";
import { useLcoDatabase, useLcoRecordSeen } from "./LcoDatabaseContext.jsx";
import { useEffect, useState } from "react";
import { Panel } from "./UserDetails.jsx";
import { Modal, button, primary, input } from "../shared/staffUi.jsx";
import BookingDetails from "./BookingDetails.jsx";
import { money } from "../tutor/workspace/data.js";
import { dateLabel } from "./lcoData.js";
import { paymentBookings, refundDecision } from "./paymentDetailsData.js";
import "./booking-details.css";
import {
  markRefundTransferred,
  loadRefundGcashAccount,
} from "../../services/lcoDatabase.js";
export default function PaymentDetails({
  record: r,
  onSave,
  onClose,
  initialAction = "",
}) {
  useLcoRecordSeen("payments", r.id);
  useLcoRecordSeen("refunds", r.refundId);
  const [bookingOpen, setBookingOpen] = useState(false),
    [action, setAction] = useState(initialAction),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  const { database, refresh } = useLcoDatabase();
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [gcash, setGcash] = useState(null);
  const [gcashError, setGcashError] = useState("");
  const [gcashRevision, setGcashRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setGcash(null);
    setGcashError("");
    if (r.refundId)
      loadRefundGcashAccount(r.refundId)
        .then((account) => {
          if (active) setGcash({ ...account, refundId: r.refundId });
        })
        .catch((cause) => {
          if (active) setGcashError(cause.message);
        });
    return () => {
      active = false;
    };
  }, [r.refundId, gcashRevision]);
  const refundGcash = (
    <section aria-label="Learner refund GCash account">
      <h4>Learner GCash account for refund</h4>
      {gcashError ? (
        <p role="alert">
          {gcashError}{" "}
          <button
            type="button"
            className={button}
            onClick={() => setGcashRevision((v) => v + 1)}
          >
            Retry
          </button>
        </p>
      ) : !gcash || gcash.refundId !== r.refundId ? (
        <p role="status">Loading saved GCash account...</p>
      ) : (
        <>
          <dl>
            <div>
              <dt>GCash account name</dt>
              <dd>{gcash.name || "Not provided"}</dd>
            </div>
            <div>
              <dt>GCash number</dt>
              <dd>{gcash.number || "Not provided"}</dd>
            </div>
          </dl>
          {(!gcash.name || !gcash.number) && (
            <p className="abd-muted">
              The learner has not saved complete GCash details in their account.
            </p>
          )}
        </>
      )}
    </section>
  );
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
      className={`au-status ${["Paid", "Refunded", "Partially Refunded"].includes(r.payment) ? "active" : "restricted"}`}
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
    <>
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
                <button
                  className="abd-link"
                  onClick={() => setBookingOpen(true)}
                >
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
                  ["Platform share (10%)", split.platform],
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
                  "Cancellation does not automatically guarantee a refund. A learner who misses the scheduled session is not eligible for a refund for their own absence. Confirm attendance circumstances before deciding.",
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v || "Not recorded"}</dd>
                </div>
              ))}
            </dl>
            {r.refundDecision && <p>Decision note: {r.refundDecision.note}</p>}
            {refundGcash}
            <p className="abd-muted">
              Original allocation is a reference. Provider refund processing is
              separate from this review.
            </p>
          </section>
        )}
        <p className="aid-info">
          Payment confirmations come from the database. Refund decisions are
          saved for review; provider refund processing is a separate operation.
        </p>
      </Panel>
      {action && (
        <Modal
          title={
            action === "Transferred"
              ? "Record Refund Transfer"
              : `${action === "Approved" ? "Approve" : "Decline"} Refund`
          }
          subtitle={`${r.id} · ${money(r.amount)} · ${r.learner}`}

          onClose={() => setAction("")}
        >
          <form
            className={
              action === "Transferred" ? "space-y-4 text-sm" : "ud-form"
            }
            onSubmit={save}
          >
            {action === "Transferred" ? (
              <>
                <TransferAccountSummary
                  label="Learner"
                  recipient={r.learner}
                  amount={r.refundAmount}
                  account={gcash?.refundId === r.refundId ? gcash : null}
                  loading={!gcash && !gcashError}
                />
                {gcashError && (
                  <p role="alert" className="text-red-600">
                    {gcashError}{" "}
                    <button
                      type="button"
                      className={button}
                      onClick={() => setGcashRevision((v) => v + 1)}
                    >
                      Retry
                    </button>
                  </p>
                )}
                {gcash && (!gcash.name || !gcash.number) && (
                  <p className="text-amber-800">
                    Ask the learner to save their GCash account details before
                    sending a refund.
                  </p>
                )}
                <label>
                  Transfer reference (optional)
                  <input
                    className={input}
                    maxLength={150}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    required
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>
                    I confirm the learner received the refund, or this is a TEST
                    MODE simulation.
                  </span>
                </label>
                {error && <p role="alert">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={button}
                    onClick={() => setAction("")}
                  >
                    Cancel
                  </button>
                  <button className={primary} disabled={saving || !confirmed}>
                    {saving ? "Saving..." : "Confirm Transfer"}
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
    </>
  );
}
