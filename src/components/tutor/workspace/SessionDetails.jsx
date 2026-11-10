import ExternalMeeting from "../../shared/ExternalMeeting.jsx";
import Details from "../../shared/SessionDetailRows.jsx";
import EvidencePicker from "../../shared/EvidencePicker.jsx";
import IncidentTypeFields from "../../shared/IncidentTypeFields.jsx";
import { useRef, useState } from "react";
import { ExternalLink, MessageCircle, Video, ShieldCheck } from "lucide-react";
import { Modal, Avatar, Badge, Field, button, primary, input } from "./ui.jsx";
import { money, hour, time } from "./data.js";
import { meetingUrl } from "./sessionActions.js";
import { chatRequest } from "../../../services/bookingMessages.js";
import {
  uploadCompletionProof,
  validateCompletionProof,
} from "../../../services/tutorSessionCompletion.js";
import SessionCompletionProof from "../../shared/SessionCompletionProof.jsx";
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
function Allocation({ session: s }) {
  const amounts = sessionAllocation({
    ...s,
    status: "Completed",
    payment: "Paid",
  });
  return (
    <div className="payment-allocation">
      {[
        ["Gross Amount", "gross"],
        ["Tutor (90%)", "tutor"],
        ["Platform (10%)", "platform"],
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
              ? "Payout marked as transferred by LCO"
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
  const [acknowledged, setAcknowledged] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [reason, setReason] = useState(""),
    [kind, setKind] = useState(""),
    [category, setCategory] = useState(""),
    [slot, setSlot] = useState(""),
    [files, setFiles] = useState([]);
  if (!s) return null;
  const active = ["Confirmed", "Pending"].includes(s.status),
    url = meetingUrl(s.meetingUrl || s.link),
    options = actionOptions;

  const changeAction = (value) => {
    if (!value && initialAction) {
      onClose();
      return;
    }
    setAcknowledged(false);
    if (value === "incident" && action !== "incident")
      reportKey.current = crypto.randomUUID();
    setAction(value);
    setReason("");
    setKind("");
    setCategory("");
    setSlot("");
    setFiles([]);
    setFeedback("");
  };
  async function completeNow() {
    setActionLoading(true);
    setActionError("");
    try {
      await uploadCompletionProof(s.id, proofFile);
      changeAction("");
      window.dispatchEvent(new Event("campustutor:sessions-changed"));
      await refreshSessions?.();
      setFeedback(
        "Completion proof uploaded. The learner has been notified to confirm before rating.",
      );
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (actionLoading) return;
    if (action === "cancel" && (!acknowledged || !kind || !reason.trim()))
      return setFeedback(
        "Choose a reason, explain it and acknowledge the cancellation policy.",
      );
    setActionLoading(true);
    setActionError("");
    try {
      const chosen = options.find((o) => o.key === slot);
      if (action === "cancel") {
        await chatRequest("cancel_chat_session", {
          p_booking_id: Number(s.id),
          p_reason: `${kind}: ${reason.trim()}`,
          p_acknowledged: acknowledged,
        });
      } else {
        if (action !== "incident")
          throw new Error("This action is not available here.");
        await submitIncidentReport({
          sessionId: s.id,
          incidentType: kind,
          incidentCategory: category,
          reason,
          evidence: files,
          submissionKey: reportKey.current,
        });
      }
      changeAction("");
      await refreshSessions?.();
      window.dispatchEvent(new Event("campustutor:sessions-changed"));
      setFeedback(
        action === "incident"
          ? "Report submitted for LCO and OSWE review."
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
      {!initialAction && action !== "meeting" && (
        <Modal
          size="drawer"
          title="Session Details"
          subtitle={s.booking || s.id}
          onClose={onClose}
          footer={
            <>
              <button
                className={button + " report-issue-button"}
                onClick={() => changeAction("incident")}
              >
                Report an Issue
              </button>
              {s.status === "Confirmed" &&
                ["Paid", "Partially Refunded"].includes(s.payment) && (
                  <button
                    className={button}
                    onClick={() =>
                      go("messages", { learner: s.learner, bookingId: s.id })
                    }
                  >
                    <MessageCircle size={16} />
                    Message Learner
                  </button>
                )}
            </>
          }
        >
          <div className="session-person">
            <Avatar name={s.learner} userId={s.learnerUserId || s.learnerId} />
            <div>
              <strong>{s.learner}</strong>
              {s.program && <p>{s.program}</p>}
            </div>
          </div>
          {s.completionProof && (
            <SessionCompletionProof
              bookingId={s.id}
              proof={s.completionProof}
              tutor
            />
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
      )}
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
              ? "Session Completion Proof"
              : action === "incident"
                ? "Report an Issue"
                : action === "cancel"
                  ? "Cancel Session"
                  : `Open ${s.provider || "External Meeting"}?`
          }
          subtitle={`${s.booking || s.id} · ${s.service} · ${s.learner}`}
          onClose={() => changeAction("")}
          footer={
            action !== "meeting" ? (
              <>
                <button className={button} onClick={() => changeAction("")}>
                  Cancel
                </button>
                {!(action === "complete" && s.completionProof) && (
                  <button
                    form={
                      action === "complete" ? undefined : "session-action-form"
                    }
                    type={action === "complete" ? "button" : "submit"}
                    onClick={action === "complete" ? completeNow : undefined}
                    className={primary}
                    disabled={
                      actionLoading ||
                      (action === "complete" && !proofFile) ||
                      (action === "cancel" &&
                        (!kind || !reason.trim() || !acknowledged)) ||
                      (action === "incident" &&
                        (!category ||
                          !kind ||
                          reason.trim().length < 20 ||
                          !files.length))
                    }
                  >
                    {actionLoading
                      ? "Saving..."
                      : action === "complete"
                        ? "Upload Proof & Notify Learner"
                        : action === "incident"
                          ? "Submit Report"
                          : action === "cancel"
                            ? "Cancel Session"
                            : "Submit Report"}
                  </button>
                )}
              </>
            ) : null
          }
        >
          {action === "meeting" ? (
            <ExternalMeeting
              service={s.service}
              person={s.learner}
              date={dateLabel(s.date)}
              time={range(s)}
              platform={s.provider}
              link={s.meetingUrl || s.link}
              active={active}
              onClose={() => changeAction("")}
            />
          ) : action === "complete" ? (
            <div className="space-y-3">
              {s.completionProof ? (
                <SessionCompletionProof
                  bookingId={s.id}
                  proof={s.completionProof}
                  tutor
                />
              ) : (
                <>
                  <p>
                    Upload proof that your session with {s.learner} was
                    completed. The learner must review and confirm it before the
                    session is completed and rating becomes available.
                  </p>
                  <label className="block text-sm">
                    Completion proof (JPG, PNG or PDF; up to 10 MB)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      disabled={actionLoading}
                      onChange={(event) => {
                        const file = event.target.files[0];
                        try {
                          validateCompletionProof(file);
                          setProofFile(file);
                          setActionError("");
                        } catch (error) {
                          setProofFile(null);
                          setActionError(error.message);
                          event.target.value = "";
                        }
                      }}
                    />
                  </label>
                </>
              )}
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
              {actionError && (
                <p role="alert" className="text-red-700">
                  {actionError}
                </p>
              )}
              {action === "incident" && (
                <>
                  <p className="session-muted">
                    Reports go to Kasangga LCO. Conduct concerns are referred to
                    OSWE.
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
              {action === "incident" && (
                <IncidentTypeFields
                  category={category}
                  type={kind}
                  onCategory={setCategory}
                  onType={setKind}
                  disabled={actionLoading}
                />
              )}
              {action !== "reschedule" && action !== "incident" && (
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
                    {[
                      "Schedule conflict",
                      "Personal emergency",
                      "Illness",
                      "Other",
                    ].map((v) => (
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
              {action === "cancel" && (
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  I understand that cancellation does not automatically
                  guarantee a refund.
                </label>
              )}
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
                    Include accurate details and evidence. LCO reviews each
                    report and refers conduct concerns to OSWE. Updates appear
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
