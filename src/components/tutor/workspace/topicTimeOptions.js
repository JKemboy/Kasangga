import { parseDate } from "./schedule.js";
const overlaps = (start, end, other) => start < other.end && other.start < end;
const decimal = (value) =>
  typeof value === "number"
    ? value
    : Number(String(value).split(":")[0]) +
      Number(String(value).split(":")[1]) / 60;
export function topicTimeOptions({
  date,
  repeat = false,
  rowKey,
  topics = [],
  slots = [],
  classes = [],
  bookings = [],
  serviceId = null,
  now = new Date(),
}) {
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
    ...(day === 0 || day === 2 ? [{ start: 17, end: 19 }] : []),
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
  return Array.from({ length: 27 }, (_, i) => 7 + i * 0.5).filter(
    (start) =>
      (repeat ||
        new Date(
          `${date}T${String(Math.floor(start)).padStart(2, "0")}:${start % 1 ? "30" : "00"}:00+08:00`,
        ) > now) &&
      (!general.length ||
        sources.some((slot) => start >= slot.start && start + 1 <= slot.end)) &&
      !occupied.some((slot) => overlaps(start, start + 1, slot)),
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
