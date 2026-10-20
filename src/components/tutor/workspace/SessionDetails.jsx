import EvidencePicker from "../../shared/EvidencePicker.jsx";
import { useRef, useState } from "react";
import { ExternalLink, MessageCircle, Video, ShieldCheck } from "lucide-react";
import { Modal, Avatar, Badge, Field, button, primary, input } from "./ui.jsx";
import { money, hour, time } from "./data.js";
import { meetingUrl } from "./sessionActions.js";
import { chatRequest } from "../../../services/bookingMessages.js";
import { completeTutorSession } from "../../../services/tutorSessionCompletion.js";
import { sessionAllocation } from "./earnings.js";
import { submitIncidentReport } from "../../../services/incidentReports.js";

const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const range = (s) => `${time(hour(s.start))} – ${time(hour(s.end))}`;
function Details({ rows }) {
  return (
    <dl className="session-detail-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "Not available"}</dd>
        </div>
      ))}
    </dl>
  );
}
function Allocation({ session: s }) {
  const amounts =
    s.allocation ||
    (s.transferredAt
      ? sessionAllocation(s)
      : {
          gross: s.amount,
          tutor: s.amount * 0.9,
          osas: s.amount * 0.05,
          platform: s.amount * 0.05,
        });
  return (
    <div className="payment-allocation">
      {[
        ["Gross Amount", "gross"],
        ["Tutor (90%)", "tutor"],
        ["OSAS (5%)", "osas"],
        ["Platform (5%)", "platform"],
      ].map(([label, share]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{money(amounts[share])}</strong>
        </div>
      ))}
    </div>
  );
}
export function TransactionDetails({ session: s, onClose, onSession }) {
  return (
    <Modal
      title="Transaction Details"
      subtitle={s.transaction || "Transaction reference unavailable"}
      onClose={onClose}
      footer={
        <>
          <button className={button} onClick={onClose}>
            Close
          </button>
          <button className={button} onClick={onSession}>
            View Session
          </button>
        </>
      }
    >
      <Details
        rows={[
          ["Transaction ID", s.transaction],
          ["Booking ID", s.booking || s.id],
          ["Learner", s.learner],
          ["Service", `${s.service} · ${s.topic}`],
          ["Session", `${dateLabel(s.date)} · ${range(s)}`],
          ["Session Status", <Badge>{s.status}</Badge>],
        ]}
      />
      <h3 className="session-section-title">Allocation</h3>
      <Allocation session={s} />
      <h3 className="session-section-title">Payment</h3>
      <Details
        rows={[
          ["Method", s.paymentMethod || "Not provided"],
          ["Payment Reference", s.paymentReference],
          ["Paid On", s.paidAt],
          ["Payment Status", <Badge>{s.payment}</Badge>],
          [
            "Transfer Status",
            s.transferredAt ? "Transferred" : "Not transferred",
          ],
          [
            "Transferred On",
            s.transferredAt
              ? new Date(s.transferredAt).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                })
              : "Not transferred",
          ],
          [
            "Earnings Status",
            s.transferredAt
              ? "Payout marked as transferred by Admin"
              : s.status === "Completed"
                ? "Included in completed session earnings"
                : "Counted once the session is completed",
          ],
        ]}
      />
    </Modal>
  );
}
export default function SessionDetails({
  data,
  go,
  sessionId,
  onClose,
  initialAction = "",
  refreshSessions,
}) {
  const reportKey = useRef(crypto.randomUUID());
  const s = data.sessions.find((s) => s.id === sessionId);
  const [action, setAction] = useState(initialAction),
    [feedback, setFeedback] = useState(""),
    [transaction, setTransaction] = useState(false);
  const [actionOptions] = useState([]),
    [actionLoading, setActionLoading] = useState(false),
    [actionError, setActionError] = useState("");
  const [reason, setReason] = useState(""),
    [kind, setKind] = useState(""),
    [slot, setSlot] = useState(""),
    [files, setFiles] = useState([]);
  if (!s) return null;
  const active = ["Confirmed", "Pending"].includes(s.status),
    url = meetingUrl(s.meetingUrl || s.link),
    options = actionOptions;

  const changeAction = (value) => {
    if (value === "incident" && action !== "incident")
      reportKey.current = crypto.randomUUID();
    setAction(value);
    setReason("");
    setKind("");
    setSlot("");
    setFiles([]);
    setFeedback("");
  };
  async function completeNow() {
    setActionLoading(true);
    setActionError("");
    try {
      await completeTutorSession(s.id);
      changeAction("");
      window.dispatchEvent(new Event("campustutor:sessions-changed"));
      await refreshSessions?.();
      setFeedback(
        "Session marked as completed and kept in My Sessions history.",
      );
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setActionLoading(true);
    setActionError("");
    try {
      const chosen = options.find((o) => o.key === slot);
      if (action === "cancel") {
        await chatRequest("cancel_chat_session", {
          p_booking_id: Number(s.id),
          p_reason: `${kind}: ${reason.trim()}`,
          p_acknowledged: true,
        });
      } else if (action === "reschedule") {
        if (!chosen) throw new Error("Select an available time.");
        await chatRequest("request_chat_reschedule", {
          p_booking_id: Number(s.id),
          p_date: chosen.date,
          p_start: chosen.time,
          p_reason: reason.trim(),
        });
      } else {
        if (action !== "incident")
          throw new Error("This action is not available here.");
        await submitIncidentReport({
          sessionId: s.id,
          incidentType: kind,
          reason,
          evidence: files,
          submissionKey: reportKey.current,
        });
      }
      changeAction("");
      await refreshSessions?.();
      setFeedback(
        action === "incident"
          ? "Report submitted for Admin and OSAS review."
          : action === "cancel"
            ? "Session cancelled. Refund eligibility will be reviewed separately."
            : "Reschedule request sent. The current schedule remains until the learner approves.",
      );
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setActionLoading(false);
    }
  }
  return (
    <>
      <Modal
        size="drawer"
        title="Session Details"
        subtitle={s.booking || s.id}
        onClose={onClose}
        footer={
          <>
            <button className={button} onClick={() => changeAction("incident")}>
              Report an Issue
            </button>
            {s.type === "Online" && active && (
              <button
                className={primary}
                onClick={() => changeAction("meeting")}
              >
                Open External Meeting
              </button>
            )}
          </>
        }
      >
        <div className="session-person">
          <Avatar
            name={s.learner}
            userId={s.learnerUserId || s.learnerId}
          />
          <div>
            <strong>{s.learner}</strong>
            {s.program && <p>{s.program}</p>}
          </div>
          {s.status === "Confirmed" &&
            ["Paid", "Partially Refunded"].includes(s.payment) && (
              <button
                className={button}
                onClick={() => go("messages", { learner: s.learner })}
              >
                <MessageCircle size={16} /> Message Learner
              </button>
            )}
        </div>
        <Details
          rows={[
            ["Booking ID", s.booking || s.id],
            ["Learner", s.learner],
            ["Service", s.service],
            ["Specific Topic", s.topic],
            ["Date", dateLabel(s.date)],
            ["Time", range(s)],
            [
              "Duration",
              `${Math.round((hour(s.end) - hour(s.start)) * 60)} min`,
            ],
            ["Session Type", `${s.type} · ${s.provider}`],
            ["Amount", money(s.amount)],
            ["Booking Status", <Badge>{s.status}</Badge>],
            ["Payment Status", <Badge>{s.payment}</Badge>],
          ]}
        />
        {s.type === "Online" && (
          <>
            <h3 className="session-section-title">External meeting</h3>
            <div className="session-meeting">
              <Video />
              <div>
                <strong>{s.provider}</strong>
                <p>{url || "Meeting link not provided yet."}</p>
              </div>
              {active && (
                <button
                  className={primary}
                  onClick={() => changeAction("meeting")}
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
        <h3 className="session-section-title">Payment allocation</h3>
        <Allocation session={s} />
        <Details
          rows={[
            [
              "Transaction",
              s.transaction ? (
                <button
                  className="text-green-800 font-semibold"
                  onClick={() => setTransaction(true)}
                >
                  {s.transaction}
                </button>
              ) : (
                "Not available"
              ),
            ],
            [
              "Earnings status",
              s.status === "Completed"
                ? "Included in completed session earnings"
                : "Counted once the session is completed",
            ],
          ]}
        />
        {!action && feedback && <p role="status">{feedback}</p>}
      </Modal>
      {transaction && (
        <TransactionDetails
          session={s}
          onClose={() => setTransaction(false)}
          onSession={() => setTransaction(false)}
        />
      )}
      {action && (
        <Modal
          size={action === "reschedule" ? "large" : "default"}
          title={
            action === "complete"
              ? "Mark Session Completed"
              : action === "incident"
                ? "Report an Issue"
                : `Open ${s.provider}?`
          }
          subtitle={`${s.booking || s.id} · ${s.service} · ${s.learner}`}
          onClose={() => changeAction("")}
          footer={
            action !== "meeting" ? (
              <>
                <button className={button} onClick={() => changeAction("")}>
                  Cancel
                </button>
                <button
                  form={
                    action === "complete" ? undefined : "session-action-form"
                  }
                  type={action === "complete" ? "button" : "submit"}
                  onClick={action === "complete" ? completeNow : undefined}
                  className={primary}
                  disabled={
                    actionLoading ||
                    (action === "incident" &&
                      (!kind || reason.trim().length < 20 || !files.length))
                  }
                >
                  {actionLoading
                    ? "Saving..."
                    : action === "complete"
                      ? "Done Session"
                      : action === "incident"
                        ? "Submit Report"
                        : "Submit Report"}
                </button>
              </>
            ) : null
          }
        >
          {action === "meeting" ? (
            <div className="space-y-4">
              <div className="session-meeting">
                <ExternalLink />
                <div>
                  <strong>
                    {s.service} · {s.learner}
                  </strong>
                  <p>
                    {dateLabel(s.date)} · {range(s)}
                  </p>
                </div>
              </div>
              <p>
                This session runs on {s.provider}, outside Kasangga.
                Kasangga has no built-in video or voice calls.
              </p>
              {url ? (
                <a
                  className={primary}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open {s.provider}
                </a>
              ) : (
                <p role="status">No meeting link has been provided.</p>
              )}
              <button className={button} onClick={() => changeAction("")}>
                Cancel
              </button>
            </div>
          ) : action === "complete" ? (
            <div className="space-y-3">
              <p>
                Mark this paid session with {s.learner} as completed? It will
                leave the active message list and remain visible under the
                Completed tab in My Sessions.
              </p>
              {actionError && (
                <p role="alert" className="text-red-700">
                  {actionError}
                </p>
              )}
            </div>
          ) : (
            <form
              id="session-action-form"
              onSubmit={submit}
              className="space-y-4"
            >
              {action === "cancel" && (
                <p className="session-warning">
                  <strong>
                    Cancellation does not automatically guarantee a refund.
                  </strong>
                  <br />
                  {s.learner}'s {money(s.amount)} payment is subject to refund
                  review if paid. Frequent tutor cancellations can affect your
                  standing.
                </p>
              )}
              {action === "reschedule" && (
                <>
                  <p className="session-info">
                    Current time:{" "}
                    <strong>
                      {dateLabel(s.date)}, {range(s)}
                    </strong>
                    . The booking only changes if the learner accepts.
                  </p>
                  <h3>Choose a new slot from your valid availability</h3>
                  <p className="session-muted">
                    Only future times without class or session conflicts are
                    shown.
                  </p>
                  <div className="session-slot-list">
                    {options.map((o) => (
                      <button
                        type="button"
                        key={o.key}
                        className={slot === o.key ? primary : button}
                        aria-pressed={slot === o.key}
                        onClick={() => setSlot(o.key)}
                      >
                        {dateLabel(o.date)} · {time(hour(o.time))} –{" "}
                        {time(o.end)}
                      </button>
                    ))}
                  </div>
                  {actionLoading && (
                    <p role="status">Loading available times...</p>
                  )}
                  {!actionLoading && !options.length && (
                    <p role="status">
                      No valid slots in the next 30 days. Add availability
                      before requesting a reschedule.
                    </p>
                  )}
                </>
              )}
              {actionError && (
                <p role="alert" className="text-red-700">
                  {actionError}
                </p>
              )}
              {action === "incident" && (
                <>
                  <p className="session-muted">
                    Reports go to Kasangga Admin. Conduct concerns are
                    referred to OSAS.
                  </p>
                  <Field label="Booking">
                    <input
                      className={input}
                      readOnly
                      value={`${s.booking || s.id} · ${s.service} · ${s.learner}`}
                    />
                  </Field>
                </>
              )}
              {action !== "reschedule" && (
                <Field label={action === "incident" ? "Issue Type" : "Reason"}>
                  <select
                    className={input}
                    required
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="">
                      Select{" "}
                      {action === "incident" ? "an issue type" : "a reason"}
                    </option>
                    {(action === "incident"
                      ? [
                          "No-show",
                          "Inappropriate behavior or harassment",
                          "Harassment",
                          "Payment concern",
                          "Technical issue",
                          "Other",
                        ]
                      : [
                          "Schedule conflict",
                          "Personal emergency",
                          "Illness",
                          "Other",
                        ]
                    ).map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field
                label={
                  action === "incident"
                    ? "Description"
                    : action === "cancel"
                      ? "Message to the learner"
                      : "Reason for the learner"
                }
              >
                <textarea
                  className={input}
                  required
                  maxLength={2000}
                  minLength={
                    action === "incident"
                      ? 20
                      : action === "reschedule"
                        ? 10
                        : 1
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    action === "incident"
                      ? "What happened, when, and who was involved."
                      : "Explain the reason to the learner."
                  }
                />
              </Field>
              {action !== "cancel" && (
                <p className="session-muted">
                  {reason.trim().length}/{action === "incident" ? 20 : 10}{" "}
                  characters minimum
                </p>
              )}
              {action === "incident" && (
                <EvidencePicker
                  attachmentCard
                  files={files}
                  onChange={setFiles}
                  onError={setFeedback}
                  disabled={actionLoading}
                />
              )}
              {action === "incident" && (
                <div className="session-info mt-3">
                  <ShieldCheck size={22} />
                  <p>
                    Include accurate details and evidence. Admin reviews each
                    report and refers conduct concerns to OSAS. Updates appear
                    in Notifications.
                  </p>
                </div>
              )}
            </form>
          )}
          {action && feedback && (
            <p role="status" className="mt-3 text-red-700">
              {feedback}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
