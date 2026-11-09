import { useLcoDatabase } from "./LcoDatabaseContext.jsx";
import { useEffect, useState } from "react";
import { Panel } from "./UserDetails.jsx";
import { Modal, button, primary, input } from "../shared/staffUi.jsx";
import { dateLabel } from "./lcoData.js";
import { moderateService } from "./serviceActions.js";
import { money } from "../tutor/workspace/data.js";
import BookingDetails from "./BookingDetails.jsx";
import "./user-details.css";
export default function ServiceDetails({
  service: s,
  onSave,
  onClose,
  initialAction = "",
  onTutor,
}) {
  const [action, setAction] = useState(""),
    [message, setMessage] = useState(""),
    [ack, setAck] = useState(false),
    [confirming, setConfirming] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [booking, setBooking] = useState(null);
  useEffect(() => {
    if (!["Suspend Service", "Lift Suspension"].includes(initialAction)) return;
    const frame = requestAnimationFrame(() => setAction(initialAction));
    return () => cancelAnimationFrame(frame);
  }, [initialAction]);
  const { database, saveRecord } = useLcoDatabase();
  const workspace = {
    sessions: database?.sessions || [],
    profile: { name: "" },
  };
  const bookings = workspace.sessions.filter(
    (b) => String(b.serviceId) === String(s.id),
  );
  const latest = [...(s.history || [])]
    .reverse()
    .find((h) => h.to === "Suspended");
  function open(next) {
    setAction(next);
    setMessage("");
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
      const next = moderateService(s, action, message, [], ack);
      if (action === "Suspend Service" && !confirming) {
        setConfirming(true);
        return;
      }
      if (!(await onSave(next)))
        throw new Error(
          "The database did not confirm this action. Refresh and try again.",
        );
      setAction("");
      setNotice("Service review saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const suspend = action === "Suspend Service";
  const valid =
    action === "Lift Suspension" || (message.trim().length >= 15 && ack);
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
  ];
  return (
    <>
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
                    Suspend
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
          Tutor-owned content. LCO cannot edit the description, topics, rate or
          availability.
        </p>
        <dl>
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v || "Not provided"}</dd>
            </div>
          ))}
        </dl>
        {
          <section>
            <h3>Bookings for this service</h3>
            {bookings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      {[
                        "Booking",
                        "Learner",
                        "Date / Time",
                        "Booking Status",
                        "Payment Status",
                        "Action",
                      ].map((label) => (
                        <th key={label} className="p-2">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="p-2">{b.booking || b.id}</td>
                        <td className="p-2">{b.learner}</td>
                        <td className="p-2">
                          {dateLabel(b.date)} {b.start}?{b.end}
                        </td>
                        <td className="p-2">{b.status}</td>
                        <td className="p-2">{b.payment}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            className={button}
                            onClick={() => setBooking(b)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No matching bookings in the available records.</p>
            )}
          </section>
        }
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
      </Panel>
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
                  Suspension reason (required)
                  <textarea
                    className={input}
                    rows={4}
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Which platform rule the listing breaks."
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
                {suspend
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
    </>
  );
}
