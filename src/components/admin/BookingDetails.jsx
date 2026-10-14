import {
  paymentAllocation,
  timestampLabel,
} from "../../services/adminRecords.js";
import { useEffect, useRef, useState } from "react";
import {
  X,
  LockKeyhole,
  CreditCard,
  CalendarDays,
  TriangleAlert,
} from "lucide-react";
import { button, primary } from "../tutor/workspace/ui.jsx";
import { money } from "../tutor/workspace/data.js";
import { dateLabel } from "./adminData.js";
import "./incident-details.css";
import "./booking-details.css";

export function paymentSplit(amount) {
  const gross = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(gross) || gross < 0) return null;
  const tutor = Math.round(gross * 0.9),
    osas = Math.round(gross * 0.05);
  return {
    gross: gross / 100,
    tutor: tutor / 100,
    osas: osas / 100,
    platform: (gross - tutor - osas) / 100,
  };
}
export default function BookingDetails({
  record: r,
  tutor,
  incidents = [],
  onClose,
  onIncident,
}) {
  const ref = useRef(null);
  const [transaction, setTransaction] = useState(false);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  const badge = (value) => (
    <span
      className={`au-status ${["Confirmed", "Completed", "Paid"].includes(value) ? "active" : value === "Cancelled" ? "suspended" : "restricted"}`}
    >
      {value || "Unavailable"}
    </span>
  );
  const booking = r.booking || r.id;
  const related = incidents.filter((i) => i.booking === booking);
  const underReview = related.filter((i) =>
    ["Pending Review", "Under Admin Review"].includes(i.status),
  );
  const sessionEnded =
    Number.isFinite(Date.parse(r.date + "T" + r.end + ":00+08:00")) &&
    Date.parse(r.date + "T" + r.end + ":00+08:00") < Date.now();
  const duration =
    r.start && r.end
      ? (Number(r.end.slice(0, 2)) * 60 +
          Number(r.end.slice(3)) -
          (Number(r.start.slice(0, 2)) * 60 + Number(r.start.slice(3)))) /
        60
      : null;
  const clock = (value) => {
    if (!value) return "Unavailable";
    const [h, m] = value.split(":");
    return `${Number(h) % 12 || 12}:${m} ${Number(h) >= 12 ? "PM" : "AM"}`;
  };
  const split = paymentAllocation({
    ...r,
    paymentStatus: (r.transactionStatus || r.payment || "").toLowerCase(),
    amount: r.transactionAmount ?? r.amount,
  });
  const txLink = r.transaction ? (
    <button className="abd-link" onClick={() => setTransaction(true)}>
      {r.transaction}
    </button>
  ) : (
    "Unavailable"
  );
  const facts = transaction
    ? [
        ["Transaction ID", r.transaction],
        ["PayMongo reference", r.paymongoReference || r.reference],
        [
          "Booking ID",
          <button className="abd-link" onClick={() => setTransaction(false)}>
            {booking}
          </button>,
        ],
        ["Learner", r.learner],
        ["Tutor", r.tutor || tutor],
        ["Service", r.service],
        ["Payment method", r.paymentMethod],
        ["Payment Status", badge(r.transactionStatus || r.payment)],
        ["Paid Date", timestampLabel(r.paidAt)],
      ]
    : [
        ["Booking ID", booking],
        ["Learner", r.learner],
        ["Tutor", r.tutor || tutor],
        ["Service", r.service],
        ["Specific Topic", r.topic],
        ["Date", dateLabel(r.date)],
        ["Time", `${clock(r.start)} – ${clock(r.end)}`],
        [
          "Duration",
          duration > 0
            ? `${duration} ${duration === 1 ? "hour" : "hours"}`
            : null,
        ],
        ["Session Type", r.type],
        ["External Platform", r.provider],
        ["Amount", money(r.amount)],
        ["Booking Status", badge(r.status)],
        ["Payment Status", badge(r.payment)],
        ["Transaction ID", txLink],
        ["Payment", r.paymentMethod],
      ];
  return (
    <dialog
      ref={ref}
      className="admin-incident-details admin-booking-details"
      aria-labelledby="admin-booking-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <div>
          <h2 id="admin-booking-title">
            {transaction ? r.transaction : booking}{" "}
            {!transaction && badge(r.status)} {badge(r.payment)}
          </h2>
          <p>
            {transaction
              ? r.paymentMethod || "Payment record"
              : "Booking status and payment status are tracked separately."}
          </p>
        </div>
        <button
          className={button}
          aria-label="Close booking details"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </header>
      <div className="aid-body">
        <dl>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Unavailable"}</dd>
            </div>
          ))}
        </dl>
        {transaction ? (
          <>
            <h3>Allocation</h3>
            {split ? (
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
                  {split.source}. Shares are shown in PHP.
                </p>
              </>
            ) : (
              <p>Allocation unavailable.</p>
            )}
            <div className="aid-info">
              <LockKeyhole size={19} />
              <p>
                Read-only database payment record. Refund reviews are separate
                from booking cancellations. This allocation does not confirm a
                payout.
              </p>
            </div>
          </>
        ) : (
          <>
            {r.status === "Cancelled" && (
              <section className="ud-status red">
                <h3>Cancellation</h3>
                <dl>
                  {[
                    ["Cancelled by", r.cancellation?.by],
                    ["When", r.cancellation?.at],
                    ["Reason", r.cancellation?.reason],
                    [
                      "Refund",
                      "Cancellation does not automatically guarantee a refund.",
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "Not recorded"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <h3>Reschedule requests</h3>
            {r.reschedules?.length ? (
              r.reschedules.map((request) => (
                <p key={request.id}>
                  {request.date} {request.start} - {request.end}:{" "}
                  {request.status}. {request.reason}
                </p>
              ))
            ) : (
              <p className="abd-muted">No reschedule requests recorded.</p>
            )}
            <h3>Learner reviews</h3>
            {r.reviews?.length ? (
              r.reviews.map((review) => (
                <p key={review.id}>
                  {review.score}/5 - {review.comment} (
                  {review.visible ? "Visible" : "Hidden"})
                </p>
              ))
            ) : (
              <p className="abd-muted">No learner review recorded.</p>
            )}
            <h3>Incident reports on this booking</h3>
            {related.length ? (
              related.map((i) => (
                <button
                  key={i.id}
                  className="abd-incident"
                  onClick={() => onIncident?.(i)}
                  disabled={!onIncident}
                >
                  <TriangleAlert size={21} />
                  <div>
                    <strong>{i.id}</strong> · {i.issue}
                    <small>
                      {i.type} · {i.status}
                    </small>
                  </div>
                  {badge(i.referral)}
                </button>
              ))
            ) : (
              <p className="abd-muted">No linked incident reports.</p>
            )}
            {r.status === "Confirmed" &&
              sessionEnded &&
              underReview.length > 0 && (
                <div className="aid-info !bg-amber-50">
                  The session time has passed. This booking is still Confirmed,
                  and {underReview.map((i) => i.id).join(", ")} is under review.
                </div>
              )}
          </>
        )}
      </div>
      <footer>
        {!transaction && (
          <span className="abd-muted">
            <LockKeyhole size={13} /> Monitoring only. Admin cannot reschedule
            or cancel bookings here.
          </span>
        )}
        <button
          className={button}
          disabled={!r.transaction}
          onClick={() => setTransaction(!transaction)}
        >
          {transaction ? <CalendarDays size={15} /> : <CreditCard size={15} />}
          Related {transaction ? "Booking" : "Transaction"}
        </button>
        <button className={primary} onClick={onClose}>
          Close
        </button>
      </footer>
    </dialog>
  );
}
