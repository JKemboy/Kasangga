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
const dayPattern =
  /\b(Monday|Mon|Tuesday|Tues?|Wednesday|Wed|Thursday|Thu(?:rs)?|Friday|Fri|Saturday|Sat|Sunday|Sun|MWF|TTH|TH|M|T|W|F|S)\b/gi;
const dayMap = {
  monday: [0],
  mon: [0],
  m: [0],
  tuesday: [1],
  tue: [1],
  tues: [1],
  t: [1],
  wednesday: [2],
  wed: [2],
  w: [2],
  thursday: [3],
  thu: [3],
  thurs: [3],
  th: [3],
  friday: [4],
  fri: [4],
  f: [4],
  saturday: [5],
  sat: [5],
  s: [5],
  sunday: [6],
  sun: [6],
  mwf: [0, 2, 4],
  tth: [1, 3],
};
const timePattern =
  /(\d{1,2}(?::\d{2})?\s*(?:[AP]\.?M\.?)?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:[AP]\.?M\.?)?)/i;
function readTime(value) {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([AP])?M?$/i.exec(
    value.replaceAll(".", "").replace(/\s+/g, ""),
  );
  if (!m) return "";
  let h = Number(m[1]);
  const minute = Number(m[2] || 0);
  if (minute > 59 || h > 23) return "";
  if (m[3]) {
    if (h < 1 || h > 12) return "";
    h = (h % 12) + (m[3].toUpperCase() === "P" ? 12 : 0);
  }
  return clock(h + minute / 60);
}
export function parseScheduleLines(lines) {
  const rows = [],
    unparsed = [];
  for (const entry of lines) {
    const text = typeof entry === "string" ? entry : entry.text;
    const confidence = typeof entry === "string" ? 100 : entry.confidence;
    if (!text?.trim()) continue;
    const times = timePattern.exec(text);
    const code =
      /^\s*([A-Z]{2,8}\s*[-]?\s*\d{1,4}[A-Z]?|[A-Z]{2,8})(?:\s|\|)/.exec(text);
    if (!times || !code) {
      unparsed.push(text);
      continue;
    }
    const before = text.slice(code[0].length, times.index).trim();
    const after = text.slice(times.index + times[0].length).trim();
    let name = before,
      tail = after;
    let days = [...after.matchAll(dayPattern)];
    if (!days.length) {
      days = [...before.matchAll(dayPattern)];
      if (days.length) {
        name = before.slice(0, days[0].index).trim();
      }
    } else tail = after.slice(days.at(-1).index + days.at(-1)[0].length).trim();
    const indexes = [
      ...new Set(days.flatMap((d) => dayMap[d[0].toLowerCase()] || [])),
    ];
    const room = tail.replace(/^[\s|,;]+/, "").trim();
    const start = readTime(times[1]),
      end = readTime(times[2]);
    const uncertain =
      confidence < 85 ? ["code", "name", "day", "start", "end", "room"] : [];
    if (!/[AP]/i.test(times[1]) && Number(times[1].split(":")[0]) <= 12)
      uncertain.push("start");
    if (!/[AP]/i.test(times[2]) && Number(times[2].split(":")[0]) <= 12)
      uncertain.push("end");
    for (const day of indexes.length ? indexes : [""])
      rows.push({
        id: crypto.randomUUID(),
        code: code[1].trim(),
        name: name.replace(/[|,;]+$/, "").trim(),
        day: String(day),
        start,
        end,
        room,
        uncertain: [...new Set(uncertain)],
        source: text,
      });
  }
  return { rows, unparsed };
}
