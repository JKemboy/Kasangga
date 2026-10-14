import { useEffect, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import {
  Avatar,
  Badge,
  button,
  primary,
  input,
} from "../../tutor/workspace/ui.jsx";
import { meetingUrl } from "../../tutor/workspace/sessionActions.js";
import { chatRequest } from "../../../services/bookingMessages.js";
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
  const bookingStatus = r.status === "Completed" ? "Done" : r.status;
  const [reason, setReason] = useState(""),
    [notes, setNotes] = useState(""),
    [ack, setAck] = useState(false),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [slots, setSlots] = useState([]),
    [loadingSlots, setLoadingSlots] = useState(false),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (kind !== "reschedule") return;
    let live = true;
    setLoadingSlots(true);
    setActionError("");
    chatRequest("chat_reschedule_options", {
      p_booking_id: Number(r.bookingId),
    })
      .then((rows) => {
        if (live)
          setSlots(
            (rows || []).map((row) => ({
              date: row.session_date,
              time: String(row.start_time).slice(0, 5),
              end: String(row.end_time).slice(0, 5),
            })),
          );
      })
      .catch((error) => {
        if (live) setActionError(error.message);
      })
      .finally(() => {
        if (live) setLoadingSlots(false);
      });
    return () => {
      live = false;
    };
  }, [kind, r.bookingId]);
  const dates = [...new Set(slots.map((s) => s.date))];
  const active =
    r.canManage && !["Completed", "Cancelled"].includes(r.lifecycle);
  const link = meetingUrl(r.link);
  async function submitAction() {
    setBusy(true);
    setActionError("");
    try {
      if (kind === "cancel") await onCancel({ reason, notes });
      else await onRequest({ date, time, reason: reason.trim() });
    } catch (error) {
      setActionError(error.message || "Unable to save this session request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ls-flow">
      <div className="ls-content">
        {kind === "details" ? (
          <>
            <div className="ls-tutor">
              <Avatar name={r.name} />
              <div>
                <strong>{r.name}</strong>
                <small>{r.course}</small>
              </div>
              <Badge>{bookingStatus}</Badge>
            </div>
            <Rows
              rows={[
                ["Booking ID", r.bookingId],
                ["Tutor", r.name],
                ["Service", r.service],
                ["Specific Topic", r.topic],
                ["Date", r.date],
                ["Time", r.time],
                ["Duration", `${r.duration} hours`],
                ["Session Type", r.type],
                [
                  r.type === "Online" ? "Meeting platform" : "Location",
                  r.platform,
                ],
                ...(r.type === "Online"
                  ? [
                      [
                        "Meeting link",
                        link && !active ? (
                          <span className="text-slate-500">
                            {link} (no longer active)
                          </span>
                        ) : link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link}
                          </a>
                        ) : (
                          "Not shared yet"
                        ),
                      ],
                    ]
                  : []),
                ["Rate", r.rate ? `${cash(r.rate)} / hour` : "Not available"],
                ["Amount", cash(r.amount)],
                ["Booking Status", bookingStatus],
                [
                  "Payment Status",
                  <Badge key="payment">{r.paymentStatus}</Badge>,
                ],
                ["Payment method", r.paymentMethod],
                ["Transaction ID", r.transactionId],
                ["Booked on", r.bookedOn],
                ...(r.review
                  ? [
                      [
                        "Your review",
                        <div>
                          <span className="text-amber-500">
                            {"\u2605".repeat(Number(r.review.rating))}
                          </span>
                          <p>{r.review.text}</p>
                        </div>,
                      ],
                    ]
                  : []),
              ]}
            />
          </>
        ) : kind === "cancel" ? (
          <>
            <Rows
              rows={[
                ["Booking", r.bookingId],
                ["Session", `${r.name}, ${r.service} - ${r.topic || ""}`],
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
                  Cancellation does not automatically guarantee a refund.
                </strong>
                <p>
                  Refund eligibility is reviewed based on how close to the
                  session you cancel and the reason given. Payment status stays
                  unchanged until a refund is verified.
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
        ) : (
          <>
            <div className="ls-alert">
              <Info size={23} />
              <p>
                This sends a request to {r.name}. Your booking stays on the
                current schedule unless the tutor approves.
              </p>
            </div>
            <Rows
              rows={[
                ["Booking", `${r.bookingId}, ${r.service} - ${r.topic || ""}`],
                ["Current schedule", `${r.date}, ${r.time}`],
              ]}
            />
            <label className="ls-field">
              {dates.length
                ? "Choose a new date from the tutor's availability"
                : "Preferred new date"}
            </label>
            {dates.length ? (
              <>
                <div className="ls-dates">
                  {dates.map((d) => (
                    <button
                      key={d}
                      className={date === d ? primary : button}
                      onClick={() => {
                        setDate(d);
                        setTime("");
                      }}
                    >
                      {new Date(d + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </button>
                  ))}
                </div>
                <div className="ls-dates">
                  {slots
                    .filter((s) => s.date === date)
                    .map((s) => (
                      <button
                        type="button"
                        key={s.time}
                        className={time === s.time ? primary : button}
                        onClick={() => setTime(s.time)}
                      >
                        {s.time} – {s.end}
                      </button>
                    ))}
                </div>
              </>
            ) : (
              <p role={loadingSlots ? "status" : "alert"} className="ls-muted">
                {loadingSlots
                  ? "Loading available times..."
                  : "No bookable reschedule slots are available. Ask your tutor to add availability."}
              </p>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-red-700">
                {actionError}
              </p>
            )}
            <label className="ls-field">
              Reason
              <textarea
                className={input}
                rows={3}
                maxLength={2000}
                placeholder="Let your tutor know why you need a new time (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <footer className="ls-footer">
        {kind === "details" ? (
          <>
            <button className={button} onClick={() => onOpen("report", record)}>
              Report an Issue
            </button>
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
              disabled={
                busy ||
                !active ||
                (kind === "cancel"
                  ? !reason || !ack
                  : !date ||
                    !time ||
                    reason.trim().length < 10 ||
                    loadingSlots ||
                    !slots.some(
                      (option) => option.date === date && option.time === time,
                    ) ||
                    !(new Date(`${date}T${time}:00+08:00`) > new Date()))
              }
              onClick={submitAction}
            >
              {busy
                ? "Saving..."
                : kind === "cancel"
                  ? "Cancel Session"
                  : "Send Reschedule Request"}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
