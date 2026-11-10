import SessionDetailRows from "../../shared/SessionDetailRows.jsx";
import SessionCompletionProof from "../../shared/SessionCompletionProof.jsx";
import { useState } from "react";
import { Info, TriangleAlert, Video } from "lucide-react";
import {
  Avatar,
  Badge,
  button,
  primary,
  input,
} from "../../tutor/workspace/ui.jsx";
import { meetingUrl } from "../../tutor/workspace/sessionActions.js";
import "./session-dialogs.css";
const cash = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value) || 0,
  );
export function sessionInfo(r) {
  const d = r.details || [];
  return {
    ...r,
    name: r.name || d[3] || "Tutor",
    course: r.course || d[4],
    service: r.service || r.subject || d[7],
    topic: r.topic || d[8],
    date: r.date || d[9],
    time: r.time || d[11],
    type: r.type || d[12],
    platform: r.platform || d[13],
    amount: r.amount ?? Number(String(d[14] || "").replace(/[^\d.]/g, "")),
    duration: r.duration || 1.5,
    bookingId: r.bookingId || String(r.id),
    status:
      r.bookingStatus ||
      (["Cancelled", "Completed"].includes(r.lifecycle)
        ? r.lifecycle
        : "Confirmed"),
  };
}
function Rows({ rows }) {
  return (
    <dl className="ls-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "Not available"}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function SessionDialog({
  kind,
  record,
  onClose,
  onOpen,
  onMessage,
  onCancel,
  onRequest,
}) {
  const r = sessionInfo(record);
  const bookingStatus = r.status;
  const [reason, setReason] = useState(""),
    [notes, setNotes] = useState(""),
    [ack, setAck] = useState(false),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false);
  const active =
    r.canManage && !["Completed", "Cancelled"].includes(r.lifecycle);
  const link = meetingUrl(r.link);
  async function submitAction() {
    if (busy) return;
    if (kind === "cancel" && (!active || !reason || !ack)) return;
    setBusy(true);
    setActionError("");
    try {
      if (kind === "cancel")
        await onCancel({ reason, notes: notes.trim(), acknowledged: ack });
    } catch (error) {
      setActionError(error.message || "Unable to save this session request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`ls-flow${kind === "cancel" ? " ls-cancel-flow" : ""}`}>
      <div className="ls-content">
        {kind === "details" ? (
          <>
            <div className="session-person">
              <Avatar name={r.name} />
              <div>
                <strong>{r.name}</strong>
                <small>{r.course}</small>
              </div>
              <Badge>{bookingStatus}</Badge>
            </div>
            <SessionDetailRows
              rows={[
                ["Booking ID", r.bookingId],
                ["Tutor", r.name],
                ["Service", r.course || r.service],
                ["Specific Topic", r.topic],
                ["Date", r.date],
                ["Time", r.time],
                ["Duration", Math.round(Number(r.duration) * 60) + " min"],
                [
                  "Session Type",
                  [r.type, r.type === "Online" ? r.platform : r.venue]
                    .filter(Boolean)
                    .join(" - "),
                ],
                ["Amount", cash(r.amount)],
                [
                  "Booking Status",
                  <Badge key="booking">{bookingStatus}</Badge>,
                ],
                [
                  "Payment Status",
                  <Badge key="payment">{r.paymentStatus}</Badge>,
                ],
              ]}
            />
            {r.completionProof && (
              <SessionCompletionProof
                bookingId={r.bookingId}
                proof={r.completionProof}
                onConfirmed={() =>
                  onOpen("review", {
                    ...record,
                    lifecycle: "Completed",
                    bookingStatus: "Completed",
                  })
                }
              />
            )}
            {r.type === "Online" && (
              <>
                <h3 className="session-section-title">External meeting</h3>
                <div className="session-meeting">
                  <Video />
                  <div>
                    <strong>{r.platform || "Meeting platform"}</strong>
                    <p>{link || "Meeting link not provided yet."}</p>
                  </div>
                  {active && (
                    <button
                      className={primary}
                      onClick={() => onOpen("meeting", record)}
                    >
                      Open External Meeting
                    </button>
                  )}
                </div>
                <p className="session-muted">
                  Kasangga has no built-in video or voice calls.
                </p>
              </>
            )}
            <h3 className="session-section-title">Payment</h3>
            <SessionDetailRows
              rows={[
                ["Rate", r.rate ? cash(r.rate) + " / hour" : "Not available"],
                ["Payment method", r.paymentMethod || "Not provided"],
                ["Transaction ID", r.transactionId || "Not available"],
                ["Booked on", r.bookedOn || "Not available"],
              ]}
            />
            {r.review && (
              <>
                <h3 className="session-section-title">Your review</h3>
                <p className="text-amber-500">
                  {"\u2605".repeat(Number(r.review.rating))}
                </p>
                <p>{r.review.text}</p>
              </>
            )}
          </>
        ) : kind === "cancel" ? (
          <>
            <Rows
              rows={[
                ["Booking", `BK-${String(r.bookingId).replace(/^BK-/, "")}`],
                [
                  "Session",
                  `${r.name}, ${[r.service || r.course, r.topic].filter(Boolean).join(" - ")}`,
                ],
                ["Schedule", `${r.date}, ${r.time}`],
                ["Amount", `${cash(r.amount)} (${r.paymentStatus})`],
              ]}
            />
            <label className="ls-field">
              Reason for cancelling
              <select
                className={input}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">Select a reason</option>
                {[
                  "Schedule conflict",
                  "Personal emergency",
                  "No longer need the session",
                  "Other",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="ls-field">
              Notes (optional)
              <textarea
                className={input}
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="ls-alert danger">
              <TriangleAlert size={23} />
              <div>
                <strong>
                  Cancellation does not automatically guarantee a refund. If you
                  do not attend the scheduled session, your absence does not
                  qualify for a refund.
                </strong>
                <p>
                  Refund eligibility is reviewed based on how close to the
                  session you cancel and the reason given. Any approved refund
                  goes back through the original payment method via PayMongo.
                  Payment status stays unchanged until a refund is verified.
                </p>
              </div>
            </div>
            <label className="ls-check">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              I understand that cancelling may not result in a refund.
            </label>
          </>
        ) : null}

        {kind === "cancel" && actionError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </div>
      <footer className="ls-footer">
        {kind === "details" ? (
          <>
            <button
              className={button + " report-issue-button"}
              onClick={() => onOpen("report", record)}
            >
              Report an Issue
            </button>
            {active && r.lifecycle === "Upcoming" && (
              <button
                className="ls-danger"
                onClick={() => onOpen("cancel", record)}
              >
                Cancel Session
              </button>
            )}
            {r.canManage && (
              <button
                className={button}
                onClick={() =>
                  onMessage({ name: r.name, bookingId: r.bookingId })
                }
              >
                Message Tutor
              </button>
            )}
            {r.lifecycle === "Completed" && (
              <button
                className={button}
                onClick={() => onOpen("review", record)}
              >
                {r.review ? "Edit Review" : "Rate & Review"}
              </button>
            )}
          </>
        ) : (
          <>
            <button className={button} onClick={onClose}>
              {kind === "cancel" ? "Keep Session" : "Cancel"}
            </button>
            <button
              className={kind === "cancel" ? "ls-danger solid" : primary}
              disabled={busy || !active || !reason || !ack}
              onClick={submitAction}
            >
              {busy ? "Saving..." : "Cancel Session"}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
