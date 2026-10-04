import { classes as defaults, hour, overlaps } from "./data.js";
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const confirmedClasses = (data) =>
  data.classSchedule?.classes ?? defaults;
export function classRows(classes) {
  return classes.map(([day, start, end, code, name, room], i) => ({
    id: `class-${i}`,
    day: String(day),
    start: clock(start),
    end: clock(end),
    code,
    name,
    room,
    uncertain: [],
  }));
}
function clock(value) {
  return `${String(Math.floor(value)).padStart(2, "0")}:${String(Math.round((value % 1) * 60)).padStart(2, "0")}`;
}
export function rowErrors(rows) {
  return rows.map((r, i) => {
    const errors = {};
    for (const key of ["code", "name", "room"])
      if (!String(r[key] || "").trim()) errors[key] = "Required";
    if (!/^[0-6]$/.test(String(r.day))) errors.day = "Choose a day";
    for (const key of ["start", "end"])
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r[key] || ""))
        errors[key] = "Enter a valid time";
    if (!errors.start && !errors.end) {
      if (hour(r.end) <= hour(r.start)) errors.end = "End must follow start";
      else {
        const other = rows.find(
          (v, j) =>
            j !== i &&
            v.day === r.day &&
            v.start &&
            v.end &&
            overlaps(hour(r.start), hour(r.end), hour(v.start), hour(v.end)),
        );
        if (other) errors.end = `Overlaps ${other.code || "another class"}`;
      }
    }
    return errors;
  });
}
export function rowsToClasses(rows) {
  return rows.map((r) => [
    Number(r.day),
    hour(r.start),
    hour(r.end),
    r.code.trim(),
    r.name.trim(),
    r.room.trim(),
  ]);
}
export function scheduleImpact(data, classes) {
  const conflict = (day, start, end) =>
    classes.some((c) => c[0] === day && overlaps(start, end, c[1], c[2]));
  return {
    slots: data.slots.filter(
      (s) => s.kind !== "unavailable" && conflict(s.day, s.start, s.end),
    ),
    sessions: data.sessions.filter(
      (s) =>
        ["Confirmed", "Pending"].includes(s.status) &&
        conflict(
          (new Date(s.date + "T12:00:00").getDay() + 6) % 7,
          hour(s.start),
          hour(s.end),
        ),
    ),
  };
}
export function confirmSchedule(
  data,
  draft,
  acknowledged,
  now = new Date().toISOString(),
) {
  if (!acknowledged)
    throw new Error(
      "Check every row against your official schedule before confirming.",
    );
  if (
    !draft.rows.length ||
    rowErrors(draft.rows).some((e) => Object.keys(e).length)
  )
    throw new Error("Fix the highlighted rows before confirming.");
  const classes = rowsToClasses(draft.rows),
    impact = scheduleImpact(data, classes);
  return {
    ...data,
    classSchedule: { classes, confirmedAt: now, source: draft.name },
    scheduleReview: null,
    notifications: [
      {
        id: crypto.randomUUID(),
        title: "Class Schedule Confirmed",
        text: `${classes.length} classes confirmed.`,
        detail: `${impact.slots.length} availability blocks need review.`,
        time: now,
        category: "Schedule",
        read: false,
        target: {
          view: "availability",
          args: { tab: "Class Schedule" },
          label: "View class schedule",
        },
      },
      ...data.notifications,
    ],
  };
}
