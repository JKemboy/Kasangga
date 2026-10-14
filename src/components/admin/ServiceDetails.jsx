import { useAdminDatabase } from "./AdminDatabaseContext.jsx";
import { useState } from "react";
import { Panel } from "./UserDetails.jsx";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
import { dateLabel } from "./adminData.js";
import { moderateService } from "./serviceActions.js";
import { money } from "../tutor/workspace/data.js";
import BookingDetails from "./BookingDetails.jsx";
import "./user-details.css";
export default function ServiceDetails({
  service: s,
  onSave,
  onClose,
  initialAction = "",
  showBookings = false,
  onTutor,
}) {
  const [action, setAction] = useState(initialAction),
    [message, setMessage] = useState(""),
    [fields, setFields] = useState([]),
    [ack, setAck] = useState(false),
    [confirming, setConfirming] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [booking, setBooking] = useState(null);
  const { database, saveRecord } = useAdminDatabase();
  const workspace = {
    sessions: database?.sessions || [],
    profile: { name: "" },
  };
  const bookings = workspace.sessions.filter((b) => b.serviceId === s.id);
  const latest = [...(s.history || [])]
    .reverse()
    .find((h) => h.to === "Suspended");
  function open(next) {
    setAction(next);
    setMessage("");
    setFields([]);
    setAck(false);
    setConfirming(false);
    setError("");
  }
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const next = moderateService(s, action, message, fields, ack);
      if (action === "Suspend Service" && !confirming) {
        setConfirming(true);
        return;
      }
      if (!(await onSave(next)))
        throw new Error(
          "This action is saved to the database yet. Nothing was saved.",
        );
      setAction("");
      setNotice("Service review saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const request = action === "Request Changes",
    suspend = action === "Suspend Service";
  const valid =
    action === "Lift Suspension" ||
    (message.trim().length >= 15 && (request ? fields.length > 0 : ack));
  const facts = [
    [
      "Tutor",
      onTutor ? (
        <button className="text-green-800 font-semibold" onClick={onTutor}>
          {s.tutor}
        </button>
      ) : (
        s.tutor
      ),
    ],
    ["Service title / Subject", s.title],
    [
      "Hourly rates",
      s.rate === s.maxRate
        ? `${money(s.rate)}/hr`
        : `${money(s.rate)} - ${money(s.maxRate)}/hr`,
    ],
    ["Session type", s.type],
    ["Location / platform", s.location || s.provider],
    ["Availability", s.availability],
    [
      "Bookings here",
      bookings.length
        ? bookings.map((b) => (
            <button
              className="block text-green-800"
              key={b.id}
              onClick={() => setBooking(b)}
            >
              {b.booking || b.id}
            </button>
          ))
        : "None in available records",
    ],
  ];
  return (
    <Panel
      title={
        <>
          {s.title}
          <span
            className={`au-status ${s.status === "Active" ? "active" : s.status === "Suspended" ? "suspended" : "restricted"}`}
          >
            {s.status}
          </span>
        </>
      }
      subtitle={`${s.id} · created ${dateLabel(s.date)}`}
      onClose={onClose}
      footer={
        <>
          <div className="ud-actions">
            <button className={button} onClick={() => open("Request Changes")}>
              Request Changes
            </button>
            {s.status === "Suspended" ? (
              <button
                className={button}
                onClick={() => open("Lift Suspension")}
              >
                Lift Suspension
              </button>
            ) : (
              s.status === "Active" && (
                <button
                  className={`${button} text-red-600`}
                  onClick={() => open("Suspend Service")}
                >
                  Suspend Service
                </button>
              )
            )}
          </div>
          <button className={button} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <p className="aid-info">
        Tutor-owned content. Admin cannot edit the description, topics, rate or
        availability; request changes from the Tutor instead.
      </p>
      <dl>
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v || "Not provided"}</dd>
          </div>
        ))}
      </dl>
      {showBookings && (
        <section>
          <h3>Bookings for this service</h3>
          {bookings.length ? (
            bookings.map((b) => (
              <button
                className={button}
                key={b.id}
                onClick={() => setBooking(b)}
              >
                {b.booking || b.id} · {b.status}
              </button>
            ))
          ) : (
            <p>No matching bookings in the available records.</p>
          )}
        </section>
      )}
      <h3>Description</h3>
      <p>{s.description || "Not provided"}</p>
      <h3>Topics, rates and schedules</h3>
      {s.topicDetails?.length ? (
        s.topicDetails.map((topic) => (
          <section className="rounded border p-3 my-2" key={topic.id}>
            <h4>
              {topic.name} - {money(topic.rate)}/hr - {topic.type}
            </h4>
            {topic.meetingLink && <p>Meeting link: {topic.meetingLink}</p>}
            {topic.location && <p>Meeting place: {topic.location}</p>}
            <p>
              {topic.slots.length
                ? topic.slots
                    .map((slot) =>
                      [
                        slot.date || "Every " + slot.day,
                        slot.start + " - " + slot.end,
                      ].join(" "),
                    )
                    .join("; ")
                : "No active topic schedule"}
            </p>
          </section>
        ))
      ) : (
        <p>No active topics recorded.</p>
      )}

      {s.status === "Suspended" && (
        <div className="ud-status red">
          <h3>Suspension</h3>
          <p>
            {latest
              ? `${dateLabel(latest.at.slice(0, 10))} by ${latest.by}`
              : "Date not recorded"}
          </p>
          <p>{latest?.reason || "Reason not recorded."}</p>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {action && (
        <Modal
          title={
            confirming
              ? "Confirm service suspension"
              : action === "Lift Suspension"
                ? "Lift suspension?"
                : action
          }
          subtitle={`${s.id} · ${s.title}`}
          onClose={() => setAction("")}
        >
          <form className="ud-form" onSubmit={save}>
            {request ? (
              <>
                <p className="aid-info">
                  The Tutor makes the edits. Requests are saved to the database
                  for the tutor to review.
                </p>
                <strong>What needs to change</strong>
                <div className="ud-links">
                  {[
                    "Description",
                    "Topics",
                    "Rate",
                    "Availability",
                    "Title",
                  ].map((f) => (
                    <button
                      type="button"
                      key={f}
                      className={fields.includes(f) ? primary : button}
                      aria-pressed={fields.includes(f)}
                      onClick={() =>
                        setFields(
                          fields.includes(f)
                            ? fields.filter((v) => v !== f)
                            : [...fields, f],
                        )
                      }
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {action === "Lift Suspension" ? (
              <p>{s.title} becomes Active in the database.</p>
            ) : confirming ? (
              <>
                <p>
                  Suspend {s.title}? Existing booking records remain unchanged.
                </p>
                <p>{message}</p>
              </>
            ) : (
              <>
                <label>
                  {request
                    ? "Message to the tutor (required)"
                    : "Suspension reason (required)"}
                  <textarea
                    className={input}
                    rows={4}
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      request
                        ? "Describe what must change to meet platform policy."
                        : "Which platform rule the listing breaks."
                    }
                  />
                </label>
                <small>
                  {message.trim().length}/15 characters minimum · saved to the
                  database
                </small>
                {suspend && (
                  <label className="ud-check">
                    <input
                      type="checkbox"
                      checked={ack}
                      onChange={(e) => setAck(e.target.checked)}
                    />
                    Existing bookings stay as scheduled. Suspended services are
                    removed from the learner directory.
                  </label>
                )}
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="ud-actions">
              <button
                type="button"
                className={button}
                onClick={() =>
                  confirming ? setConfirming(false) : setAction("")
                }
              >
                {confirming ? "Back" : "Cancel"}
              </button>
              <button
                className={primary + (suspend ? " !bg-red-600" : "")}
                disabled={saving || !valid}
              >
                {request
                  ? "Save Request"
                  : suspend
                    ? confirming
                      ? "Suspend Service"
                      : "Continue"
                    : "Lift Suspension"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {booking && (
        <BookingDetails
          record={booking}
          tutor={s.tutor}
          onClose={() => setBooking(null)}
        />
      )}
    </Panel>
  );
}
