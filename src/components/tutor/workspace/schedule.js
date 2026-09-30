const validDate = (date) =>
  date instanceof Date && Number.isFinite(date.getTime());
const weekday = (date) => (date.getDay() + 6) % 7;

export function isoDate(date) {
  if (!validDate(date)) return "";
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return isoDate(date) === value ? date : null;
}

export function addDays(date, count) {
  if (!validDate(date) || !Number.isInteger(count)) return new Date(NaN);
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + count);
  return result;
}

export function weekStart(date) {
  return validDate(date) ? addDays(date, -weekday(date)) : new Date(NaN);
}

export function shiftMonth(date, count) {
  if (!validDate(date) || !Number.isInteger(count)) return new Date(NaN);
  const result = addDays(date, 0);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + count);
  const last = new Date(result);
  last.setMonth(last.getMonth() + 1);
  last.setDate(0);
  result.setDate(Math.min(day, last.getDate()));
  return result;
}

export function monthDates(date) {
  if (!validDate(date)) return [];
  const first = addDays(date, 1 - date.getDate());
  const last = addDays(shiftMonth(first, 1), -1);
  const start = weekStart(first);
  const count = Math.ceil((weekday(first) + last.getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function formatTimeInput(value) {
  if (!Number.isFinite(value) || value < 0 || value >= 24) return "";
  const minutes = Math.round(value * 60);
  if (minutes >= 24 * 60) return "";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function decimalHour(value) {
  if (typeof value === "number") return value;
  const match = typeof value === "string" && /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return NaN;
  return Number(match[1]) + Number(match[2]) / 60;
}

const validEvent = (event) =>
  Number.isFinite(event.start) &&
  Number.isFinite(event.end) &&
  event.start >= 0 &&
  event.end <= 24 &&
  event.end > event.start;
const byTime = (a, b) => a.start - b.start || a.end - b.end;

export function eventsForDate(
  date,
  { classes = [], slots = [], sessions = [] },
  includeAvailability = true,
) {
  if (!validDate(date)) return [];
  const day = weekday(date);
  const iso = isoDate(date);
  const events = classes.flatMap(
    ([classDay, start, end, title, detail, room], index) =>
      classDay === day
        ? [
            {
              id: `class:${index}:${iso}`,
              kind: "class",
              start,
              end,
              title,
              detail,
              room,
            },
          ]
        : [],
  );
  if (day === 0 || day === 2) {
    events.push({
      id: `protected:${iso}`,
      kind: "protected",
      start: 17,
      end: 19,
      title: "Unavailable",
      detail: "Protected unavailable time",
    });
  }
  if (includeAvailability) {
    slots.forEach((slot, index) => {
      if (slot.day !== day || (!slot.repeat && slot.date !== iso)) return;
      events.push({
        id: `slot:${slot.id ?? index}:${iso}`,
        kind: slot.kind === "unavailable" ? "protected" : "available",
        conflict:
          slot.kind !== "unavailable" &&
          classes.some(
            (c) => c[0] === day && slot.start < c[2] && c[1] < slot.end,
          ),
        start: slot.start,
        end: slot.end,
        title:
          (slot.kind === "unavailable" ? "Unavailable" : slot.serviceName) ||
          `Available · ${slot.type === "Both" ? "Online / In-person" : slot.type}`,
        detail: slot.serviceId
          ? "Reserved for this service"
          : slot.repeat
            ? "Repeats weekly"
            : "One-time availability",
        slot,
      });
    });
    sessions.forEach((session, index) => {
      if (
        session.date !== iso ||
        !["Confirmed", "Pending"].includes(session.status)
      )
        return;
      events.push({
        id: `session:${session.id ?? index}:${iso}`,
        sessionId: session.id,
        kind: "session",
        pending: session.status === "Pending",
        start: decimalHour(session.start),
        end: decimalHour(session.end),
        title: session.service,
        detail: session.learner,
        room: session.provider,
      });
    });
  }
  return events.filter(validEvent).sort(byTime);
}

export function packEvents(events) {
  const sorted = events
    .filter(validEvent)
    .map((event) => ({ ...event }))
    .sort(byTime);
  const groups = [];
  let group = [];
  let end = -Infinity;
  for (const event of sorted) {
    if (event.start >= end && group.length) {
      groups.push(group);
      group = [];
    }
    group.push(event);
    end = Math.max(group.length === 1 ? -Infinity : end, event.end);
  }
  if (group.length) groups.push(group);

  for (const entries of groups) {
    const laneEnds = [];
    for (const event of entries) {
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= event.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = event.end;
      event.lane = lane;
    }
    for (const event of entries) event.laneCount = laneEnds.length;
  }
  return sorted;
}
