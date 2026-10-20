import EvidencePicker from "./EvidencePicker.jsx";
import { useEffect, useRef, useState } from "react";
import {
  X,
  ShieldCheck,
  ExternalLink,
  Video,
  MessageCircle,
} from "lucide-react";
import { chatRequest } from "../../services/bookingMessages.js";
import { submitIncidentReport } from "../../services/incidentReports.js";
export default function ChatDetails({ chat, mode, close, role }) {
  const [reportOpen, setReportOpen] = useState(false);
  const ref = useRef(null);
  const submissionKey = useRef(crypto.randomUUID());
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [files, setFiles] = useState([]),
    [kind, setKind] = useState(""),
    [description, setDescription] = useState("");
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  useEffect(() => {
    let live = true;
    chatRequest("chat_booking_details", { p_booking_id: chat.booking_id })
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [chat.booking_id]);
  async function report(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await submitIncidentReport({
        sessionId: chat.booking_id,
        incidentType: kind,
        reason: description,
        evidence: files,
        submissionKey: submissionKey.current,
      });
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const link = data?.link && /^https:\/\//i.test(data.link) ? data.link : null;
  const tutorSession = role === "tutor" && mode === "session";
  const cash = (value) =>
    value == null
      ? "Not available"
      : new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
        }).format(value);
  const clock = (value) =>
    value
      ? new Date("2000-01-01T" + value).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
  const rows = data
    ? [
        ["Booking ID", "BK-" + data.booking_id],
        ...(tutorSession ? [["Learner", data.name]] : []),
        ["Service", data.service],
        ["Specific Topic", data.topic],
        [
          "Date",
          data.date
            ? new Date(data.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "",
        ],
        ["Time", clock(data.start) + " – " + clock(data.end)],
        [
          "Duration",
          data.start && data.end
            ? `${Math.round((new Date("2000-01-01T" + data.end) - new Date("2000-01-01T" + data.start)) / 60000)} min`
            : "",
        ],
        ["Session Type", data.type],
        ["Meeting platform", data.platform],
        [
          "Meeting link",
          link ? (
            <a href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </a>
          ) : (
            "Not provided"
          ),
        ],
        ["Location", data.location],
        ["Amount", "₱" + Number(data.amount).toLocaleString("en-PH")],
        ["Booking Status", <span className="chat-status">{data.status}</span>],
        ["Payment Status", <span className="chat-status">{data.payment}</span>],
        [
          "Booked on",
          data.booked_at
            ? new Date(data.booked_at).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
              })
            : "",
        ],
      ]
    : [];
  return (
    <dialog
      ref={ref}
      onCancel={close}
      className={"chat-dialog " + (mode === "session" ? "chat-drawer" : "")}
      aria-label={
        mode === "report"
          ? "Report an Issue"
          : mode === "profile"
            ? "Profile"
            : "Session Details"
      }
    >
      <header>
        <h2>
          {mode === "report"
            ? "Report an Issue"
            : mode === "profile"
              ? "Profile"
              : "Session Details"}
        </h2>
        <button type="button" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </header>
      <div className="chat-dialog-body">
        {error && (
          <p role="alert" className="chat-error">
            {error}
          </p>
        )}
        {mode === "report" ? (
          sent ? (
            <p role="status">Your report was submitted for review.</p>
          ) : (
            <form id="chat-report" onSubmit={report}>
              <label>
                Booking reference
                <input
                  readOnly
                  value={
                    "BK-" +
                    chat.booking_id +
                    " · " +
                    chat.peer_name +
                    " · " +
                    chat.session_date
                  }
                />
              </label>
              <label>
                Incident type
                <select
                  required
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="">Select incident type</option>
                  {[
                    "Inappropriate behavior or harassment",
                    "No-show",
                    "Payment concern",
                    "Other",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened, including times and what was said or done."
                />
              </label>
              <small>At least 20 characters.</small>
              <EvidencePicker
                attachmentCard={role === "tutor"}
                files={files}
                onChange={setFiles}
                onError={setError}
                disabled={busy}
              />
              <p className="chat-safety">
                <ShieldCheck size={23} />
                Reports are confidential. Admin reviews them and refers conduct
                concerns to OSAS.
              </p>
            </form>
          )
        ) : !data ? (
          <p role="status">Loading details...</p>
        ) : (
          <>
            <div className="chat-detail-person">
              <h3>{data.name}</h3>
              {tutorSession && (
                <button className="chat-outline" onClick={close}>
                  <MessageCircle size={14} /> Message Learner
                </button>
              )}
            </div>
            <p className="chat-muted">
              {data.program || "Program not provided"}
              {data.year ? ` · Year ${data.year}` : ""}
            </p>
            {mode === "profile" ? (
              <dl>
                {[
                  ["College", data.college],
                  ["About", data.bio],
                  ["Verification", data.verification],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "Not provided"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <dl>
                {rows
                  .filter(
                    ([k]) =>
                      !tutorSession ||
                      ![
                        "Meeting platform",
                        "Meeting link",
                        "Booked on",
                      ].includes(k),
                  )
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v || "Not provided"}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {tutorSession && (
              <>
                <h4 className="chat-section-heading">External meeting</h4>
                <div className="chat-external-card">
                  <Video size={24} />
                  <div>
                    <strong>
                      {data.platform || "Meeting link not provided"}
                    </strong>
                    <small>{link}</small>
                  </div>
                  {link && (
                    <a
                      className="chat-green-button"
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} /> Open External Meeting
                    </a>
                  )}
                </div>
                <small>Kasangga has no built-in video or voice calls.</small>
                <h4 className="chat-section-heading">
                  Payment allocation
                  {data.payment_details?.method
                    ? ` · ${data.payment_details.method} via PayMongo`
                    : ""}
                </h4>
                <dl>
                  {[
                    ["Gross Amount", cash(data.payment_details?.gross)],
                    [
                      "Tutor",
                      cash(data.payment_details?.allocation?.tutor_amount),
                    ],
                    [
                      "OSAS",
                      cash(data.payment_details?.allocation?.osas_amount),
                    ],
                    [
                      "Platform",
                      cash(data.payment_details?.allocation?.platform_amount),
                    ],
                    [
                      "Transaction",
                      data.payment_details?.transaction || "Not available",
                    ],
                    [
                      "Earnings status",
                      data.status === "completed"
                        ? "Session completed"
                        : "Counted once the session is completed",
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </>
        )}
      </div>
      <footer>
        {mode === "session" && (
          <>
            {tutorSession && (
              <button
                type="button"
                className="chat-outline"
                onClick={() => setReportOpen(true)}
              >
                Report an Issue
              </button>
            )}
            {link && !/in.?person/i.test(data?.type || "") && (
              <a
                className="chat-green-button"
                href={link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                Open External Meeting
              </a>
            )}
          </>
        )}
        <button type="button" className="chat-outline" onClick={close}>
          {mode === "session" ? "Back to Conversation" : "Close"}
        </button>
        {mode === "report" && !sent && (
          <button
            form="chat-report"
            type="submit"
            className="chat-submit"
            disabled={
              busy || !kind || description.trim().length < 20 || !files.length
            }
          >
            {busy ? "Submitting..." : "Submit Report"}
          </button>
        )}
      </footer>
      {reportOpen && (
        <ChatDetails
          chat={chat}
          role={role}
          mode="report"
          close={() => setReportOpen(false)}
        />
      )}
    </dialog>
  );
}
