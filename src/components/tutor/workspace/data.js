import { summarizeEarnings } from "./earnings.js";

export const services = [];
export const classes = [];
export const slots = [];
export const notifications = [];
export const profile = {
  name: "",
  email: "",
  studentId: "",
  college: "",
  program: "",
  year: "",
  bio: "",
  expertise: "",
  skills: "",
};
export const seed = {
  services,
  sessions: [],
  slots,
  notifications,
  profile,
  threads: [],
  reports: [],
  uploads: [],
};
export const money = (v) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    v,
  );
export const minutes = (t) =>
  Number(t.split(":")[0]) * 60 + Number(t.split(":")[1]);
export const hour = (t) => minutes(t) / 60;
export const time = (h) =>
  `${Math.floor(h) % 12 || 12}:${String(Math.round((h % 1) * 60)).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
export const overlaps = (a, b, c, d) => a < d && c < b;
export function slotError(slot, existing, sessions, confirmed = classes) {
  if (
    !Number.isFinite(slot?.start) ||
    !Number.isFinite(slot?.end) ||
    slot.start < 7 ||
    slot.end > 21 ||
    slot.end <= slot.start
  )
    return "Choose an end time after the start time, between 7 AM and 9 PM.";
  const date =
    typeof slot.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(slot.date)
      ? new Date(`${slot.date}T12:00:00`)
      : new Date(NaN);
  const parts = String(slot.date).split("-").map(Number);
  if (
    !Number.isFinite(date.getTime()) ||
    parts[0] < 1 ||
    date.getFullYear() !== parts[0] ||
    date.getMonth() + 1 !== parts[1] ||
    date.getDate() !== parts[2]
  )
    return "Choose a valid availability date.";
  if (
    !Number.isInteger(slot.day) ||
    slot.day < 0 ||
    slot.day > 6 ||
    slot.day !== (date.getDay() + 6) % 7
  )
    return "The availability weekday must match the selected date.";
  if (
    slot.type !== undefined &&
    !["Online", "In-person", "Both"].includes(slot.type)
  )
    return "Choose a valid session type.";
  if (slot.repeat !== undefined && typeof slot.repeat !== "boolean")
    return "Choose a valid weekly repeat option.";
  if (
    confirmed.some(
      ([day, start, end]) =>
        day === slot.day && overlaps(slot.start, slot.end, start, end),
    )
  )
    return "This time overlaps your confirmed class schedule.";
  if (
    existing.some(
      (s) =>
        s.id !== slot.id &&
        s.day === slot.day &&
        (s.repeat || slot.repeat || s.date === slot.date) &&
        overlaps(slot.start, slot.end, s.start, s.end),
    )
  )
    return "This time overlaps another availability slot.";
  if (
    sessions.some(
      (s) =>
        s.status === "Confirmed" &&
        (slot.repeat
          ? (new Date(s.date + "T12:00:00").getDay() + 6) % 7 === slot.day
          : s.date === slot.date) &&
        overlaps(slot.start, slot.end, hour(s.start), hour(s.end)),
    )
  )
    return "This time overlaps a confirmed tutoring session.";
  return "";
}
export function allocation(sessions) {
  return summarizeEarnings(sessions);
}
