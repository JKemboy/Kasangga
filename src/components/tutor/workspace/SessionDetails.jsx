import { useMemo, useState } from "react";
import { ExternalLink, MessageCircle, Video, Paperclip } from "lucide-react";
import { Modal, Avatar, Badge, Field, button, primary, input } from "./ui.jsx";
import { money, hour, time } from "./data.js";
import {
  sessionAction,
  meetingUrl,
  rescheduleOptions,
  respondToReschedule,
} from "./sessionActions.js";

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
  return (
    <div className="payment-allocation">
      {[
        ["Gross Amount", 1],
        ["Tutor (90%)", 0.9],
        ["OSAS (5%)", 0.05],
        ["Platform (5%)", 0.05],
      ].map(([label, share]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{money(s.amount * share)}</strong>
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
            "Earnings Status",
            s.status === "Completed"
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
  update,
  go,
  sessionId,
  onClose,
  initialAction = "",
}) {
  const s = data.sessions.find((s) => s.id === sessionId);
  const [action, setAction] = useState(initialAction),
    [feedback, setFeedback] = useState(""),
    [transaction, setTransaction] = useState(false);
  const [reason, setReason] = useState(""),
    [kind, setKind] = useState(""),
    [slot, setSlot] = useState(""),
    [files, setFiles] = useState([]);
  const options = useMemo(
    () => (action === "reschedule" ? rescheduleOptions(data, sessionId) : []),
    [action, data, sessionId],
  );
  if (!s) return null;
  const active = ["Confirmed", "Pending"].includes(s.status),
    url = meetingUrl(s.meetingUrl || s.link);

  const changeAction = (value) => {
    setAction(value);
    setReason("");
    setKind("");
    setSlot("");
    setFiles([]);
    setFeedback("");
  };
  function respond(accept) {
    try {
      const next = respondToReschedule(data, s.id, accept);
      if (update(() => next) === false)
        throw new Error("Could not save. Please try again.");
      setFeedback(
        accept
          ? "New schedule accepted."
          : "Request declined. The original time is unchanged.",
      );
    } catch (e) {
      setFeedback(e.message);
    }
  }
  function submit(e) {
    e.preventDefault();
    try {
      const chosen = options.find((o) => o.key === slot);
      const next = sessionAction(data, s.id, action, {
        reason: action === "cancel" ? `${kind}: ${reason}` : reason,
        incidentType: kind,
        acknowledged: true,
        date: chosen?.date,
        time: chosen?.time,
        files,
      });
      if (update(() => next) === false)
        throw new Error("Could not save. Please try again.");
      changeAction("");
      setFeedback(
        action === "cancel"
          ? "Session cancelled."
          : action === "reschedule"
            ? "Reschedule request saved. The original time remains until accepted."
            : "Report saved for review.",
      );
    } catch (error) {
      setFeedback(error.message);
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
            {active && (
              <button
                className="tutor-danger-button"
                onClick={() => changeAction("cancel")}
              >
                Cancel Session
              </button>
            )}
            <button className={button} onClick={() => changeAction("incident")}>
              Report an Issue
            </button>
            {active && (
              <button
                className={button}
                disabled={s.reschedule?.status === "Pending"}
                onClick={() => changeAction("reschedule")}
              >
                Request Reschedule
              </button>
            )}
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
          <Avatar name={s.learner} />
          <div>
            <strong>{s.learner}</strong>
            {s.program && <p>{s.program}</p>}
          </div>
          <button
            className={button}
            onClick={() => go("messages", { learner: s.learner })}
          >
            <MessageCircle size={16} /> Message Learner
          </button>
        </div>
        {s.reschedule?.status === "Pending" && (
          <div className="session-warning mt-3">
            <strong>
              {s.reschedule.by === "Learner"
                ? s.learner + " requested a new schedule"
                : "Pending reschedule request"}
            </strong>
            <p className="mt-1">
              From {dateLabel(s.date)}, {range(s)} to {s.reschedule.date},{" "}
              {s.reschedule.start}.
            </p>
            <p>Reason: {s.reschedule.reason}</p>
            {s.reschedule.by === "Learner" ? (
              <div className="flex gap-2 mt-3">
                <button className={primary} onClick={() => respond(true)}>
                  Accept New Schedule
                </button>
                <button className={button} onClick={() => respond(false)}>
                  Decline
                </button>
              </div>
            ) : (
              <p>Awaiting learner acceptance.</p>
            )}
          </div>
        )}
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
              CampusTutor has no built-in video or voice calls.
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
            action === "cancel"
              ? "Cancel Session"
              : action === "incident"
                ? "Report an Issue"
                : action === "reschedule"
                  ? "Request Reschedule"
                  : `Open ${s.provider}?`
          }
          subtitle={`${s.booking || s.id} · ${s.service} · ${s.learner}`}
          onClose={() => changeAction("")}
          footer={
            action !== "meeting" ? (
              <>
                <button className={button} onClick={() => changeAction("")}>
                  {action === "cancel" ? "Keep Session" : "Cancel"}
                </button>
                {action === "cancel" && (
                  <button
                    className={button}
                    disabled={s.reschedule?.status === "Pending"}
                    onClick={() => changeAction("reschedule")}
                  >
                    Request Reschedule
                  </button>
                )}
                <button
                  form="session-action-form"
                  type="submit"
                  className={
                    action === "cancel" ? "tutor-danger-button" : primary
                  }
                  disabled={
                    action === "incident"
                      ? !kind || reason.trim().length < 20
                      : action === "reschedule"
                        ? !slot || reason.trim().length < 10
                        : !kind || !reason.trim()
                  }
                >
                  {action === "cancel"
                    ? "Cancel Session"
                    : action === "incident"
                      ? "Submit Report"
                      : "Send Reschedule Request"}
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
                This session runs on {s.provider}, outside CampusTutor.
                CampusTutor has no built-in video or voice calls.
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
                  {!options.length && (
                    <p role="status">
                      No valid slots in the next 30 days. Add availability
                      before requesting a reschedule.
                    </p>
                  )}
                </>
              )}
              {action === "incident" && (
                <>
                  <p className="session-muted">
                    Reports go to CampusTutor Admin. Conduct concerns are
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
                          "Inappropriate behavior",
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
                <Field label="Evidence (optional)">
                  <span className="session-evidence">
                    <Paperclip /> Attach screenshots or files (PNG, JPG, PDF)
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={async (e) => {
                        const selected = Array.from(e.target.files);
                        if (selected.some((f) => f.size > 2 * 1024 * 1024)) {
                          setFeedback(
                            "Each attachment must be 2 MB or smaller.",
                          );
                          e.target.value = "";
                          setFiles([]);
                          return;
                        }
                        setFiles(
                          await Promise.all(
                            selected.map(
                              (file) =>
                                new Promise((resolve) => {
                                  const reader = new FileReader();
                                  reader.onload = () =>
                                    resolve({
                                      name: file.name,
                                      type: file.type,
                                      data: reader.result,
                                    });
                                  reader.readAsDataURL(file);
                                }),
                            ),
                          ),
                        );
                      }}
                    />
                  </span>
                  {files.map((f) => (
                    <p key={f.name}>{f.name}</p>
                  ))}
                </Field>
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
