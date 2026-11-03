import { parseDate } from "./schedule.js";
const overlaps = (start, end, other) => start < other.end && other.start < end;
const decimal = (value) =>
  typeof value === "number"
    ? value
    : Number(String(value).split(":")[0]) +
      Number(String(value).split(":")[1]) / 60;

// Only split the saved range. Bookings on the same date must never introduce
// times into another topic's availability.
export function savedTopicRows(slot, makeKey = () => crypto.randomUUID()) {
  return Array.from(
    { length: Math.ceil((slot.end - slot.start) / 2) },
    (_, i) => ({
      ...slot,
      start: slot.start + i * 2,
      end: Math.min(slot.end, slot.start + i * 2 + 2),
      duration: Math.min(2, slot.end - slot.start - i * 2),
      savedTime: {
        date: slot.date,
        start: slot.start + i * 2,
        end: Math.min(slot.end, slot.start + i * 2 + 2),
        repeat: !!slot.repeat,
      },
      key: makeKey(),
    }),
  );
}

export function isUnchangedTopicRow(row) {
  return (
    !!row.savedTime &&
    row.date === row.savedTime.date &&
    row.start === row.savedTime.start &&
    row.end === row.savedTime.end &&
    !!row.repeat === row.savedTime.repeat
  );
}
export function topicTimeOptions({
  date,
  duration = 1,
  repeat = false,
  rowKey,
  topics = [],
  slots = [],
  classes = [],
  bookings = [],
  serviceId = null,
  now = new Date(),
}) {
  if (![1, 2].includes(duration)) return [];
  const parsed = parseDate(date);
  if (!parsed) return [];
  const day = (parsed.getDay() + 6) % 7;
  const matches = (slot) =>
    slot.repeat || repeat
      ? (slot.day ?? (new Date(slot.date + "T12:00:00").getDay() + 6) % 7) ===
        day
      : slot.date === date;
  const general = slots.filter(
    (slot) =>
      !slot.topicId && (!slot.serviceId || slot.serviceId === serviceId),
  );
  const sources = general.filter(matches);
  const occupied = [
    ...classes
      .filter((row) => row[0] === day)
      .map((row) => ({ start: row[1], end: row[2] })),
    ...bookings
      .filter(
        (booking) =>
          ["pending", "confirmed", "completed"].includes(
            String(booking.status || booking.booking_status).toLowerCase(),
          ) && matches({ ...booking, repeat: false }),
      )
      .map((booking) => ({
        start: decimal(booking.start),
        end: decimal(booking.end),
      })),
    ...slots.filter(
      (slot) =>
        slot.serviceId &&
        !(serviceId && slot.serviceId === serviceId) &&
        matches(slot),
    ),
    ...topics
      .flatMap((topic) => topic.availability)
      .filter((slot) => slot.key !== rowKey && matches(slot)),
  ];
  const covered = (start) => {
    let cursor = start;
    for (const slot of sources.slice().sort((a, b) => a.start - b.start)) {
      if (slot.start > cursor) break;
      if (slot.end > cursor) cursor = slot.end;
      if (cursor >= start + duration) return true;
    }
    return false;
  };
  return Array.from({ length: 27 }, (_, i) => 7 + i * 0.5).filter(
    (start) =>
      start + duration <= 21 &&
      (repeat ||
        new Date(
          `${date}T${String(Math.floor(start)).padStart(2, "0")}:${start % 1 ? "30" : "00"}:00+08:00`,
        ) > now) &&
      (!general.length || covered(start)) &&
      !occupied.some((slot) => overlaps(start, start + duration, slot)),
  );
}

export function groupTopicDates(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.date
      ? `${row.date}:${!!row.repeat}`
      : row.dateKey || row.key;
    if (!groups.has(key))
      groups.set(key, { key, date: row.date, repeat: row.repeat, rows: [] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()];
}
