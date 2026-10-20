import { useState } from "react";
import { Star } from "lucide-react";
import { Modal, Avatar, Badge, button, primary } from "./ui.jsx";
import { money, hour, time } from "./data.js";
import SessionDetails from "./SessionDetails.jsx";
const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export default function ServiceDetails({
  service,
  error,
  changing = false,
  data,
  update,
  go,
  onClose,
  onEdit,
  onToggle,
}) {
  const [sessionId, setSessionId] = useState(null);
  const bookings = data.sessions
    .filter(
      (s) =>
        (s.serviceId
          ? s.serviceId === service.id
          : s.service === service.name) && s.status === "Confirmed",
    )
    .sort((a, b) =>
      `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`),
    );
  const slots = data.slots
    .filter((s) => s.serviceId === service.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  const topics = (
    Array.isArray(service.topics)
      ? service.topics
      : String(service.topics || "").split(",")
  )
    .map((t) => t.trim())
    .filter(Boolean);
  const suspended = service.status === "Suspended";
  return (
    <>
      <Modal
        size="large"
        title={service.name}
        subtitle={service.subtitle}
        onClose={onClose}
        footer={
          <>
            <button className={button + " mr-auto"} onClick={onClose}>
              Close
            </button>
            <button
              className={button}
              disabled={suspended || changing}
              onClick={() => onToggle(service)}
            >
              {service.status === "Active" ? "Deactivate" : "Reactivate"}{" "}
              Service
            </button>
            <button
              className={primary}
              disabled={suspended || changing}
              onClick={() => onEdit(service)}
            >
              Edit Service
            </button>
          </>
        }
      >
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mb-3 flex justify-end">
          <Badge>{service.status}</Badge>
        </div>
        <dl className="session-detail-grid mt-0">
          {[
            ["Service Title", service.name],
            ["Subject", service.subtitle],
            ["Category", <Badge>{service.category}</Badge>],
            [
              "Level",
              <span className="rounded bg-blue-50 px-3 py-1 text-blue-700">
                {service.level}
              </span>,
            ],
            ["Description", service.description],
            [
              "Topics / Skills",
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-green-50 px-3 py-1 text-green-800"
                  >
                    {t}
                  </span>
                ))}
              </div>,
            ],
            [
              "Hourly Rate",
              <strong className="text-green-800">
                {money(service.rate)} / hour
              </strong>,
            ],
            [
              "Session Type",
              service.type === "Both" ? "Online and In-Person" : service.type,
            ],
            [
              "Rating",
              service.rating ? (
                <span className="inline-flex items-center gap-1.5">
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  {service.rating}
                </span>
              ) : (
                "No ratings yet"
              ),
            ],
            [
              "Completed Sessions",
              service.completed == null
                ? "Not available"
                : `${service.completed} all time`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {service.topicDetails?.length > 0 && (
          <>
            <h3 className="session-section-title">
              Topic rates and meeting details
            </h3>
            <ul className="divide-y divide-slate-100">
              {service.topicDetails.map((topic) => (
                <li key={topic.id} className="py-2 text-sm">
                  <strong>
                    {topic.name} · {money(topic.rate)}/hour
                  </strong>
                  <p>{topic.types.join(" / ")}</p>
                  {topic.meetingLink && (
                    <a
                      className="text-green-800 underline break-all"
                      href={topic.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {topic.meetingLink}
                    </a>
                  )}
                  {topic.location && <p>{topic.location}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
        <h3 className="session-section-title">
          Availability for this service ({slots.length})
        </h3>
        {slots.length ? (
          <ul className="divide-y divide-slate-100">
            {slots.map((slot) => (
              <li
                key={slot.id}
                className="flex flex-wrap justify-between gap-2 py-2"
              >
                <span>
                  {dateLabel(slot.date)}
                  {slot.repeat ? " · Repeats weekly" : ""}
                </span>
                <span>
                  {time(slot.start)} – {time(slot.end)}
                  {slot.topicId &&
                    ` · ${service.topicDetails?.find((topic) => topic.id === slot.topicId)?.name || "Topic"}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="session-muted">
            No dates and times set for this service yet. Learners book it from
            your general availability.
          </p>
        )}
        <p className="session-muted">
          All dates are checked against your confirmed class schedule and booked
          sessions.
        </p>
        <h3 className="session-section-title">
          Upcoming bookings ({bookings.length})
        </h3>
        <button
          type="button"
          className={button}
          onClick={() => go("sessions", { serviceId: service.id })}
        >
          View sessions for this service
        </button>
        {bookings.length ? (
          <ul className="divide-y divide-slate-100">
            {bookings.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-label={`View session with ${s.learner}`}
                  className="flex w-full flex-wrap items-center gap-3 rounded px-2 py-3 text-left hover:bg-green-50"
                  onClick={() => setSessionId(s.id)}
                >
                  <Avatar name={s.learner} />
                  <span className="flex-1">
                    {s.learner} · {s.topic}
                  </span>
                  <span className="text-xs text-slate-500">
                    {dateLabel(s.date)} · {time(hour(s.start))} –{" "}
                    {time(hour(s.end))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="session-muted">
            No upcoming bookings for this service.
          </p>
        )}
        {suspended && (
          <p className="mt-3 rounded bg-red-50 p-3 text-red-700">
            Suspended by Admin. Editing and status changes are unavailable while
            moderation applies.
          </p>
        )}
      </Modal>
      {sessionId && (
        <SessionDetails
          data={data}
          update={update}
          go={go}
          sessionId={sessionId}
          onClose={() => setSessionId(null)}
        />
      )}
    </>
  );
}
