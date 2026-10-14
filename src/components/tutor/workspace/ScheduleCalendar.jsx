import { confirmedClasses } from "./scheduleReview.js";
import { LockKeyhole, MoreHorizontal } from "lucide-react";
import { classes, time } from "./data.js";
import {
  addDays,
  eventsForDate,
  isoDate,
  monthDates,
  packEvents,
  weekStart,
} from "./schedule.js";
import "./schedule-calendar.css";

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const kindNames = {
  class: "Confirmed class",
  available: "Available for tutoring",
  session: "Confirmed tutoring session",
};
const fullDate = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const eventLabel = (event, date) =>
  [
    kindNames[event.kind],
    event.title,
    fullDate(date),
    `${time(event.start)} to ${time(event.end)}`,
    event.detail,
    event.room,
  ]
    .filter(Boolean)
    .join(". ");

function EventIcon({ kind }) {
  const Icon = kind === "available" ? MoreHorizontal : LockKeyhole;
  return <Icon className="schedule-event-icon" aria-hidden="true" />;
}

function WeekCalendar({ anchor, classOnly, height, source, onEvent, onDay }) {
  const first = weekStart(anchor);
  const dates = Array.from(
    { length: classOnly && !source.classes.some((c) => c[0] === 6) ? 6 : 7 },
    (_, i) => addDays(first, i),
  );
  const startHour = Math.min(7, ...source.classes.map((c) => Math.floor(c[1])));
  const endHour = Math.max(
    classOnly ? 19 : 21,
    ...source.classes.map((c) => Math.ceil(c[2])),
  );
  const hours = endHour - startHour;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <div
      className={`schedule-calendar schedule-calendar-week ${classOnly ? "schedule-calendar-classes" : ""}`}
      style={{ height, "--schedule-days": dates.length }}
      aria-label={
        classOnly
          ? "Weekly confirmed class schedule"
          : "Weekly tutoring availability"
      }
    >
      <div className="schedule-week-header">
        <span className="schedule-time-heading">Time</span>
        {dates.map((date, index) => {
          const events = eventsForDate(date, source, !classOnly);
          return (
            <button
              key={isoDate(date)}
              type="button"
              className={`schedule-day-heading ${isoDate(date) === today ? "schedule-today" : ""}`}
              aria-label={`View schedule for ${fullDate(date)}`}
              onClick={() => onDay(date, events)}
            >
              <strong>{dayNames[index]}</strong>
              <span>
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </button>
          );
        })}
      </div>
      <div className="schedule-week-grid" style={{ "--schedule-hours": hours }}>
        <div className="schedule-time-axis" aria-hidden="true">
          {Array.from({ length: hours + 1 }, (_, index) => (
            <span
              key={index}
              className={`schedule-time-label ${index === 0 ? "schedule-time-first" : ""}`}
              style={{ top: `${(index / hours) * 100}%` }}
            >
              {time(startHour + index)}
            </span>
          ))}
        </div>
        {dates.map((date) => (
          <div key={isoDate(date)} className="schedule-day-column">
            {packEvents(eventsForDate(date, source, !classOnly)).map(
              (event) => {
                const visibleStart = Math.max(startHour, event.start);
                const visibleEnd = Math.min(endHour, event.end);
                if (visibleEnd <= visibleStart) return null;
                const lanes = Math.max(1, event.laneCount || 1);
                const lane = event.lane || 0;
                const label = eventLabel(event, date);
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`schedule-event schedule-event-${event.kind} ${event.conflict ? "schedule-event-conflict" : ""} ${event.pending ? "schedule-event-pending" : ""}`}
                    style={{
                      top: `calc(${((visibleStart - startHour) / hours) * 100}% + 1px)`,
                      height: `calc(${((visibleEnd - visibleStart) / hours) * 100}% - 2px)`,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                    aria-label={label}
                    title={label}
                    onClick={(e) =>
                      onEvent(
                        event,
                        date,
                        e.currentTarget.getBoundingClientRect(),
                      )
                    }
                  >
                    <span className="schedule-event-title">
                      {event.conflict ? "Conflicts with class" : event.title}
                    </span>
                    <EventIcon kind={event.kind} />
                    <span className="schedule-event-time">
                      {time(event.start)} – {time(event.end)}
                    </span>
                    {event.detail && (
                      <span className="schedule-event-detail">
                        {event.detail}
                      </span>
                    )}
                    {event.room && (
                      <span className="schedule-event-room">{event.room}</span>
                    )}
                  </button>
                );
              },
            )}
          </div>
        ))}
      </div>
      <div className="schedule-week-footer" aria-hidden="true" />
    </div>
  );
}

function MonthCalendar({ anchor, classOnly, height, source, onEvent, onDay }) {
  const dates = monthDates(anchor);
  const weeks = dates.length / 7;
  const cellHeight = (height - 28) / weeks;
  const previewCount = cellHeight >= 68 ? 2 : cellHeight >= 49 ? 1 : 0;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <div
      className="schedule-calendar schedule-calendar-month"
      style={{ height, "--schedule-weeks": weeks }}
      aria-label={
        classOnly
          ? "Monthly confirmed class schedule"
          : "Monthly tutoring availability"
      }
    >
      <div className="schedule-month-header" aria-hidden="true">
        {dayNames.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="schedule-month-grid">
        {dates.map((date) => {
          const events = eventsForDate(date, source, !classOnly);
          const previews = events.slice(0, previewCount);
          const remaining = events.length - previews.length;
          return (
            <div
              key={isoDate(date)}
              className={`schedule-month-day ${date.getMonth() !== anchor.getMonth() ? "schedule-outside-month" : ""}`}
            >
              <button
                type="button"
                className={`schedule-month-date ${isoDate(date) === today ? "schedule-today" : ""}`}
                aria-label={`View ${events.length} ${events.length === 1 ? "event" : "events"} for ${fullDate(date)}`}
                onClick={() => onDay(date, events)}
              >
                {date.getDate() === 1
                  ? date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : date.getDate()}
              </button>
              {previews.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={`schedule-month-event schedule-event-${event.kind} ${event.conflict ? "schedule-event-conflict" : ""} ${event.pending ? "schedule-event-pending" : ""}`}
                  aria-label={eventLabel(event, date)}
                  title={eventLabel(event, date)}
                  onClick={(e) =>
                    onEvent(
                      event,
                      date,
                      e.currentTarget.getBoundingClientRect(),
                    )
                  }
                >
                  <span>
                    {time(event.start)} · {event.title}
                  </span>
                </button>
              ))}
              {remaining > 0 && (
                <button
                  type="button"
                  className="schedule-month-more"
                  aria-label={`View all ${events.length} events for ${fullDate(date)}`}
                  onClick={() => onDay(date, events)}
                >
                  +{remaining} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ScheduleCalendar({
  anchor,
  mode,
  classOnly,
  data,
  height = 360,
  onEvent,
  onDay,
}) {
  const Calendar = mode === "Month" ? MonthCalendar : WeekCalendar;
  const source = {
    classes: confirmedClasses(data),
    slots: data.slots,
    sessions: data.sessions,
  };
  return (
    <div
      className="schedule-calendar-scroll"
      tabIndex={0}
      aria-label="Schedule calendar"
    >
      <Calendar
        anchor={anchor}
        classOnly={classOnly}
        height={height}
        source={source}
        onEvent={onEvent}
        onDay={onDay}
      />
    </div>
  );
}
