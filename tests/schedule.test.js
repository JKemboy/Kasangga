import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  eventsForDate,
  formatTimeInput,
  isoDate,
  monthDates,
  packEvents,
  parseDate,
  shiftMonth,
  weekStart,
} from "../src/components/tutor/workspace/schedule.js";
import {
  classes,
  seed,
  slotError,
} from "../src/components/tutor/workspace/data.js";

test("calendar dates parse strictly without rolling malformed dates into another month", () => {
  for (const value of ["2024-02-29", "2026-09-14", "0099-01-01"]) {
    assert.equal(isoDate(parseDate(value)), value);
    assert.equal(parseDate(value).getHours(), 12);
  }
  for (const value of [
    "2026-02-29",
    "2026-02-30",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-09-00",
    "2026-9-1",
    "2026-09-14T12:00:00",
    "2026-09-14 ",
    "0000-01-01",
    "invalid",
    null,
    undefined,
  ]) {
    assert.equal(parseDate(value), null, `Invalid date: ${value}`);
  }
  assert.equal(isoDate(new Date(NaN)), "");
});

test("day and week navigation crosses year boundaries without mutating its anchor", () => {
  const anchor = parseDate("2027-01-03");
  assert.equal(isoDate(weekStart(anchor)), "2026-12-28");
  assert.equal(isoDate(addDays(anchor, -3)), "2026-12-31");
  assert.equal(isoDate(addDays(anchor, 7)), "2027-01-10");
  assert.equal(isoDate(anchor), "2027-01-03");
  assert.equal(isoDate(weekStart(parseDate("2026-09-14"))), "2026-09-14");
});

test("month navigation shifts calendar months and clamps end-of-month days", () => {
  for (const [from, offset, expected] of [
    ["2026-01-31", 1, "2026-02-28"],
    ["2024-01-31", 1, "2024-02-29"],
    ["2024-03-31", -1, "2024-02-29"],
    ["2026-12-31", 1, "2027-01-31"],
    ["2026-01-31", -1, "2025-12-31"],
    ["2024-02-29", 12, "2025-02-28"],
  ]) {
    const anchor = parseDate(from);
    assert.equal(isoDate(shiftMonth(anchor, offset)), expected);
    assert.equal(isoDate(anchor), from);
  }
});

test("month grids include every day with Monday and Sunday boundaries in 28, 35, or 42 cells", () => {
  for (const [date, length, first, last] of [
    ["2021-02-12", 28, "2021-02-01", "2021-02-28"],
    ["2024-02-12", 35, "2024-01-29", "2024-03-03"],
    ["2026-08-12", 42, "2026-07-27", "2026-09-06"],
    ["2026-12-12", 35, "2026-11-30", "2027-01-03"],
  ]) {
    const anchor = parseDate(date);
    const dates = monthDates(anchor);
    assert.equal(dates.length, length);
    assert.equal(isoDate(dates[0]), first);
    assert.equal(isoDate(dates.at(-1)), last);
    assert.equal(dates[0].getDay(), 1);
    assert.equal(dates.at(-1).getDay(), 0);
    assert.equal(new Set(dates.map(isoDate)).size, length);
    for (let index = 1; index < dates.length; index++) {
      assert.equal(
        isoDate(dates[index]),
        isoDate(addDays(dates[index - 1], 1)),
      );
    }
    assert.equal(isoDate(anchor), date);
  }
  assert.ok(
    monthDates(parseDate("2024-02-12")).some(
      (date) => isoDate(date) === "2024-02-29",
    ),
  );
});

test("time input formatting preserves quarter hours and rounds to a valid minute", () => {
  for (const [hour, expected] of [
    [0, "00:00"],
    [7, "07:00"],
    [9.25, "09:15"],
    [13.5, "13:30"],
    [18.75, "18:45"],
    [10 + 1 / 60, "10:01"],
    [23 + 59 / 60, "23:59"],
  ]) {
    assert.equal(formatTimeInput(hour), expected);
  }
  for (const hour of [NaN, Infinity, -1, 24, "09:15", null]) {
    assert.equal(formatTimeInput(hour), "");
  }
});

test("weekly availability repeats by weekday while one-time slots and sessions use the exact date", () => {
  const recurring = {
    id: "weekly",
    day: 0,
    date: "2026-09-14",
    repeat: true,
    start: 12,
    end: 13,
    type: "Online",
  };
  const once = { ...recurring, id: "once", repeat: false, start: 19, end: 20 };
  const session = {
    id: "booked",
    date: "2026-09-14",
    status: "Confirmed",
    start: "13:15",
    end: "13:45",
    service: "Calculus 1",
    learner: "Maria",
    provider: "Zoom",
  };
  const data = {
    classes,
    slots: [recurring, once],
    sessions: [session, { ...session, id: "pending", status: "Pending" }],
  };
  const selected = eventsForDate(parseDate("2026-09-14"), data);
  assert.equal(selected.find(event => event.sessionId === "pending").pending, true);
  assert.equal(
    selected.filter((event) => event.kind === "available").length,
    2,
  );
  assert.equal(selected.filter((event) => event.kind === "session").length, 2);
  assert.deepEqual(
    selected
      .filter((event) => event.kind === "session")
      .map(({ start, end }) => [start, end]),
    [[13.25, 13.75], [13.25, 13.75]],
  );
  assert.equal(
    selected.find((event) => event.slot?.id === "weekly").slot,
    recurring,
  );
  for (const date of ["2026-09-07", "2026-09-21"]) {
    const events = eventsForDate(parseDate(date), data);
    assert.deepEqual(
      events
        .filter((event) => event.kind === "available")
        .map((event) => event.slot.id),
      ["weekly"],
    );
    assert.equal(
      events.some((event) => event.kind === "session"),
      false,
    );
  }
  assert.equal(
    eventsForDate(parseDate("2026-09-15"), data).some(
      (event) => event.kind === "available",
    ),
    false,
  );
  assert.deepEqual(
    eventsForDate(parseDate("2026-09-14"), data).map((event) => event.id),
    selected.map((event) => event.id),
  );
});

test("class view retains Monday and Wednesday protected time but hides tutoring entries", () => {
  const data = { ...seed, classes };
  for (const date of ["2026-09-14", "2026-09-16"]) {
    const events = eventsForDate(parseDate(date), data, false);
    assert.ok(events.some((event) => event.kind === "class" && event.room));
    assert.ok(
      events.every((event) => ["class", "protected"].includes(event.kind)),
    );
    assert.deepEqual(
      events
        .filter((event) => event.kind === "protected")
        .map(({ start, end }) => [start, end]),
      [[17, 19]],
    );
  }
  assert.equal(
    eventsForDate(parseDate("2026-09-15"), data, false).some(
      (event) => event.kind === "protected",
    ),
    false,
  );
  assert.equal(
    eventsForDate(parseDate("2026-09-18"), data, false).some(
      (event) => event.kind === "session",
    ),
    false,
  );
});

test("overlapping chains get visible lanes and adjacent entries share a lane", () => {
  const events = [
    { id: "c", start: 10.5, end: 12 },
    { id: "a", start: 8, end: 10 },
    { id: "d", start: 12, end: 13 },
    { id: "b", start: 9, end: 11 },
  ];
  const original = structuredClone(events);
  assert.deepEqual(
    packEvents(events).map(({ id, lane, laneCount }) => [id, lane, laneCount]),
    [
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 2],
      ["d", 0, 1],
    ],
  );
  assert.deepEqual(events, original);
  const nested = packEvents([
    { id: "long", start: 8, end: 12 },
    { id: "early", start: 8, end: 9 },
    { id: "late", start: 9, end: 10 },
  ]);
  assert.equal(
    nested.find((event) => event.id === "early").lane,
    nested.find((event) => event.id === "late").lane,
  );
  assert.ok(nested.every((event) => event.laneCount === 2));
});

test("Friday's 2 PM tutoring session stays visible alongside the overlapping 3 PM class", () => {
  const events = packEvents(
    eventsForDate(parseDate("2026-09-18"), { ...seed, classes }),
  );
  const session = events.find(
    (event) => event.kind === "session" && event.start === 14,
  );
  const lecture = events.find(
    (event) => event.kind === "class" && event.start === 15,
  );
  assert.equal(session.end, 15.5);
  assert.equal(session.laneCount, 2);
  assert.equal(lecture.laneCount, 2);
  assert.notEqual(session.lane, lecture.lane);
});

test("availability rejects invalid dates, mismatched weekdays, and malformed form options", () => {
  const slot = {
    id: "test",
    date: "2026-09-14",
    day: 0,
    start: 12.25,
    end: 13.75,
    type: "Both",
    repeat: false,
  };
  assert.equal(slotError(slot, [], []), "");
  for (const date of [
    "2026-02-30",
    "2026-02-29",
    "2026-13-01",
    "2026-9-14",
    "",
    null,
  ]) {
    assert.match(
      slotError({ ...slot, date }, [], []),
      /valid availability date/,
    );
  }
  for (const day of [-1, 7, 0.5, 1, "0", undefined]) {
    assert.match(slotError({ ...slot, day }, [], []), /weekday/);
  }
  for (const type of ["", "Remote", null]) {
    assert.match(slotError({ ...slot, type }, [], []), /session type/);
  }
  assert.match(
    slotError({ ...slot, repeat: "false" }, [], []),
    /repeat option/,
  );
  assert.match(slotError({ ...slot, start: "12:15" }, [], []), /end time/);
  assert.match(slotError(null, [], []), /end time/);
});

test("validation permits adjacent slots and ignores self while blocking future-week recurring conflicts", () => {
  const slot = {
    id: "test",
    date: "2026-09-14",
    day: 0,
    start: 12,
    end: 13,
    type: "Online",
    repeat: false,
  };
  assert.equal(
    slotError(slot, [{ ...slot, id: "before", start: 10, end: 12 }, slot], []),
    "",
  );
  assert.match(
    slotError(
      { ...slot, start: 11.75 },
      [{ ...slot, id: "before", start: 10, end: 12 }],
      [],
    ),
    /another availability/,
  );
  const saturday = { ...slot, date: "2026-09-26", day: 5, start: 16, end: 17 };
  assert.equal(slotError(saturday, [], seed.sessions), "");
  assert.match(
    slotError({ ...saturday, repeat: true }, [], seed.sessions),
    /confirmed tutoring/,
  );
});
