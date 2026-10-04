import test from "node:test";
import assert from "node:assert/strict";
import { seed, slotError } from "./fixtures/tutorData.js";
import {
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
const entered = () => ({rows: [
{id:'1',code:'IT 108',name:'Software Architecture',day:'0',start:'08:00',end:'10:00',room:'CCIS 203'},
...[1,3].map(day=>({id:String(day+1),code:'ITE 18',name:'Application Development',day:String(day),start:'09:00',end:'11:00',room:'CCIS Lab 1'}))
]});
test("review detects missing fields, invalid times and both sides of overlaps", () => {
  const rows = entered().rows;
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
  const draft = { name: "official.png", rows: entered().rows };
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
