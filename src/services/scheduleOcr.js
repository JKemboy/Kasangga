const DAY_NAMES = {
  MONDAY: 0,
  MON: 0,
  TUESDAY: 1,
  TUE: 1,
  WEDNESDAY: 2,
  WED: 2,
  THURSDAY: 3,
  THU: 3,
  FRIDAY: 4,
  FRI: 4,
  SATURDAY: 5,
  SAT: 5,
  SUNDAY: 6,
  SUN: 6,
};
export function parseScheduleDays(value) {
  const parts = String(value || "")
    .toUpperCase()
    .split(/[\s,/&-]+/)
    .filter(Boolean);
  const days = [];
  for (const part of parts) {
    if (DAY_NAMES[part] !== undefined) {
      days.push(DAY_NAMES[part]);
      continue;
    }
    const tokens = part.match(/TH|SU|M|T|W|F|S/g) || [];
    if (tokens.join("") !== part) return [];
    days.push(
      ...tokens.map(
        (token) => ({ M: 0, T: 1, W: 2, TH: 3, F: 4, S: 5, SU: 6 })[token],
      ),
    );
  }
  return [...new Set(days)];
}
function clock24(value) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value);
  if (!match || +match[1] < 1 || +match[1] > 12 || +match[2] > 59) return "";
  return (
    String(
      (+match[1] % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0),
    ).padStart(2, "0") +
    ":" +
    match[2]
  );
}
function parseMeeting(text) {
  const tokens = text.trim().split(/\s+/);
  const days = [];
  while (tokens.length) {
    const parsed = parseScheduleDays(tokens[0]);
    if (!parsed.length) break;
    days.push(...parsed);
    tokens.shift();
  }
  if (!days.length) return [];
  // The final standalone number is the Units column, not a room number.
  if (tokens.length > 2 && /^\d(?:\.\d+)?$/.test(tokens.at(-1))) tokens.pop();
  if (tokens.length > 1) tokens.shift(); // Bldg column
  const room = tokens.join(" ").trim();
  return [...new Set(days)].map((day) => ({ day, room }));
}
const COURSE = /^(TCW|[A-Z]{2,8}\s*\d{1,4}[A-Z]?)\s+/i;
const FOOTER =
  /^(?:Reminder|ENROLMENT|ENROLLMENT|STATEMENT OF ACCOUNT|ID(?:ENTIFICATION)?\s*(?:NO\.?|NUMBER)|GPA\b|ASSESSMENT\b|TOTAL\b|AMOUNT DUE\b|SEMESTER\b)/i;
const TIMES =
  /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
export function parseScheduleRows(text) {
  const blocks = [];
  let current;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (FOOTER.test(line)) {
      current = null;
      continue;
    }
    const course = COURSE.exec(line);
    if (course) {
      current = {
        code: course[1]
          .toUpperCase()
          .replace(/([A-Z])(?=\d)/, "$1 ")
          .replace(/\s+/g, " "),
        lines: [],
      };
      blocks.push(current);
      current.lines.push(
        line.slice(course[0].length).replace(/^\S*\d\S*\s+/, ""),
      );
    } else if (current) current.lines.push(line);
  }
  const rows = [],
    seen = new Set();
  for (const block of blocks) {
    const title = block.lines
      .map((line) => {
        const time = [...line.matchAll(TIMES)][0];
        return time ? line.slice(0, time.index).trim() : line;
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    for (const line of block.lines) {
      const meetings = [...line.matchAll(TIMES)];
      meetings.forEach((meeting, index) => {
        const start = clock24(meeting[1]),
          end = clock24(meeting[2]);
        const tail = line.slice(
          meeting.index + meeting[0].length,
          meetings[index + 1]?.index ?? line.length,
        );
        for (const item of parseMeeting(tail)) {
          const key = JSON.stringify([
            block.code,
            item.day,
            start,
            end,
            item.room.toUpperCase(),
          ]);
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({
            id: crypto.randomUUID(),
            code: block.code,
            name: title,
            day: String(item.day),
            start,
            end,
            room: item.room,
            uncertain: [
              ...(!title ? ["name"] : []),
              ...(!start ? ["start"] : []),
              ...(!end || end <= start ? ["end"] : []),
              ...(!item.room || /\.\.|\u2026/.test(item.room) ? ["room"] : []),
            ],
          });
        }
      });
    }
  }
  return rows;
}
