import { ExternalLink, MapPin, Video } from "lucide-react";
import { hour, time } from "./data.js";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import "./sessions.css";
export function MeetingBrand({ provider, compact = false }) {
  return (
    <span
      className={`meeting-brand ${provider === "Zoom" ? "zoom-brand" : ""}`}
      aria-label={provider}
    >
      {provider === "Zoom" ? (
        <span className="zoom-symbol">
          <Video size={13} fill="white" />
        </span>
      ) : (
        <svg width="23" height="20" viewBox="0 0 24 20" aria-hidden="true">
          <path fill="#00832d" d="m16 6 7-4v16l-7-4z" />
          <path fill="#00ac47" d="M6 5h11v11H6z" />
          <path fill="#4285f4" d="M1 5h5v11H1z" />
          <path fill="#ea4335" d="M1 5 6 0v5z" />
          <path fill="#fbbc04" d="M6 0h8l3 5H6z" />
          <path fill="#188038" d="M6 16h11v4H6z" />
          <path fill="#1967d2" d="M1 16h5v4z" />
        </svg>
      )}
      {!compact && (provider === "Zoom" ? "zoom" : "Google Meet")}
    </span>
  );
}
export default function SessionCards({
  rows,
  onDetails,
  onMessage,
  onMeeting,
  onAction,
}) {
  return (
    <div className="session-table-scroll">
      <div className="session-card-table">
        <div className="session-column-head">
          {[
            "Learner",
            "Service / Subject",
            "Specific Topic",
            "Date",
            "Time Range",
            "Duration",
            "Session Type",
            "Amount",
            "Booking Status",
            "Payment Status",
            "Actions",
          ].map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {rows.map((s) => {
          const date = new Date(s.date + "T12:00:00");
          const duration = (hour(s.end) - hour(s.start)) * 60;
          const sessionEnded =
            new Date(`${s.date}T${String(s.end).slice(0, 8)}+08:00`) <=
            new Date();
          return (
            <article className="session-card-row" key={s.id}>
              <div className="session-learner">
                <PortalAvatar
                  name={s.learner}
                  userId={s.learnerUserId || s.learnerId}
                  className="session-avatar overflow-hidden"
                />
                <b>{s.learner}</b>
              </div>
              <b>{s.service}</b>
              <span>{s.topic}</span>
              <div>
                <b>
                  {date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </b>
                <p className="session-muted">
                  ({date.toLocaleDateString("en-US", { weekday: "short" })})
                </p>
              </div>
              <span className="session-muted">
                {time(hour(s.start))} –<br />
                {time(hour(s.end))}
              </span>
              <span className="session-muted">
                {Math.floor(duration / 60)}{" "}
                {Math.floor(duration / 60) === 1 ? "hour" : "hr"}
                {duration % 60 ? ` ${duration % 60} min` : ""}
              </span>
              <div className="session-muted">
                {s.type === "Online" ? (
                  <>
                    Online ·<br />
                    {s.provider}
                    <div className="session-provider">
                      <MeetingBrand
                        provider={s.provider}
                        compact={s.provider !== "Zoom"}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    In-Person
                    <p className="session-location">
                      <MapPin size={17} fill="#45516e" color="#45516e" />
                      {s.provider}
                    </p>
                  </>
                )}
              </div>
              <strong className="session-price">
                ₱{s.amount.toLocaleString()}
              </strong>
              <span
                className={`session-status ${s.status === "Pending" ? "pending" : ""}`}
              >
                {s.lifecycle === "Completed"
                  ? "Completed"
                  : s.lifecycle === "Awaiting Completion"
                    ? "Ongoing · mark complete"
                    : s.lifecycle || s.status}
              </span>
              <span
                className={`session-status ${s.payment === "Unpaid" ? "unpaid" : ""}`}
              >
                {s.payment}
              </span>
              <div className="session-actions">
                <div>
                  <button onClick={() => onDetails(s)}>View Details</button>
                  {s.status === "Confirmed" &&
                    ["Paid", "Partially Refunded"].includes(s.payment) && (
                      <button onClick={() => onMessage(s)}>
                        Message Learner
                      </button>
                    )}
                  {s.status === "Confirmed" &&
                    s.payment === "Paid" &&
                    s.lifecycle !== "Upcoming" && (
                      <button
                        onClick={() => onAction(s, "complete")}
                        disabled={!sessionEnded}
                        title={
                          sessionEnded
                            ? "Mark this session as completed"
                            : "Available after the scheduled session end"
                        }
                      >
                        Done Session
                      </button>
                    )}
                  <button type="button" onClick={() => onAction(s, "incident")}>
                    Report an Issue
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.lifecycle === "Upcoming" &&
                    s.status === "Confirmed" &&
                    s.payment === "Paid" && (
                      <button
                        type="button"
                        onClick={() => onAction(s, "cancel")}
                      >
                        Cancel Session
                      </button>
                    )}
                </div>
                {s.type === "Online" && s.status === "Confirmed" && (
                  <button
                    className="session-meeting"
                    onClick={() => onMeeting(s)}
                  >
                    <span>
                      <ExternalLink size={17} />
                      Open External Meeting
                    </span>
                    <MeetingBrand provider={s.provider} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
