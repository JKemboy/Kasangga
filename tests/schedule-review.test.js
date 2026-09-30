import test from "node:test";
import assert from "node:assert/strict";
import { seed, slotError } from "../src/components/tutor/workspace/data.js";
import {
  parseScheduleLines,
  rowErrors,
  confirmSchedule,
  confirmedClasses,
  rowsToClasses,
  scheduleImpact,
} from "../src/components/tutor/workspace/scheduleReview.js";
import {
  eventsForDate,
  parseDate,
} from "../src/components/tutor/workspace/schedule.js";
const extracted = () =>
  parseScheduleLines([
    {
      text: "IT 108 Software Architecture Mon 8:00 AM - 10:00 AM CCIS 203",
      confidence: 70,
    },
    {
      text: "ITE 18 Application Development 9:00 AM - 11:00 AM TTh CCIS Lab 1",
      confidence: 98,
    },
  ]);
test("extracts actual text with days before and after times and expands TTh", () => {
  const { rows } = extracted();
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((r) => r.day),
    ["0", "1", "3"],
  );
  assert.equal(rows[0].name, "Software Architecture");
  assert.equal(rows[0].start, "08:00");
  assert.equal(rows[0].room, "CCIS 203");
  assert.ok(rows[0].uncertain.includes("code"));
  assert.equal(rows[1].uncertain.length, 0);
});
test("irrelevant text never produces fabricated classes and ambiguous times are flagged", () => {
  assert.equal(
    parseScheduleLines(["LOGOUT", "Welcome back Juan"]).rows.length,
    0,
  );
  const { rows } = parseScheduleLines([
    "IT 108 Software Architecture Mon 8:00 - 10:00 CCIS 203",
  ]);
  assert.ok(rows[0].uncertain.includes("start"));
});
test("review detects missing fields, invalid times and both sides of overlaps", () => {
  const rows = extracted().rows;
  rows.push({
    ...rows[0],
    id: "overlap",
    code: "IT 110",
    start: "09:00",
    end: "11:00",
  });
  const errors = rowErrors(rows);
  assert.match(errors[0].end, /Overlaps/);
  assert.match(errors[3].end, /Overlaps/);
  assert.ok(
    rowErrors([
      { code: "", name: "", room: "", day: "7", start: "25:00", end: "10:00" },
    ])[0].start,
  );
});
test("confirmation requires checked valid rows, atomically replaces classes and adds related notification", () => {
  const draft = { name: "official.png", rows: extracted().rows };
  const before = structuredClone(seed);
  assert.throws(() => confirmSchedule(seed, draft, false), /Check every row/);
  assert.throws(
    () => confirmSchedule(seed, { ...draft, rows: [] }, true),
    /Fix/,
  );
  const next = confirmSchedule(seed, draft, true, "2026-09-25T00:00:00Z");
  assert.deepEqual(seed, before);
  assert.deepEqual(confirmedClasses(next), rowsToClasses(draft.rows));
  assert.equal(next.scheduleReview, null);
  assert.equal(next.notifications[0].target.view, "availability");
  assert.deepEqual(next.sessions, seed.sessions);
});
test("confirmed changes drive calendar, availability validation and conflict marking", () => {
  const draft = {
    name: "official.png",
    rows: [
      {
        id: "1",
        code: "NEW 1",
        name: "New Class",
        day: "0",
        start: "10:00",
        end: "12:00",
        room: "R1",
      },
    ],
  };
  const next = confirmSchedule(seed, draft, true);
  const slot = {
    day: 0,
    date: "2026-09-28",
    start: 10,
    end: 11,
    repeat: false,
    type: "Online",
  };
  assert.match(
    slotError(slot, [], [], confirmedClasses(next)),
    /class schedule/,
  );
  assert.equal(
    slotError({ ...slot, start: 8, end: 9 }, [], [], confirmedClasses(next)),
    "",
  );
  const events = eventsForDate(parseDate("2026-09-28"), {
    classes: confirmedClasses(next),
    slots: next.slots,
    sessions: next.sessions,
  });
  assert.ok(events.some((e) => e.kind === "class" && e.title === "NEW 1"));
  assert.ok(events.some((e) => e.kind === "available" && e.conflict));
  assert.ok(scheduleImpact(next, confirmedClasses(next)).slots.length);
});
